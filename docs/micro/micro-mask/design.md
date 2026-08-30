# 设计思路

micro-mask 是一个基于响应拦截的**数据脱敏微服务**。它不侵入业务代码，在 Controller 方法返回之后、响应体写出之前，根据配置的脱敏规则对响应 JSON 中的敏感字段（手机号、身份证号、银行卡号等）进行自动脱敏。规则可在管理端动态配置，并支持本地缓存 + Redis 通知热更新。

## 设计要点

### 脱敏拦截时机

脱敏通过 `MaskResponseAdvice` 实现，它实现了 Spring MVC 的 `ResponseBodyAdvice<Object>` 并标注 `@ControllerAdvice`：

```
    ┌─────────────┐    ┌──────────────────────┐    ┌─────────────┐
    │ Controller  │───▶│ beforeBodyWrite      │───▶│ HttpMessage │
    │   方法返回   │    │  (脱敏拦截改写响应体)   │    │  Converter  │
    └─────────────┘    └──────────────────────┘    └─────────────┘
                                │
                                ├─ ignoreMask(body) == true ── 直接放行
                                ├─ 未命中任何规则 ───────────── 直接放行
                                └─ 命中规则 ── 序列化 → JSONPath 递归脱敏
```

- `supports()` 恒返回 `true`，即对所有接口返回值生效
- 实际改写发生在 `beforeBodyWrite()` 阶段，此时业务方法已执行完毕，返回值即将交给消息转换器写出
- 通过 `ignoreMask()` 提前放行无需脱敏的类型：`null`、基本类型、包装类型（Boolean / Character / Byte / Short / Integer / Long / Float / Double / BigDecimal）、`Date`、`Void`

### 规则匹配

拦截器以 `userCode:method:uri` 为 key 获取当前请求适用的规则集合：

1. **userCode**：取自 `IdentityContext.getUserCode()`，为空时记为 `anonymous`
2. **method**：请求方法名（GET / POST / PUT / DELETE 等）
3. **uri**：`request.getURI().getPath()`，即请求路径（不含 query）

规则匹配流程：

```
    ┌──────────────────────────────┐
    │ key = userCode:method:uri    │
    └──────────────┬───────────────┘
                   ▼
         Guava 缓存是否命中 key？
        ┌────────────┴────────────┐
        │ 未命中                  │ 命中
        ▼                         ▼
   遍历 maskCache.getMasks()  直接使用缓存规则
   全量启用规则逐条匹配
    ├─ requestMethod 相等
    └─ RequestHelper.match(rule.requestUri, uri)
       (AntPathMatcher 风格，支持 /xx/** 通配)
       命中则加入 curRules
                   │
                   ▼
        curRules 为空 → 直接返回原始 body
```

- 规则匹配条件：**请求方法完全相等** 且 **`RequestHelper.match(规则 requestUri, 实际 uri)` 匹配**（AntPathMatcher 风格，支持 `*`、`**` 等通配符）
- 匹配结果按 key 缓存到第一级 Guava 缓存，后续同 key 请求不再逐条遍历
- 未命中任何规则的请求直接返回原始 body，交由默认的 ObjectMapper 序列化

### 两级缓存与刷新

脱敏规则采用「一级 Guava 本地缓存 + 二级 MaskCache 静态缓存 + Redis 时间戳通知」的两级缓存体系：

```
   ┌──────────────┐   写入变更时间戳    ┌──────────────────┐
   │  管理后台      │──────────────────▶│      Redis       │
   │ 规则 CRUD      │   sh:micro:mask:  │ cache:time 时间戳 │
   │ (create/...)  │   cache:time      │ (expire 1min)    │
   └──────────────┘                    └────────┬─────────┘
                                                │ 12秒轮询比对时间戳
                                                ▼
                                      ┌──────────────────┐
                                      │  MaskCache       │ 二级缓存
                                      │  静态 Map<code,  │
                                      │  MdmMaskRule>    │
                                      └────────┬─────────┘
                                               │ CLEAR_FLAG 置位
                                               ▼
                                      ┌──────────────────┐
                                      │ MaskResponseAdvice│ 一级缓存
                                      │  Guava Cache     │
                                      │  key=userCode:   │
                                      │  method:uri      │
                                      └──────────────────┘
```

**第一级缓存（Guava Cache）** — 位于 `MaskResponseAdvice`：
- key = `userCode:method:uri`
- `expireAfterAccess(12, TimeUnit.HOURS)`：12 小时无访问自动过期
- `maximumSize(1024)`：最大容量 1024 条
- 另有 `initialCapacity(100)`、`recordStats()` 等配置

**第二级缓存（MaskCache）** — 位于 `MaskCache`：
- 静态 `Map<maskRuleCode, MdmMaskRule>` 存全量启用规则
- 静态 `CACHE_TIME` 记录本地缓存加载时间戳
- Redis key `sh:micro:mask:cache:time` 存最近一次变更时间戳，`expire 1min`
- `getMasks()` 返回全量启用规则（`CACHE_ITEM` 为空时先 `init()`）

**刷新机制**：

- **主动刷新**：规则管理接口（创建 / 修改 / 删除）调用 `maskCache.clearCache()` —— 写入 Redis 变更时间戳（expire 1min）、清空本地 `CACHE_TIME` 并立即 `init()` 重载；同时调用 `MaskResponseAdvice.clearCache()` 清空第一级 Guava 缓存
- **定时增量刷新**：`@Scheduled(fixedDelay = 12s, initialDelay = 32s)` 的 `autoReflash()` 比对 Redis 时间戳与本地 `CACHE_TIME`：本地时间戳比 Redis 大 1s 以上（本地更新）或 Redis 时间戳超过 1 分钟（已过期）则跳过，否则 `init()` 增量刷新
- **定时清空 Guava**：`@Scheduled(fixedDelay = 12s, initialDelay = 33s)` 的 `clearCache()` 检查 `MaskCache.getClearFlag()`，若被置位则 `invalidateAll()` 清空第一级 Guava 缓存
- **`init()` 防抖**：`synchronized` 方法，若距上次加载不足 5 秒直接返回；加载成功后将 `CLEAR_FLAG` 置为 `true`，并通过 `log.info` 记录更新数量

