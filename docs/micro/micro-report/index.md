# 报表服务

Micro-Report 是低代码报表微服务模块，基于 Spring Boot 实现，提供以「报表编码 + SQL 数据脚本」为核心的报表定义、查询与导出能力。用户在管理端编写 SQL 查询脚本并配置入参与结果字段元数据，执行端即可动态渲染查询表单、执行查询并导出 Excel，新增或调整报表无需修改代码与发版。Maven 坐标为 `com.wkclz.microapp:micro-report`。

## 功能特性

- **报表定义**：以 `reportCode`（报表编码，唯一）+ `reportScript`（SQL 查询脚本）定义报表数据来源，支持 `resultType` 返回类型、`enableFlag` 启用状态、Count 脚本开关与自定义 COUNT 脚本、自动驼峰转换开关
- **参数配置**：报表入参的字段编码、字段类型（string/number/date/datetime）、表单类型、输入提示、必填、JS 校验脚本（validateScript）、字典类型与列表宽度配置，支持从 SQL 自动提取
- **结果字段配置**：结果字段的编码、名称、类型、展示类型与列宽配置，支持从 SQL 自动提取（JSqlParser 解析 SELECT 列）
- **三种返回形态**：OBJECT（单对象，结果超一条报错）/ LIST（列表）/ PAGE（分页，支持自定义 COUNT 脚本或自动生成）
- **查询与导出**：提供报表选项列表、详情元数据、动态查询 REST 接口，并基于 EasyExcel 按结果字段定义导出自适应列宽的 Excel
- **历史版本与缓存**：报表定义每次新增/修改自动写入历史表（ReportDefinitionHis）；报表定义内存缓存，经 Redis Pub/Sub 广播多节点刷新

## 适用场景

- 运营数据自助查询：业务与运营人员无需开发介入，通过已定义的报表自助查询业务数据
- 动态报表免发版：新增或调整报表仅需维护 SQL 脚本与参数/结果元数据，无需修改代码、无需发版
- 数据导出：按结果字段配置导出 Excel，用于线下分析、汇报与对账

## 技术栈

- Java 25
- Spring Boot
- MyBatis
- Redis
- Druid SQL Parser / JSqlParser
- EasyExcel

## 快速导航

- [设计思路](./design) - 了解架构设计和核心原理
- [功能集成](./integration) - 了解如何集成到项目中
- [使用指南](./usage) - 详细的功能使用示例
