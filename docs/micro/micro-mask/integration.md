# micro-mask 功能集成文档

micro-mask 是响应拦截式数据脱敏微服务。主应用引入后，通过 Spring Boot 自动配置机制自动生效：对命中的 HTTP 响应，按配置的脱敏规则（正则 / JS 脚本 / 兜底规则）自动对指定 JSONPath 的数据进行脱敏，无需侵入业务代码。

## 1. Maven 依赖引入

在主应用的 `pom.xml` 中添加以下依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-mask</artifactId>
</dependency>
```

模块引入后，`MaskAutoConfig` 会通过 Spring Boot 自动配置机制自动生效，无需手动配置。其自动配置内容为：

- `@MapperScan({"com.wkclz.micro.mask.mapper"})`：扫描并注册 Mapper
- `@ComponentScan(basePackages = {"com.wkclz.micro.mask"})`：扫描并注册 REST、Service、Cache、拦截器等组件

自动配置类通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 声明（内容为 `com.wkclz.micro.mask.MaskAutoConfig`）。

模块内部依赖：

| 依赖 | 用途 |
|------|------|
| `com.wkclz.framework:sh-redis` | 规则变更的缓存变更通知（Redis key `sh:micro:mask:cache:time`），驱动本地缓存刷新 |
| `org.springframework.boot:spring-boot-starter-jackson` | 响应序列化 / 反序列化 |

---

## 2. 数据库表结构

### 2.1 mdm_mask_rule — 脱敏规则表

```sql
CREATE TABLE `mdm_mask_rule` (
  `id`                bigint        NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_code`       varchar(63)   DEFAULT NULL COMMENT '租户编码',
  `mask_rule_code`    varchar(127)  DEFAULT NULL COMMENT '脱敏规则编码(为空时自动生成)',
  `mask_rule_name`    varchar(127)  NOT NULL COMMENT '脱敏规则名称',
  `request_method`    varchar(31)   NOT NULL COMMENT '请求方法(GET/POST/PUT/DELETE)',
  `request_uri`       varchar(255)  NOT NULL COMMENT '请求路径,支持AntPathMatcher',
  `mask_json_path`    varchar(255)  NOT NULL COMMENT '脱敏数据路径(JSONPath)',
  `mask_rule_regular` varchar(511)  DEFAULT NULL COMMENT '脱敏正则',
  `mask_rule_script`  varchar(1023) DEFAULT NULL COMMENT '脱敏函数(JS脚本)',
  `enable_flag`       int           DEFAULT 1  COMMENT '可用状态(1=启用,0=停用)',
  `mock_value`        varchar(511)  DEFAULT NULL COMMENT '示例值',
  `sort`              int           DEFAULT 0  COMMENT '排序',
  `create_time`       datetime      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`         varchar(31)   DEFAULT NULL COMMENT '创建人',
  `update_time`       datetime      DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`         varchar(31)   DEFAULT NULL COMMENT '更新人',
  `remark`            varchar(255)  DEFAULT NULL COMMENT '备注',
  `version`           int           DEFAULT 0  COMMENT '乐观锁',
  `deleted`           varchar(24)   DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mask_rule_code` (`mask_rule_code`, `tenant_code`, `deleted`),
  KEY `idx_enable_flag` (`enable_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脱敏规则';
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `mask_rule_code` | varchar(127) | 脱敏规则编码，创建时为空则由 `RedisIdGenerator` 自动生成（前缀 `mask_rule_`），服务层按此编码做唯一校验 |
| `mask_rule_name` | varchar(127) | 脱敏规则名称，创建 / 修改必填 |
| `request_method` | varchar(31) | 请求方法，创建 / 修改必填，命中时与请求方法精确匹配 |
| `request_uri` | varchar(255) | 请求路径，创建 / 修改必填，命中时通过 `AntPathMatcher` 匹配实际请求 URI |
| `mask_json_path` | varchar(255) | 脱敏数据路径，创建 / 修改必填，格式为 JSONPath（如 `$.mobile`、`$.rows[*].mobile`），响应为根数组时需以 `$[*]` 开头 |
| `mask_rule_regular` | varchar(511) | 脱敏正则，命中后对数据执行正则匹配替换为 `*` |
| `mask_rule_script` | varchar(1023) | 脱敏函数（JS 脚本），通过 JS 引擎对数据执行脱敏 |
| `enable_flag` | int | 可用状态，默认 1；仅 `enable_flag = 1` 的规则会加载进缓存参与脱敏 |
| `mock_value` | varchar(511) | 示例值，用于规则测试场景 |
| 公共字段 | — | `id` / `tenant_code` / `sort` / `create_time` / `create_by` / `update_time` / `update_by` / `remark` / `version` / `deleted`，其中 `version` 为乐观锁，`deleted` 为逻辑删除标识 |

**推荐索引**：

- `uk_mask_rule_code`（`mask_rule_code`, `tenant_code`, `deleted`）：保证规则编码唯一，配合服务层 `duplicateCheck` 唯一校验
- `idx_enable_flag`（`enable_flag`）：缓存加载（`rules4Cache`）按 `deleted = 0 AND enable_flag = 1` 过滤，利于全量规则加载

> 说明：脱敏命中匹配（Method + AntPathMatcher URI）在应用内存缓存中完成，不走数据库查询，因此无需为 `request_method` / `request_uri` 建立匹配索引。

---

## 3. REST API 接口清单

所有接口前缀：`/micro-mask`

### 3.1 脱敏规则管理

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|--------|
| 1 | GET | `/rule/page` | 规则分页查询 | `maskRuleCode` / `maskRuleName` / `requestUri` 模糊，`requestMethod` / `enableFlag` 精确，`current` / `size` 分页 | `R<PageData<MaskRulePageResp>>` |
| 2 | GET | `/rule/info` | 规则详情 | `id` (必填) | `R<MaskRuleResp>` |
| 3 | POST | `/rule/create` | 创建规则 | `MaskRuleCreateReq` JSON Body | `R<MaskRuleResp>` |
| 4 | POST | `/rule/update` | 修改规则 | `MaskRuleUpdateReq` JSON Body | `R<MaskRuleResp>` |
| 5 | POST | `/rule/remove` | 删除规则 | `RemoveReq` JSON Body (含 id) | `R<Integer>` |

- **GET `/rule/page`**：`MaskRulePageReq` 查询条件为 `maskRuleCode` / `maskRuleName`（`LIKE '%xxx%'`）、`requestUri`（`LIKE '%xxx%'`）、`requestMethod` / `enableFlag`（精确匹配），分页参数为 `current` / `size`，结果按 `sort ASC, id ASC` 排序。
- **GET `/rule/info`**：`MaskRuleInfoReq extends IdReq`，入参为 `id`；记录不存在时返回 `R.error("id is error")`。
- **POST `/rule/create`**：`MaskRuleCreateReq` 中 `maskRuleName` / `requestMethod` / `requestUri` / `maskJsonPath` 为必填（`@NotBlank`），`enableFlag` 缺省时默认置为 1；创建成功后执行 `maskCache.clearCache()` 与 `MaskResponseAdvice.clearCache()` 刷新脱敏缓存。
- **POST `/rule/update`**：`MaskRuleUpdateReq extends UpdateReq`（继承 `id`），必填字段同创建；记录不存在时返回 `RECORD_NOT_EXIST`；更新成功后同样清空脱敏缓存。
- **POST `/rule/remove`**：`RemoveReq`（含 `id`），逻辑删除成功后清空脱敏缓存，返回 `R.ok(1)`。

### 3.2 脱敏测试

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|--------|
| 6 | POST | `/rule/test` | 测试脱敏规则效果 | `MaskRuleTestReq` JSON Body | `R<MaskRuleTestResp>` |
| 7 | GET | `/rule/verify` | 在线验证示例（返回嵌套示例 JSON） | 无 | `R<JSONObject>` |

- **POST `/rule/test`**：`MaskRuleTestReq` 中 `mockValue` 为必填（`@NotBlank`），`maskRuleRegular` / `maskRuleScript` 可选。返回 `MaskRuleTestResp`：
  - `mockValue`：入参示例值
  - `maskValue`：脱敏后的值
  - `maskType`：脱敏方式说明（三者互斥，优先级：正则 > JS 脚本 > 兜底规则）
    - 配置了 `maskRuleRegular`：`使用正则表达式进行匹配脱敏！`
    - 未配置正则但配置了 `maskRuleScript`：`使用JS脚本进行脱敏！`
    - 均未配置：`使用兜底规则进行脱敏！`
- **GET `/rule/verify`**：返回内置的嵌套示例 JSON（含普通字符串、对象、数组嵌套的手机号等数据），供在浏览器或在线接口工具中验证规则对 JSON 数据的脱敏效果。

---

## 4. 验证集成的方法

### 4.1 检查模块加载

启动应用后，观察日志中脱敏缓存初始化的提示（本地缓存为空时会触发初始化；规则更新时会打印 `micro-mask: 脱敏规则更新成功 N 项`）。

### 4.2 在线验证示例（/rule/verify）

```bash
# 返回内置嵌套示例 JSON
curl http://localhost:8080/micro-mask/rule/verify
```

返回示例（节选）：

```json
{
  "rows": [
    {
      "mobile2": "13812342222",
      "mobile3": ["13812343333", "13812343333"],
      "children": [
        { "age": 18, "mobile4": "13812344444" }
      ]
    }
  ],
  "mobile0": 13812340000,
  "mobile1": "13812341111"
}
```

### 4.3 测试脱敏规则效果（/rule/test）

```bash
# 兜底规则脱敏（未配置正则/脚本）
curl -X POST http://localhost:8080/micro-mask/rule/test \
  -H 'Content-Type: application/json' \
  -d '{
    "mockValue": "13812342222"
  }'

# 正则脱敏
curl -X POST http://localhost:8080/micro-mask/rule/test \
  -H 'Content-Type: application/json' \
  -d '{
    "mockValue": "13812342222",
    "maskRuleRegular": "1\\d{10}"
  }'
