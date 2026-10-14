# 功能使用

## 概述

`micro-mask` 是一个**响应拦截式数据脱敏微服务**，采用**配置驱动**方式，无需在业务代码中引入 `@Mask` 注解。通过在响应返回前统一拦截（`ResponseBodyAdvice`），根据 `用户:请求方法:请求路径` 匹配已配置的脱敏规则，再按 `maskJsonPath`（JSONPath）定位响应 JSON 中的敏感字段进行脱敏替换。

接入方只需在管理端配置脱敏规则（请求方法、请求路径、脱敏字段路径、脱敏策略），即可对对应接口的响应数据自动脱敏，对业务代码零侵入。

## 工作原理

- **响应拦截**：`MaskResponseAdvice` 实现 `ResponseBodyAdvice`，拦截所有接口响应；基础类型（包装类、`Date` 等）直接放行，仅 JSON 对象/数组参与脱敏
- **规则匹配**：以 `userCode:method:uri` 为缓存 key，与已启用规则比对——`requestMethod` 精确匹配，`requestUri` 使用 AntPathMatcher 通配匹配（如 `/user/**`）
- **字段脱敏**：按 `maskJsonPath` 使用 JSONPath 定位并脱敏，支持 `[*]` 数组递归；响应本身为数组时，`maskJsonPath` 需以 `$[*]` 开头
- **缓存刷新**：规则增删改后立即清除规则缓存与匹配缓存，另有 12 秒定时兜底（检测到变更标记时刷新）

## 脱敏规则字段说明

| 字段 | 说明 | 是否必填 | 默认值 / 示例 |
| --- | --- | --- | --- |
| `maskRuleCode` | 脱敏规则编码；创建时可为空，为空时自动生成 `mask_rule_` 前缀编码，且编码全局唯一校验（重复时提示数据重复） | 否 | `mask_rule_xxx` |
| `maskRuleName` | 脱敏规则名称 | 是 | 用户手机号脱敏 |
| `requestMethod` | 请求方法，与目标接口 HTTP 方法精确匹配 | 是 | `GET` |
| `requestUri` | 请求路径，支持 AntPathMatcher 通配匹配 | 是 | `/user/page` |
| `maskJsonPath` | 脱敏数据路径，JSONPath 语法，支持 `[*]` 数组；响应为数组时需以 `$[*]` 开头 | 是 | `data.rows[*].mobile` |
| `maskRuleRegular` | 脱敏正则，命中后按正则匹配的内容以等长 `*` 替换 | 否 | `(1\\d{10})` |
| `maskRuleScript` | 脱敏 JS 脚本，通过脚本函数处理脱敏值（见下文脚本约定） | 否 | `function maskMobile(param) {...}` |
| `enableFlag` | 可用状态，创建/修改时为空默认 `1`（启用） | 否 | `1` |
| `mockValue` | 示例值，用于脱敏测试场景 | 否 | `13812340001` |
| `sort` | 排序 | 否 | `0` |
| `remark` | 备注 | 否 | - |

### JS 脚本约定

`maskRuleScript` 的脚本必须以 `function 函数名(param) { ... }` 形式声明，框架提取函数名，并将待脱敏值作为唯一入参调用，返回脱敏后的字符串：

```javascript
function maskMobile(param) {
    return param.substring(0, 3) + "****" + param.substring(7);
}
```

例如 `maskMobile("13812340001")` 返回 `138****0001`。

## 脱敏策略优先级

对单个值的脱敏按以下优先级依次执行，取第一个命中的策略：

1. **正则脱敏**（`maskRuleRegular`）：配置了正则则优先，对匹配到的内容按长度替换为等长 `*`（如手机号 `13812340001` 匹配 `(1\\d{10})` 后整串替换为 `***********`）
2. **JS 脚本脱敏**（`maskRuleScript`）：未配置正则时，执行 JS 脚本处理
3. **兜底长度规则**（`maskByDefault`）：未配置正则/脚本时，按长度兜底：
   - 长度 < 4：`***`
   - 长度 < 8：首字符 + `****`（如 `1****`）
   - 否则：前 3 位 + `****`（如 `138****`）

