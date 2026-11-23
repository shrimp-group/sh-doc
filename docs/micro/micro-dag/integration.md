# 功能集成

Micro-Dag 是嵌入式轻量分布式业务编排引擎（DAG），提供流程与版本管理、实例发起、分布式对等调度（CAS 领取 + 租约故障转移）、失败自动重试（FIXED/EXPONENTIAL 退避）、人工干预治理（中断/改参/跳过/重置/重跑/从节点重跑/终止）、自研分支表达式引擎、节点分类（SYSTEM/DEMO/BUSINESS）与开始节点时间驱动（cron 定时发起实例）等能力。

## 添加依赖

在项目的 `pom.xml` 中添加依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-dag</artifactId>
</dependency>
```

模块通过 Spring Boot 自动配置（`DagAutoConfig`）装配，引入依赖后自动完成 Mapper 与组件扫描，无需额外配置类。依赖 Redis（唤醒广播、中断广播、触发器集群锁与编码生成），集成方需保证 Redis 可用。

## 数据库初始化

模块不自动建表，需在 MySQL 8 目标库执行建表脚本，共 7 张表（utf8mb4）。建表 DDL 以 micro-dag 仓库 docs/tasks/micro-dag/01-sql.md 为准（micro-dag/sql/dag_init.sql 未随工程落盘）。

| 表名 | 用途 |
|------|------|
| dag_process | 流程主表（dagCode 唯一、dagName 唯一持有，历史版本显示当前名称） |
| dag_process_version | 流程版本（dagVersion：草稿固定 0，发布递增为历史最大版本+1；状态 DRAFT/PUBLISHED） |
| dag_node | 版本节点（一行一节点，含 handler、重试/超时配置、params_json、画布坐标 pos_x/pos_y） |
| dag_edge | 版本边（一行一边，含类型 NORMAL/CONDITION 与条件表达式 when_expr） |
| dag_instance | 流程实例（instance_code、trace_code、锁定流程版本、上下文与发起参数） |
| dag_node_instance | 节点实例（核心表：七态状态、attempt、租约、中断/清理标记、输入输出） |
| dag_execution_log | 执行记录（事件明细 detail_json、过程日志 log_text、执行机器 worker） |

**存量库升级 DDL 迁移**（新建库直接用最新表定义，无需执行）：

```sql
ALTER TABLE dag_execution_log MODIFY detail_json JSON;
ALTER TABLE dag_execution_log ADD COLUMN log_text TEXT COMMENT '过程日志内容(NODE_LOG 专用)';
```

迁移前需校验存量 `detail_json` 均为合法 JSON（现存写入方均为 toJson 产出或 null）；另执行 `ALTER TABLE dag_node ADD COLUMN node_type varchar(16) NOT NULL DEFAULT 'NORMAL' COMMENT '节点类型 NORMAL/START/END/BRANCH';` 补齐节点类型列。旧 dag_definition 表已废弃，由 dag_process/dag_process_version 替代（存量数据需按流程/版本拆分迁移）。

**演示数据**：执行 sql/dag_demo.sql 可一键灌入 14 条全场景演示流程（幂等可重复执行，先清理 dag_demo_% 前缀旧数据再重灌），覆盖最小链路、条件边、分支、并行汇聚、失败级联跳过、重试与退避、超时、cron 定时发起、人工干预、改参重跑、从指定节点重跑等场景；配合 dag.demo-enabled=true 使用，教程见 micro-dag 仓库 docs/living-docs-technical/modules/micro-dag-demo-tutorial.md。

## 实现 NodeHandler

业务节点通过实现 `com.wkclz.micro.dag.api.NodeHandler` SPI 并注册为 Spring Bean 接入编排，默认分类 BUSINESS，无需额外标注。

完整可复制示例：

```java
@Component
public class DataFetchHandler implements NodeHandler {

    @Override
    public String nodeCode() {
        return "fetch";
    }

    @Override
    public String nodeName() {
        return "数据拉取";
    }

