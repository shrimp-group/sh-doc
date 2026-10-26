# 功能使用

Micro-Report 提供基于数据脚本的报表定义、参数与结果配置、历史版本管理、查询执行与 Excel 导出能力。所有接口前缀为 `/micro-report`。

- 报表即 SQL：报表编码 + 数据脚本（SELECT）定义数据来源，支持 MyBatis 动态标签
- 三种返回形态：OBJECT（单对象）/ LIST（列表）/ PAGE（分页）
- 自动提取：从 SQL 脚本自动提取入参与结果字段
- 安全与校验：仅允许 SELECT；参数支持必填、类型、JS 脚本校验
- 导出：按结果字段定义生成表头，导出 `.xlsx`

## 使用流程

1. **创建报表定义**：设置报表编码（留空自动生成 `rpt_` 前缀编码）、名称、数据脚本、返回类型 resultType
2. **测试验证**：调用 `/definition/test` 试运行 SQL 脚本，确认返回形态与数据正确
3. **配置入参**：调用 `/definition/param/extract` 从脚本自动提取参数，或手工创建
4. **配置结果字段**：调用 `/definition/result/extract` 自动提取结果列，或手工创建
5. **启用报表**：设置 `enableFlag = 1`（缓存仅加载启用报表）
6. **前端消费**：`/exec/info` 获取报表元数据（参数与结果字段）渲染查询表单与表格列 → `/exec/query` 查询 → `/exec/export` 导出

## 报表定义

| 接口路径 | 方法 | 说明 |
|------|------|------|
| /definition/page | GET | 报表定义-分页查询（含参数数、结果字段数统计） |
| /definition/detail | GET | 报表定义-详情 |
| /definition/create | POST | 报表定义-创建（自动写历史） |
| /definition/update | POST | 报表定义-修改（自动写历史） |
| /definition/remove | POST | 报表定义-删除（级联删除参数与结果字段） |
| /definition/test | POST | 报表定义-SQL 测试 |

**关键字段**：

| 字段 | 说明 |
|------|------|
| reportCode | 报表编码，唯一标识；创建时留空自动生成 |
| reportScript | 数据脚本，SELECT 语句，支持 MyBatis 动态标签（if/where/foreach 等） |
| resultType | 返回类型：OBJECT / LIST / PAGE，默认 PAGE |
| reportScriptCountSwitch | Count 脚本开关（仅 PAGE 生效）：1 使用自定义 COUNT 脚本，0 自动生成 COUNT SQL |
| reportScriptCount | 自定义 COUNT SQL 脚本 |
| reportScriptAutocamel | 自动驼峰转换：1 将结果列下划线命名转为驼峰，默认 1 |
| enableFlag | 启用状态：1 启用（仅启用的报表进入缓存、可执行） |

**resultType 三种形态语义**：

| 形态 | 语义 |
|------|------|
| OBJECT | 返回单行 Map；无数据返回 null，超过一行报错 |
| LIST | 返回行列表 List&lt;Map&gt; |
| PAGE | 返回分页数据（records/total/current/size），默认页码 1、每页 10 条 |

## 参数与结果配置

### 参数配置

| 接口路径 | 方法 | 说明 |
|------|------|------|
| /definition/param/list | GET | 参数-列表查询（按报表编码） |
| /definition/param/create | POST | 参数-创建 |
| /definition/param/update | POST | 参数-修改 |
| /definition/param/remove | POST | 参数-删除 |
| /definition/param/extract | POST | 参数-自动提取 |

**参数关键字段**：

| 字段 | 说明 |
|------|------|
| fieldCode / fieldName | 参数编码（对应脚本占位符名）与名称 |
| fieldType | 参数类型：string / number / date / datetime（number 参与后端数字校验） |
| fieldFormType | 表单类型：TEXT / NUMBER / DATE / DATETIME / SELECT / SELECT_MULTIPLE / RADIO / TEXTAREA |
| placeholder / width / sort | 输入提示、列表宽度、排序 |
| required | 是否必填：1 必填，执行时校验 |
| validateScript | 校验 JS 脚本，变量 `value`，返回 false 校验不通过 |
| dictType | 字典类型（下拉选项数据源） |

### 结果字段配置

| 接口路径 | 方法 | 说明 |
|------|------|------|
| /definition/result/list | GET | 结果字段-列表查询（按报表编码） |
| /definition/result/create | POST | 结果字段-创建 |
| /definition/result/update | POST | 结果字段-修改 |
| /definition/result/remove | POST | 结果字段-删除 |
| /definition/result/extract | POST | 结果字段-自动提取 |

**结果字段关键字段**：fieldCode / fieldName（列编码与列名）、fieldType（字段类型）、fieldFormType（展示类型：TEXT / NUMBER / DATE / DATETIME / IMAGE）、width（列宽）、sort（排序）。

