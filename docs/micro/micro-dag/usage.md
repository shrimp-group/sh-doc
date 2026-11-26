# 后端使用

Micro-Dag 提供流程与版本、元能力（handler 列表与表达式试算）、实例与节点干预四组 REST 接口，前缀统一为 `/micro-dag`，路径以 `rest/Route.java` 常量为准。所有接口返回 `R<T>` 统一响应结构（`code`/`msg`/`data`/`requestTime`，成功 `code=200`）。

- 流程与版本：POST /process/create 新建流程（主表 + v0 草稿）→ version/update 编辑草稿 → version/publish 发布（版本递增，实例锁定版本）；已发布版本不可编辑，变更以最新已发布版本为底稿 version/create 建新草稿
- 实例七态节点状态：PENDING / RUNNING / SUCCESS / FAILED / RETRYING / SKIPPED / MANUAL_STOPPED
- 实例五态：RUNNING / SUCCESS / FAILED / STOPPED / TERMINATED

## API 总览

### 流程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /micro-dag/process/page | 流程分页（含版本状态聚合：EDITING/PUBLISHED、draftId、latestVersion、latestPublishedId） |
| POST | /micro-dag/process/create | 新建流程（后端生成 dagCode，创建 v0 草稿，返回 id 与 dagCode） |

### 流程版本

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /micro-dag/process/version/create | 基于已有流程创建草稿（草稿 dagVersion=0，返回草稿版本 id） |
| POST | /micro-dag/process/version/update | 保存草稿（节点/边全量覆盖，同步主表名称） |
| POST | /micro-dag/process/version/publish | 发布版本（全量校验 + 版本递增，返回发布版本号） |
| GET | /micro-dag/process/version/detail | 版本详情（元信息 + 节点/边，dagName 取主表当前名称） |
| GET | /micro-dag/process/version/list | 历史版本列表（按 dagVersion 倒序） |

### 元能力

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /micro-dag/handler/list | 已注册 handler 列表（编码/名称/分类/paramSchema） |
| POST | /micro-dag/expression/preview | 分支表达式试算（语法校验 + 求值） |

### 流程实例

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /micro-dag/instance/launch | 发起实例（锁定最新 PUBLISHED 版本，返回实例 id） |
| GET | /micro-dag/instance/page | 实例分页查询 |
| GET | /micro-dag/instance/detail | 实例详情（实例 + 节点状态 + 边 + 上下文 + 节点输出） |
| POST | /micro-dag/instance/terminate | 终止实例（仅 RUNNING/FAILED，运行中节点走中断流程） |
| POST | /micro-dag/instance/rerun-from | 从指定节点重跑（目标节点及全部下游重置，上游成功节点保留） |

### 节点干预

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /micro-dag/node/detail | 节点实例详情 + 执行记录时间线 |
| POST | /micro-dag/node/interrupt | 中断运行中节点（协作式，置 MANUAL_STOPPED） |
| POST | /micro-dag/node/params | 节点改参（非运行态，重跑时生效） |
| POST | /micro-dag/node/skip | 跳过节点（非运行态，触发下游就绪计算） |
| POST | /micro-dag/node/reset | 重置节点为 PENDING（非运行态，不自动触发调度） |
| POST | /micro-dag/node/rerun | 重跑单节点（reset + 清理钩子判定 + 实例回 RUNNING） |

## 流程与版本管理

典型流程：`process/create` 新建流程（一次提交 dagName+nodes+edges，主表生成 `dag_` 前缀编码并创建 v0 草稿）→ `version/update` 迭代草稿 → `version/publish` 发布；已发布版本不可编辑，变更时以最新已发布版本为底稿调 `version/create` 建新草稿。

### 新建流程