> 提示：脱敏测试接口 `/rule/test` 返回的 `maskType` 字段会按上述相同优先级说明本次生效的脱敏方式：正则 > JS 脚本 > 兜底长度规则。

## 规则管理 REST 接口

所有接口前缀为 `/micro-mask`，响应使用统一封装 `R<T>`（`code`、`data`、`msg`）。

### 创建规则

```http
POST /micro-mask/rule/create
Content-Type: application/json
```

```bash
curl -X POST http://localhost:8080/micro-mask/rule/create \
  -H "Content-Type: application/json" \
  -d '{
    "maskRuleName": "用户手机号脱敏",
    "requestMethod": "GET",
    "requestUri": "/user/page",
    "maskJsonPath": "data.rows[*].mobile",
    "maskRuleRegular": "(1\\d{10})"
  }'
```

**响应示例**：

```json
{
    "code": 1,
    "data": {
        "id": 1,
        "maskRuleCode": "mask_rule_xxx",
        "maskRuleName": "用户手机号脱敏",
        "requestMethod": "GET",
        "requestUri": "/user/page",
        "maskJsonPath": "data.rows[*].mobile",
        "maskRuleRegular": "(1\\d{10})",
        "enableFlag": 1
    }
}
```

### 修改规则

```http
POST /micro-mask/rule/update
Content-Type: application/json
```

```bash
curl -X POST http://localhost:8080/micro-mask/rule/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "maskRuleName": "用户手机号脱敏",
    "requestMethod": "GET",
    "requestUri": "/user/page",
    "maskJsonPath": "data.rows[*].mobile",
    "maskRuleRegular": "(1\\d{10})",
    "enableFlag": 1
  }'
```

### 删除规则

```http
POST /micro-mask/rule/remove
Content-Type: application/json
```

```bash
curl -X POST http://localhost:8080/micro-mask/rule/remove \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

### 分页查询

```http
GET /micro-mask/rule/page?current=1&size=10
```

```bash
curl -X GET "http://localhost:8080/micro-mask/rule/page?current=1&size=10"
```

支持按 `maskRuleCode`、`maskRuleName`（模糊查询）、`requestMethod`、`requestUri`、`enableFlag` 条件筛选。

### 规则详情

```http
GET /micro-mask/rule/info?id=1
```

```bash
curl -X GET "http://localhost:8080/micro-mask/rule/info?id=1"
```

## 脱敏测试与验证

### 脱敏测试 /rule/test

```http
POST /micro-mask/rule/test
Content-Type: application/json
```

请求体包含 `mockValue`（必填，示例值）、`maskRuleRegular`（可选，脱敏正则）、`maskRuleScript`（可选，脱敏 JS 脚本）；响应中的 `maskValue` 为脱敏后的值，`maskType` 说明本次生效的脱敏方式。

**正则脱敏测试**：

```bash
curl -X POST http://localhost:8080/micro-mask/rule/test \
  -H "Content-Type: application/json" \
  -d '{
    "mockValue": "13812340001",
    "maskRuleRegular": "(1\\d{10})"
  }'
```

```json
{
    "code": 1,
    "data": {
        "mockValue": "13812340001",
        "maskValue": "***********",
        "maskType": "使用正则表达式进行匹配脱敏！"
    }
}
```

**兜底规则测试**（不传正则/脚本）：

```json
{
    "code": 1,
    "data": {
        "mockValue": "13812340001",
        "maskValue": "138****",
        "maskType": "使用兜底规则进行脱敏！"
    }
}
```

**JS 脚本测试**：

```bash
curl -X POST http://localhost:8080/micro-mask/rule/test \
  -H "Content-Type: application/json" \
  -d '{
    "mockValue": "13812340001",
    "maskRuleScript": "function maskMobile(param){ return param.substring(0,3) + \"****\" + param.substring(7); }"
  }'