### JSONPath 定位与递归

命中规则后，拦截器使用注入的 Jackson `ObjectMapper` 将响应体序列化为字符串，再根据前缀分流处理：

```
   ObjectMapper.writeValueAsString(body)
                 │
                 ▼
   valueStr.startsWith("{") ──▶ JSONObject.parseObject ──▶ maskFields(JSONObject)
   valueStr.startsWith("[") ──▶ JSONArray.parseArray  ──▶ maskFields(JSONArray)
   其他（非对象/数组） ──────────────────────────────────────▶ 直接返回原始 body
```

- **JSONObject 分支**：`maskFields` 逐规则调用 `maskByRecursion(jsonObject, rule.maskJsonPath, rule)`；`maskJsonPath` 不以 `$` 开头时自动补 `$` 前缀
  - 路径含 `[*]`：先按 `[*]` 之前的部分 `JSONPath.eval` 取出数组，再对数组递归；若 `[*]` 之后无剩余路径则保留 `[*]` 便于递归处理；解析结果不是数组时 `log.warn` 跳过
  - 路径不含 `[*]`：`JSONPath.eval` 取出值后替换；解析结果仍是 `JSONObject`（嵌套对象）时 `log.warn` 跳过，其余任意类型按字符串脱敏后 `JSONPath.set` 写回
- **JSONArray 分支**：`maskFields` 逐规则处理，路径必须以 `$[*]` 开头，否则跳过（数组 + 非 `$[*]` 开头路径必定匹配不到）
  - `maskByRecursion(JSONArray)` 逐元素递归：
    - 元素为 `null`：跳过
    - 元素为对象：以同一 `jsonPath` 递归
    - 元素为数组：去掉路径开头的 `$[*]`（`substring(4)`）后递归
    - 元素为标量：按字符串脱敏，将路径中的 `[*]` 替换为 `[下标]` 后用 `JSONPath.set` 写回

```
    maskByRecursion(JSONObject)
        ├─ 含 [*]：eval 取数组 ─▶ maskByRecursion(JSONArray)
        └─ 不含 [*]：eval 取值 ─▶ 标量脱敏 ─▶ JSONPath.set 写回
                                  └─ 仍是对象 ─▶ log.warn 跳过

    maskByRecursion(JSONArray)   [路径必须以 $[*] 开头]
        ├─ 元素为 null    ─▶ 跳过
        ├─ 元素为对象     ─▶ 以同路径递归
        ├─ 元素为数组     ─▶ 去掉 $[*] 前缀后递归
        └─ 元素为标量     ─▶ 脱敏后 [*]→[下标] JSONPath.set 写回
```

### 三种脱敏策略优先级

命中字段值后，通过 `maskByString(str, rule)` 按如下优先级选择脱敏策略：

```
   maskByString(str, rule)
           │
           ▼
   maskRuleRegular 非空？ ──是──▶ maskByRegular
        │否
        ▼
   maskRuleScript 非空？ ──是──▶ maskByScript (JsUtil.exec 执行 JS)
        │否
        ▼
   maskByDefault（兜底）
```

1. **maskByRegular（正则脱敏，优先级最高）**：`maskRuleRegular` 非空时执行。用 `RegularTool.find` 找出所有命中正则的子串，对每个子串用 `RegularTool.replaceAll` 替换为**等长的 `*`**（保留原格式，如手机号 `138****2222`）
2. **maskByScript（脚本脱敏）**：`maskRuleRegular` 为空且 `maskRuleScript` 非空时执行。用 `JsUtil.exec(script, str)` 执行 JS 脚本对值脱敏，可用于正则无法表达或需要自定格式的场景
3. **maskByDefault（兜底脱敏）**：两者均为空时执行，按长度规则：
   - 长度 < 4：返回 `***`
   - 长度 < 8：返回 `首字符 + ****`（如 `张****`）
   - 长度 ≥ 8：返回 `前3位 + ****`（如 `138****`）

整个脱敏过程被 `try/catch` 包裹，任何异常都会 `log.error` 记录，并**返回原始 body**（降级为不脱敏），保证脱敏异常不影响正常响应。

## 核心组件速查

| 组件 | 说明 |
|------|------|
| MaskResponseAdvice | 响应体脱敏拦截器（ResponseBodyAdvice），负责规则匹配、JSONPath 递归脱敏与三种脱敏策略 |
| MaskCache | 脱敏规则二级缓存与刷新（静态 Map + Redis 时间戳通知 + 定时增量刷新） |
| MaskAutoConfig | 自动配置类（MapperScan + ComponentScan） |
| MdmMaskRuleService | 脱敏规则服务（分页 / 新增 / 修改，maskRuleCode 唯一性校验） |
| MdmMaskRuleMapper | 脱敏规则 Mapper（分页查询 + rules4Cache 缓存查询） |
| MdmMaskRule | 脱敏规则实体（规则编码、请求方法、请求路径、脱敏路径、正则、脚本、启用状态等） |
| MaskRuleRest | 脱敏规则管理接口（分页 / 详情 / 创建 / 修改 / 删除，变更后触发缓存刷新） |
| MaskMockRest | 脱敏测试接口（单值脱敏测试 + 模拟 JSON 脱敏效果验证） |
| Route | 路由常量（prefix = `/micro-mask`，含 rule/page、rule/create、rule/test 等） |