```http
POST /micro-dag/process/create
Content-Type: application/json

{
  "dagName": "订单数据处理",
  "nodes": [
    { "code": "start",  "name": "开始",   "nodeType": "START", "handler": "system-start", "posX": 100, "posY": 200 },
    { "code": "fetch",  "name": "拉取数据", "handler": "fetch", "maxRetry": 3, "intervalSec": 30,
      "backoff": "EXPONENTIAL", "timeoutMs": 60000, "params": {"batch": "20261120"}, "posX": 300, "posY": 200 },
    { "code": "gate",   "name": "结果分支", "nodeType": "BRANCH", "handler": "system-branch", "posX": 500, "posY": 200 },
    { "code": "notify", "name": "发送通知", "handler": "notify", "posX": 700, "posY": 100 },
    { "code": "alarm",  "name": "告警",    "handler": "alarm",  "posX": 700, "posY": 300 },
    { "code": "end",    "name": "结束",   "nodeType": "END",  "handler": "system-end", "posX": 900, "posY": 200 }
  ],
  "edges": [
    { "edgeCode": "e1", "fromCode": "start",  "toCode": "fetch" },
    { "edgeCode": "e2", "fromCode": "fetch",  "toCode": "gate" },
    { "edgeCode": "e3", "fromCode": "gate",   "toCode": "notify", "type": "CONDITION", "whenExpr": "${out.fetch.rows} > 0" },
    { "edgeCode": "e4", "fromCode": "gate",   "toCode": "alarm",  "type": "CONDITION", "whenExpr": "${out.fetch.rows} == 0" },
    { "edgeCode": "e5", "fromCode": "notify", "toCode": "end" },
    { "edgeCode": "e6", "fromCode": "alarm",  "toCode": "end" }
  ]
}
```

节点字段（NodeDef）：`code`/`name`/`nodeType`（NORMAL/START/END/BRANCH，缺省 NORMAL）/`handler`/`timeoutMs`（0 或空=不限）/`maxRetry`/`intervalSec`/`backoff`（FIXED/EXPONENTIAL，缺省 FIXED）/`params`（JSON 对象）/`posX`/`posY`。

边字段（EdgeDef）：`edgeCode`/`fromCode`/`toCode`/`type`（NORMAL/CONDITION，缺省 NORMAL）/`whenExpr`（CONDITION 边必填，见分支表达式）。

```json
{
  "code": 200,
  "msg": "Success",
  "data": { "id": 1, "dagCode": "dag_8FJ2K3M4Q5" },
  "requestTime": "2026-11-20 10:00:00"
}
```

### 编辑与发布

`version/update` 仅 DRAFT 可改（节点/边全量覆盖，并同步主表流程名称），请求体为 `{ id: 草稿版本 id, dagName, nodes, edges }`；`data` 返回草稿版本 id：

```http
POST /micro-dag/process/version/update
Content-Type: application/json

{ "id": 2, "dagName": "订单数据处理", "nodes": [...], "edges": [...] }
```

`version/publish` 仅 DRAFT 可发布，发布时执行全量校验并要求存在起始节点（无上游的节点），版本号取该 dagCode 历史最大版本 + 1，节点/边行先删后按新版本重挂：

```http
POST /micro-dag/process/version/publish?id=1
```

```json
{ "code": 200, "msg": "Success", "data": 1, "requestTime": "2026-11-20 10:01:00" }
```

`data` 为发布后的版本号（Integer）。发布失败时 `msg` 返回校验错误明细（多条以 `; ` 拼接）。

流程分页与版本查询为 GET：

```http
GET /micro-dag/process/page?dagName=订单&current=1&size=10
```

返回 `ProcessPageResp` 列表（id/dagCode/dagName/updateTime + 版本状态聚合）：`status` 为聚合状态（EDITING=有草稿 / PUBLISHED=无草稿有发布版本，全新流程也按 PUBLISHED 展示）、`draftId`（草稿版本 id，无草稿 null）、`latestVersion`（最新已发布版本号，无则 null）、`latestPublishedId`（最新已发布版本 id，无则 null）。过滤参数支持 `dagCode` 精确、`dagName` 模糊。

```http
GET /micro-dag/process/version/detail?id=1
```

返回 `ProcessVersionDetailResp`（id/dagCode/dagName/dagVersion/status/nodes/edges，`dagName` 取主表当前名称）：

```http
GET /micro-dag/process/version/list?dagCode=dag_8FJ2K3M4Q5
```

返回历史版本列表 `ProcessVersionResp`（id/dagCode/dagVersion/status/updateTime，按 dagVersion 倒序，草稿 dagVersion=0 显示在前）。

## 发起实例