    @Override
    public NodeResult execute(NodeContext ctx) throws Exception {
        Map<String, Object> params = ctx.inputParams();
        // 长任务应周期性检查协作式中断，命中后引擎将节点置为 MANUAL_STOPPED
        ctx.checkInterrupted();
        ctx.log("开始拉取数据, batch=" + params.get("batch"));
        // ... 业务执行 ...
        // traceCode 非空时回填 dag_instance.trace_code（仅当实例跟踪编码为空时写入）
        return NodeResult.ok(Map.of("rows", 100)).withTraceCode("TRC-20261120-0001");
    }

    @Override
    public void cleanup(NodeContext ctx) {
        // 重跑前清理钩子：清除该节点历史写入的数据，避免重跑产生重复副作用
    }
}
```

### 方法契约

| 方法 | 说明 |
|------|------|
| nodeCode() | 节点编码，全局唯一，与定义中节点的 handler 字段对应 |
| nodeName() | 节点名称（设计器展示用），缺省取 nodeCode |
| category() | 节点分类：SYSTEM 永久生效 / DEMO 受 `dag.demo-enabled` 限制 / BUSINESS 业务节点默认值 |
| execute(ctx) | 执行节点业务；返回 `NodeResult` 显式区分成功与失败 |
| cleanup(ctx) | 重跑前清理钩子 |
| paramSchema() | 节点参数定义，缺省无参数（见下节） |

### 显式失败语义（NodeResult）

- `NodeResult.ok()` / `NodeResult.ok(output)`：成功，output 写入节点实例的 output_json，供下游 `${out.<nodeCode>.*}` 引用
- `NodeResult.fail()` / `NodeResult.fail(output)`：显式失败，派发 FAIL 事件；output 仍写入 output_json（RETRYING/FAILED 状态均写），当 output 中含 String 类型的 `msg` 键时，该值作为失败消息展示
- `withTraceCode(traceCode)`：回填实例唯一跟踪编码（幂等，仅当实例 trace_code 为空时写入）
- handler 抛出异常与返回 fail 等价：进入重试/失败判定，异常摘要写入 error_msg

### 清理钩子（cleanup）触发条件

仅当重跑目标节点发生过执行（attempt > 0）时，引擎置 cleanup_flag=1，并在重新执行前先调用 `handler.cleanup(ctx)`；首次执行（attempt = 0）不触发。适用于幂等清理历史写入的数据（如删除上次生成的文件、回滚已提交的外部单据）。

### 协作式中断（checkInterrupted）

人工中断（interrupt/terminate）只置 interrupt_flag 标记并经 Redis 广播，不会强杀线程；handler 在长任务循环中周期性调用 `ctx.checkInterrupted()`，命中后抛出 InterruptedException，由引擎转为 MANUAL_STOPPED。未设置检查点的短任务在执行完当前次后自然停止。

### 过程日志（ctx.log）

`ctx.log(message)` 将过程日志写入线程安全的内存缓冲，由 worker 按 `dag.log.flush-interval-ms` 定时落库为 NODE_LOG 事件（独立字段 log_text）；节点到达终态时 finally 兜底 flush 一次。缓冲上限 `dag.log.max-chars`（默认 8000 字符），超出后丢弃后续内容并补 `...[truncated]` 截断标记。

## paramSchema 参数定义

`NodeHandler.paramSchema()` 声明节点参数定义（`NodeParamDef`），随 `/handler/list` 下发给设计器渲染参数表单（表单/JSON 双模式），并在保存与发布时参与校验：

```java
@Override
public List<NodeParamDef> paramSchema() {
    return List.of(
        NodeParamDef.of("batch", "批次号", NodeParamType.TEXT).required().placeholder("如 20261120"),
        NodeParamDef.of("rows", "拉取行数", NodeParamType.NUMBER).range(1L, 10000L).defaultValue("100"),
        NodeParamDef.of("mode", "拉取模式", NodeParamType.SELECT)
            .options(new NodeParamDef.Option("FULL", "全量"), new NodeParamDef.Option("INCR", "增量")),
        NodeParamDef.of("cron", "定时表达式", NodeParamType.CRON).requiredWhen("mode", "FULL")
    );
}
```

**NodeParamDef 字段与链式 API**：

| 字段 | 链式方法 | 说明 |
|------|---------|------|
| key / label / type | of(key, label, type) | 参数键（params 中的 key）、表单中文名、控件类型 |
| required | required() | 必填 |
| requiredWhenKey / requiredWhenValue | requiredWhen(key, value) | 条件必填：params[key] == value 时必填 |
| defaultValue | defaultValue(v) | 默认值（前端表单空值时填充展示，落库为该值） |
| min / max | range(min, max) | NUMBER 范围 |
| options | options(Option...) | SELECT 选项（value 落库，label 展示） |
| placeholder / help | placeholder(v) / help(v) | 输入提示与说明 |

**控件类型（NodeParamType）**：`TEXT` / `NUMBER` / `BOOLEAN` / `SELECT` / `DATETIME` / `CRON` / `KEY_VALUE` / `JSON`。

**校验行为**：DagValidator 在保存与发布时按定义校验（必填/条件必填/NUMBER 范围/CRON 可解析/DATETIME/SELECT 选项/KEY_VALUE 结构）；params 中 schema 未声明的自由键不拦截，可自由扩展。

## 配置项（dag.*）

| 配置 | 默认值 | 说明 |
|---|---|---|
| dag.enabled | true | 引擎开关（调度器/Worker/监听器），false 时仅 REST 可用 |
| dag.scheduler.interval-ms | 5000 | 轮询兜底间隔 |
| dag.scheduler.batch-size | 20 | 单轮单实例最多领取任务数 |
| dag.worker.threads | CPU*2 | 执行线程池大小 |
| dag.lease.fixed-ms | 120000 | 租约兜底时长 |
| dag.channel | auto | auto=事件唤醒+轮询兜底 / db=仅轮询 / pubsub=仅事件 |
| dag.demo-enabled | false | demo handler 注册开关（见下） |
| dag.trigger.enabled | true | START 节点时间驱动触发器开关 |
| dag.trigger.interval-ms | 30000 | 时间驱动触发器轮询间隔 |
| dag.log.max-chars | 8000 | 单节点过程日志缓冲上限（字符数），超出丢弃并标记截断 |
| dag.log.flush-interval-ms | 3000 | 过程日志定时落库间隔 |

## 内置 Handler

### 系统 Handler（SYSTEM，永久生效）

`handler/system` 包内置 4 个系统 handler，无条件注册（不受 `dag.demo-enabled` 影响），category=SYSTEM。START/END/BRANCH 节点统一走 worker 执行链路；存量流程版本（特殊节点无 handler）由调度器领取后直达成功兼容。

| nodeCode | 名称 | 说明 | 入参 | 输出 |
|---|---|---|---|---|
| system-start | 系统-开始节点 | 透传入参供下游 `${out.<node>.*}` 引用；支持时间驱动；参数定义 triggerType/cron/triggerParams | 节点 params | 入参透传 |
| system-end | 系统-结束节点 | 直接成功 | 任意 | `{}` |
| system-branch | 系统-分支节点 | 出边条件求值明细（launch 时 branches 快照进 inputParams；下游就绪判断逻辑不变） | branches（toCode→whenExpr，launch 自动写入） | `{branches: {toCode: bool}, selected: [toCode]}` |
| system-timer | 系统-定时器 | 等待到点后成功（分片 sleep + 协作式中断），全局定时器节点无需业务实现；参数定义 delayMs/delayUntil | delayMs（0~86400000）/ delayUntil（ISO-8601） | `{waitedMs, targetTime}` |

#### 开始节点时间驱动

START 节点 params 配置触发方式（缺省 MANUAL 手动发起）：

```json
{"triggerType": "TIMER", "cron": "0 0 2 * * *", "triggerParams": {"bizKey": "value"}}
```

- `DagTriggerScheduler` 轮询 PUBLISHED 流程版本（`dag.trigger.interval-ms`），cron（Spring 6 域）到点自动发起实例
- 无 TIMER 触发的流程按 dagVersion 负缓存，仅版本变更时重新加载
- 幂等：traceCode = `TIMER-{dagCode}-v{version}-{触发时间}`，同一触发点仅发起一个实例；Redis 锁防集群竞争
- 语义：停机期间错过的历史槽位不补触发，仅补触发最近一个到期槽位；触发状态内存态，重启自动重建
- `dag.enabled=false` 或 `dag.trigger.enabled=false` 时触发器不运行，手动发起不受影响
- 校验：triggerType=TIMER 时 cron 必填且可解析（DagValidator）

### Demo Handler（DEMO，可选）

`handler/demo` 包内置 6 个演示 handler（category=DEMO），`dag.demo-enabled=true` 时注册到设计器 handler 列表，默认关闭不注册（业务接入时不注册 demo 节点）。

| nodeCode | 名称 | 入参 | 输出 |
|---|---|---|---|
| demo-log-print | 演示-日志打印 | 任意 | `{echo: 入参}` |
| demo-delay | 演示-延时 | ms（默认 1000，上限 300000） | `{sleptMs}`；演示协作式中断 |
| demo-transform | 演示-数据转换 | 任意 | 入参合并 + `processedAt` |
| demo-http-call | 演示-HTTP调用 | url（必填）、method、headers、body | `{status, body}`（body 截断 2000 字符） |
| demo-script-exec | 演示-JS脚本 | script（定义 `handle(input)`）、input（缺省为全部入参） | handle 返回对象原样输出，标量包装为 `{result}` |
| demo-fail | 演示-可控失败 | failTimes（前 N 次失败，缺省 0）、msg（缺省 simulated failure） | 前 N 次 `{attempt, msg}` 失败进入 RETRYING，之后 `{attempt, msg: success}` 成功并回填 trace_code；演示显式失败、过程日志与 trace 回填 |

GraalJS 依赖为 optional，classpath 缺失时 `demo-script-exec` 自动跳过注册；GraalJS 版本须与运行 JDK 匹配（23.x 不兼容 JDK 25）。

## 前端接入

前端为独立工程 `sh-dag-ui`（Vue 3 + Vite + Element Plus + AntV X6 + Monaco Editor，appCode=dag），通过 `/handler/list`、流程/版本与实例 REST 接口与后端交互，可独立部署或并入管理端。

| 页面/组件 | 说明 |
|------|------|
| DagProcessList | 流程分页列表（一条流程一条记录：聚合状态 编辑中/已发布、最新版本列；查询/新建/设计/历史版本；无草稿时以最新已发布版本为底稿打开设计器，保存/发布按钮位于设计器弹窗底部） |
| DagDesigner | 纯设计器（左信息栏[编码/必填名称] / 左 handler 面板 / 中画布[左右/上下布局悬浮按钮] / 右属性面板），保存/发布/关闭按钮位于设计器弹窗底部 |
| VersionHistoryDialog | 版本历史弹窗：流程全部版本列表（草稿显示「草稿」、发布版本显示 vN），「查看」打开全屏只读画布回看历史版本 |
| DagGraph | X6 画布封装：节点左右端口磁吸连线（仅 out→in）、拖动坐标实时回写、拖入与连线均为增量操作；readonly 模式节点保持类型配色，执行状态经右上角标圆点 + 中文状态文字呈现 |
| NodeParamsEditor / ParamsKeyValue / ExpressionEditor | 按 paramSchema 渲染参数表单（表单/JSON 双模式）、KEY_VALUE 编辑器、分支表达式编辑器 |
| DagInstanceList | 实例分页列表（查询/发起/详情/终止），状态中文展示，不做定时刷新（关闭详情弹窗后刷新） |
| DagInstanceDetail | 实例详情：节点七态色板着色 + 画布状态图例，点击节点经气泡展示概要与干预操作（中断/跳过/重置/重跑） |
| NodeDetailDrawer | 执行记录时间线弹窗（事件枚举中文展示） |

接入方式：将 sh-dag-ui 构建产物按独立应用部署，或复制 `src/views/dag` 与 `src/api` 目录下的组件/接口封装到现有管理端工程，菜单指向流程列表与实例列表页面即可。组件按目录组织：designer/（设计器与属性面板）、monitor/（实例列表/详情/执行记录）、history/（版本历史）。