### 自动提取能力

两个 extract 接口请求体一致：`reportCode` + `reportScript`（必填）+ `reportScriptAutocamel`，返回提取后的字段列表（不落库）：

- **参数提取**：解析脚本中 `#{param}` 占位符与 `foreach` 的 `collection="xxx"` 集合参数；`#{item.field}` 取根名 `item`；内置分页参数 current / size / offset 不提取
- **结果提取**：解析 SELECT 列，取 `AS` 别名（无别名取列名）；`SELECT *` 无法提取

## 历史版本

报表定义创建与修改时自动写入历史表，历史接口仅查询：

| 接口路径 | 方法 | 说明 |
|------|------|------|
| /definition/his/page | GET | 历史版本-分页查询 |
| /definition/his/detail | GET | 历史版本-详情（含当时完整 SQL 脚本） |

## 执行与导出

| 接口路径 | 方法 | 说明 |
|------|------|------|
| /exec/options | GET | 可用报表选项列表（左侧报表选择） |
| /exec/info | GET | 报表详情（含参数与结果字段元数据） |
| /exec/query | GET | 执行报表查询 |
| /exec/export | POST | 导出 Excel（.xlsx） |

查询与导出前会对入参做校验：必填、number 类型数字校验、validateScript JS 校验；报表不存在或未启用时报错。

### PAGE 查询

```http
GET /micro-report/exec/query?reportCode=rpt_user_list&current=1&size=10&status=1
```

`reportCode` 必填，`current` / `size` 为分页参数，其余 query 参数平铺作为报表入参。

```json
{
  "code": 1,
  "data": {
    "records": [
      { "id": 1, "userName": "admin", "orderAmount": 100.00 }
    ],
    "total": 42,
    "current": 1,
    "size": 10
  }
}
```

### LIST 查询

```http
GET /micro-report/exec/query?reportCode=rpt_user_list&status=1
```

```json
{
  "code": 1,
  "data": [
    { "id": 1, "userName": "admin" },
    { "id": 2, "userName": "test" }
  ]
}
```

### OBJECT 查询

```http
GET /micro-report/exec/query?reportCode=rpt_user_summary&userId=1
```

```json
{
  "code": 1,
  "data": { "userName": "admin", "orderCount": 12 }
}
```

无数据时 `data` 为 null；脚本返回超过一行时报错。

### 导出 Excel

```http
POST /micro-report/exec/export
Content-Type: application/json

{ "reportCode": "rpt_user_list", "status": 1 }
```

请求体为 JSON 对象：`reportCode` 必填，其余键平铺作为报表入参。响应为 `.xlsx` 文件流（`Content-Disposition: attachment; filename=<reportCode>.xlsx`）。

导出说明：

- 表头取自结果字段定义（fieldCode → fieldName），需先配置结果字段，否则报错
- 基于 EasyExcel 生成，自适应列宽
- OBJECT 类型报表导出仅取第一行数据

## REST 接口清单

| 模块 | 接口路径 | HTTP 方法 | 说明 |
|------|------|------|------|
| 报表定义 | /micro-report/definition/page | GET | 分页查询 |
| 报表定义 | /micro-report/definition/detail | GET | 详情 |
| 报表定义 | /micro-report/definition/create | POST | 创建 |
| 报表定义 | /micro-report/definition/update | POST | 修改 |
| 报表定义 | /micro-report/definition/remove | POST | 删除 |
| 报表定义 | /micro-report/definition/test | POST | SQL 测试 |
| 历史版本 | /micro-report/definition/his/page | GET | 分页查询 |
| 历史版本 | /micro-report/definition/his/detail | GET | 详情 |
| 报表参数 | /micro-report/definition/param/list | GET | 列表查询 |
| 报表参数 | /micro-report/definition/param/create | POST | 创建 |
| 报表参数 | /micro-report/definition/param/update | POST | 修改 |
| 报表参数 | /micro-report/definition/param/remove | POST | 删除 |
| 报表参数 | /micro-report/definition/param/extract | POST | 自动提取 |
| 结果字段 | /micro-report/definition/result/list | GET | 列表查询 |
| 结果字段 | /micro-report/definition/result/create | POST | 创建 |
| 结果字段 | /micro-report/definition/result/update | POST | 修改 |
| 结果字段 | /micro-report/definition/result/remove | POST | 删除 |
| 结果字段 | /micro-report/definition/result/extract | POST | 自动提取 |
| 报表执行 | /micro-report/exec/options | GET | 报表选项列表 |
| 报表执行 | /micro-report/exec/info | GET | 报表详情（含元数据） |
| 报表执行 | /micro-report/exec/query | GET | 执行查询 |
| 报表执行 | /micro-report/exec/export | POST | 导出 Excel |