```http
POST /micro-dag/instance/launch
Content-Type: application/json

{
  "dagCode": "dag_8FJ2K3M4Q5",
  "traceCode": "TRC-20261120-0001",
  "params": { "orderNo": "SO-1001", "channel": "api" }
}
```

| 字段 | 说明 |
|------|------|
| dagCode | 流程编码，必填；锁定当前最新的 PUBLISHED 版本发起 |
| traceCode | 跟踪编码，可空；非空时需全局唯一（已存在则拒绝），为空时可由 handler 运行期回填 |
| params | 发起参数，同时写入流程上下文，供表达式 `${ctx.*}` 引用；同时合并进各节点入参 |

```json
{ "code": 200, "msg": "Success", "data": 101, "requestTime": "2026-11-20 10:02:00" }
```

`data` 为实例 id（Long）；实例流水号 instanceCode 由后端生成（`INST` 前缀），可通过 `/instance/page?dagCode=...&traceCode=...` 查询。

**分支快照**：launch 时引擎自动将 BRANCH 节点的 CONDITION 出边快照进该节点入参（key=目标节点编码，value=whenExpr），供 system-branch 求值与实例明细展示；快照在定义 params 与发起 params 之后合并，发起参数不可覆盖分支快照键。

## 实例查询与终止

```http
GET /micro-dag/instance/page?instanceCode=INST17636089201234&current=1&size=10
```

分页支持 `instanceCode`/`traceCode`/`status`/`dagCode` 等值过滤。实例详情：

```http
GET /micro-dag/instance/detail?instanceCode=INST17636089201234
```

返回 `InstanceDagViewResp`：`instance`（实例信息）、`nodes`（节点实例列表，含状态/attempt/入参输出/画布坐标/`lastCostMs` 最后一次执行耗时——最后一次 CLAIM 至该次终态事件，RUNNING 中按当前时刻持续计算）、`edges`（定义快照的边列表）、`ctx`（流程上下文）、`nodeOutputs`（各节点输出，`${out.<nodeCode>.*}` 数据源）。

```json
{
  "code": 200,
  "msg": "Success",
  "data": {
    "instance": { "instanceCode": "INST17636089201234", "dagCode": "dag_8FJ2K3M4Q5", "dagVersion": 1, "status": "RUNNING", "traceCode": "TRC-20261120-0001" },
    "nodes": [
      { "nodeCode": "start", "status": "SUCCESS", "attempt": 1, "lastCostMs": 15 },
      { "nodeCode": "fetch", "status": "RUNNING", "attempt": 1, "leaseOwner": "INST17636089201234:10.0.0.8:8080", "lastCostMs": 32000 },
      { "nodeCode": "gate",  "status": "PENDING", "attempt": 0 }
    ],
    "edges": [ { "edgeCode": "e1", "fromCode": "start", "toCode": "fetch" } ],
    "ctx": { "orderNo": "SO-1001", "channel": "api" },
    "nodeOutputs": { "start": { "orderNo": "SO-1001" }, "fetch": {} }
  },
  "requestTime": "2026-11-20 10:05:00"
}
```

终止实例（仅 RUNNING/FAILED 可终止，运行中节点经中断标记停止）：

```http
POST /micro-dag/instance/terminate?instanceCode=INST17636089201234
```

## 分支表达式与试算

CONDITION 边的 `whenExpr` 语法：

- 占位符：`${ctx.key}` 流程上下文、`${out.<nodeCode>.key}` 上游节点输出；仅支持这两类，嵌套不解析
- 比较：`==` `!=` `>` `>=` `<` `<=`；两边均可转数字按数值比较（`'3' == 3.0` 成立），否则按字符串字典序；`null` 只与 `null` 相等
- 逻辑：`and` / `or`（or 优先级最低），支持括号
- 字面量：`'str'` / `"str"` / 数字 / `true` / `false` / `null`
- 单值表达式按真值求值（null 视为 false）

发布前的调试入口：

```http
POST /micro-dag/expression/preview
Content-Type: application/json

{
  "expression": "${ctx.channel} == 'api' and ${out.fetch.rows} > 0",
  "ctx": { "channel": "api" },
  "nodeOutputs": { "fetch": { "rows": 100 } }
}
```