```

### 4.4 分页查询

```bash
# 全量分页
curl "http://localhost:8080/micro-mask/rule/page?current=1&size=10"

# 按规则名称模糊 + 启用状态过滤
curl "http://localhost:8080/micro-mask/rule/page?current=1&size=10&maskRuleName=手机&enableFlag=1"
```

### 4.5 常见问题排查

1. **表不存在**：启动或调用接口报 `Table 'mdm_mask_rule' doesn't exist`，说明数据库表未创建，请执行第 2 节的 DDL 建表。
2. **接口不脱敏 / 无数据**：确认 `mdm_mask_rule` 表中已配置规则，且 `deleted = 0`；脱敏仅针对 JSON 对象 / 数组响应，基础类型（String 除外的基础包装类型、数字、布尔等）响应不会脱敏。
3. **规则未命中**：脱敏命中要求 **Method** 精确匹配（如 `GET`，注意大小写）且 **URI** 通过 AntPathMatcher 匹配（如配置 `/api/user/**`，实际请求路径需落在该模式内），请核对规则 `request_method` 与 `request_uri` 是否与实际请求一致。
4. **enableFlag 未启用**：缓存仅加载 `enable_flag = 1` 的规则，若规则 `enableFlag` 为 0 或未设置，则不会参与脱敏，请置为 1。
5. **缓存未刷新**：增 / 删 / 改接口会自动清缓存（写 Redis key `sh:micro:mask:cache:time`），本地缓存默认每 12 秒轮询刷新一次（`@Scheduled(fixedDelay = 12_000)`）。若直接改库或等不及刷新，可通过任一增删改接口触发清缓存，或等待最多约 12 秒自动刷新。