```

```json
{
    "code": 1,
    "data": {
        "mockValue": "13812340001",
        "maskValue": "138****0001",
        "maskType": "使用JS脚本进行脱敏！"
    }
}
```

### 在线验证 /rule/verify

```http
GET /micro-mask/rule/verify
```

```bash
curl -X GET http://localhost:8080/micro-mask/rule/verify
```

返回一个**嵌套示例 JSON**，内置多种数组层级结构，用于搭配 JSONPath 快速验证数组脱敏效果：

```json
{
    "rows": [
        {
            "mobile2": "13812342222",
            "mobile3": [
                "13812343333",
                "13812343333"
            ],
            "children": [
                {
                    "age": 18,
                    "mobile4": "13812344444",
                    "mobile5": [
                        ["13812345555", "13812345555"],
                        []
                    ]
                },
                {
                    "age": 18,
                    "mobile4": "13812344444"
                }
            ]
        },
        {
            "mobile2": "13812342222",
            "mobile3": [
                "13812343333",
                "13812343333"
            ],
            "children": [
                {
                    "age": 18,
                    "mobile4": "13812344444"
                },
                {
                    "age": 18,
                    "mobile4": "13812344444"
                }
            ]
        }
    ],
    "current": 1,
    "size": 20,
    "total": 2,
    "page": 1,
    "mobile0": 13812340000,
    "mobile1": "13812341111"
}
```

可将下列 JSONPath 配置到规则的 `maskJsonPath` 中，再请求任意被该规则命中的接口，验证对应数据的脱敏效果：

| 目标数据 | JSONPath | 说明 |
| --- | --- | --- |
| 顶层字符串字段 | `mobile1` | 单值字段 |
| 顶层数字字段 | `mobile0` | 数字按字符串处理 |
| 单层数组内字段 | `rows[*].mobile2` | 数组元素的对象属性 |
| 数组内嵌数组元素 | `rows[*].mobile3[*]` | 字符串数组脱敏 |
| 嵌套对象数组字段 | `rows[*].children[*].mobile4` | 嵌套数组内对象属性 |
| 二维数组元素 | `rows[*].children[*].mobile5[*][*]` | 二维数组脱敏 |

## 完整业务场景

以**分页用户列表的 mobile 字段脱敏**为例，完整演示"配置规则 → 接口响应自动脱敏"。

假设业务接口 `GET /user/page` 原始响应如下（未脱敏）：

```json
{
    "code": 1,
    "data": {
        "current": 1,
        "size": 10,
        "total": 2,
        "rows": [
            { "id": 1, "name": "张三", "mobile": "13812340001" },
            { "id": 2, "name": "李四", "mobile": "13812340002" }
        ]
    }
}
```

### 1. 创建脱敏规则

对 `GET /user/page` 的 `data.rows[*].mobile` 字段配置手机号正则脱敏：

```bash
curl -X POST http://localhost:8080/micro-mask/rule/create \
  -H "Content-Type: application/json" \
  -d '{
    "maskRuleName": "用户分页-手机号脱敏",
    "requestMethod": "GET",
    "requestUri": "/user/page",
    "maskJsonPath": "data.rows[*].mobile",
    "maskRuleRegular": "(1\\d{10})"
  }'
```

创建成功后，规则立即生效（无需重启服务）。

### 2. 访问接口验证脱敏效果

再次请求 `GET /user/page`，响应中的 `mobile` 字段已被 `*` 替换：

```json
{
    "code": 1,
    "data": {
        "current": 1,
        "size": 10,
        "total": 2,
        "rows": [
            { "id": 1, "name": "张三", "mobile": "***********" },
            { "id": 2, "name": "李四", "mobile": "***********" }
        ]
    }
}
```

### 3. 脱敏前后对比

| 字段 | 脱敏前 | 脱敏后 |
| --- | --- | --- |
| `rows[0].mobile` | `13812340001` | `***********` |
| `rows[1].mobile` | `13812340002` | `***********` |

> 说明：使用正则 `(1\\d{10})` 匹配整串 11 位手机号，匹配内容以等长 `*` 替换，故结果为 11 个 `*`。若改用兜底长度规则，则结果为 `138****`；若改用 JS 脚本，可自定义更精细的保留位（如 `138****0001`）。