```json
{ "code": 200, "msg": "Success", "data": { "parseOk": true, "result": true }, "requestTime": "2026-11-20 10:06:00" }
```

语法错误时 `parseOk=false`，`errorMsg` 返回错误位置与原因，`result` 为空。

## 节点干预

单节点查询（含执行记录时间线，事件含 CLAIM/SUCCESS/FAIL/TIMEOUT/INTERRUPT/RETRY_SCHEDULED/LEASE_RECLAIM/SKIP/RESET/CLEANUP/NODE_LOG）：

```http
GET /micro-dag/node/detail?instanceCode=INST17636089201234&nodeCode=fetch
```

各干预操作的语义与适用状态：

| 操作 | 请求方式 | 适用状态 | 语义 |
|------|---------|---------|------|
| interrupt | `POST /node/interrupt?instanceCode=..&nodeCode=..` | 仅 RUNNING | 置中断标记 + Redis 广播，handler 在 checkInterrupted 检查点抛出后转 MANUAL_STOPPED |
| params | `POST /node/params`（JSON 体） | 非 RUNNING | 修改节点入参 inputParamsJson，重跑时生效 |
| skip | `POST /node/skip`（JSON 体） | 非 RUNNING | 置 SKIPPED + skipReason（缺省"人工跳过"），触发下游就绪计算 |
| reset | `POST /node/reset`（JSON 体） | 非 RUNNING | 重置为 PENDING，清除输出/异常/重试时间/跳过原因；`clearParams=true` 时同时清除节点参数；不自动触发调度 |
| rerun | `POST /node/rerun?instanceCode=..&nodeCode=..` | 非 RUNNING | 单节点重跑：reset + 清理钩子判定（attempt>0 先调 cleanup）+ 实例回 RUNNING 并唤醒调度 |
| rerun-from | `POST /instance/rerun-from?instanceCode=..&nodeCode=..` | 实例非 RUNNING | 从指定节点重跑：目标节点及全部下游重置，上游 SUCCESS 节点保留，实例回 RUNNING |

改参、跳过、重置使用统一的 JSON 请求体（NodeInterveneReq）：

```http
POST /micro-dag/node/params
Content-Type: application/json

{
  "instanceCode": "INST17636089201234",
  "nodeCode": "fetch",
  "inputParamsJson": "{\"batch\": \"20261121\", \"rows\": 200}"
}
```

```json
{ "code": 200, "msg": "Success", "data": null, "requestTime": "2026-11-20 10:08:00" }
```

| 字段 | 说明 |
|------|------|
| instanceCode / nodeCode | 实例流水号与节点编码，必填 |
| skipReason | 跳过原因（skip 时使用，缺省"人工跳过"） |
| inputParamsJson | 节点参数 JSON 字符串（params 时使用） |
| clearParams | 重置时是否清除节点参数（reset 时使用，默认 false） |

## 注意事项

1. **乐观锁 version**：实体更新基于 id + version 的 CAS（节点领取、状态推进、人工干预均如此），冲突方自动失败重试；定义/实例编辑接口由后端加载实体后回写，无需调用方传递 version
2. **统一响应结构**：所有接口返回 `R<T>`（code/msg/data/requestTime），成功 `code=200`；业务校验失败抛 ValidationException，`msg` 携带中文错误明细
3. **幂等**：traceCode 全局唯一校验在 launch 时执行；表达式与调度推进汇合于 DB CAS，重复回调天然幂等
4. **重试语义**：节点失败且 attempt ≤ maxRetry 进入 RETRYING，按 intervalSec + backoff（FIXED/EXPONENTIAL）计算 next_retry_time，到期由调度提升；超出重试次数置 FAILED 并联动实例 FAILED
5. **级联跳过**：分支条件不满足的下游节点置 SKIPPED；仅当上游全部为确定性不满足（FAILED/MANUAL_STOPPED/链式 SKIPPED/条件求值 false）时级联，上游未定状态（PENDING/RUNNING/RETRYING）不参与跳过
6. **草稿唯一**：唯一索引 uk_code_version 保证同一流程至多一个编辑中草稿，并发创建草稿时后抛 ValidationException（已有编辑中草稿，请刷新列表）
