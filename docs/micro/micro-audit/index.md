# 数据变更审计服务

Micro-Audit 是数据变更审计微服务模块，基于 Spring Boot 实现，提供 INSERT/UPDATE/DELETE 三类数据变更记录的采集、存储与查询能力。采用编程式 AuditApi 接口接入（无需 @AuditLog 注解），变更数据以 JSON 快照（dataFrom/dataTo）形式存储，支持字段级新旧值对比、批次号聚合以及分页/关键字查询等企业级功能。Maven 坐标为 `com.wkclz.microapp:micro-audit`。

## 功能特性

- **INSERT/UPDATE/DELETE 变更记录**：提供 `create` / `modify` / `delete` 三类编程式审计 API，分别记录新增、修改、删除操作，操作类型持久化为 INSERT / UPDATE / DELETE
- **JSON 快照存储**：变更数据以 JSON 快照形式存储，INSERT 记录目标快照（dataTo），DELETE 记录原快照（dataFrom），UPDATE 记录修改前后双快照（dataFrom/dataTo）
- **字段级新旧值对比（ChangeLogItem）**：查询变更详情时自动对比 dataFrom/dataTo 快照，输出字段级差异（列名、列描述、旧值、新值）
- **批次号**：支持自定义批次号（batchNo）将一次业务操作的多条变更记录关联为同一批次；未指定时由 RedisIdGenerator 生成 `audit_` 前缀的批次号
- **分页/关键字查询 REST 接口**：提供变更记录分页查询与详情 REST 接口，支持批次号、表名、数据 ID、操作类型、操作人、时间范围以及关键字（dataFrom/dataTo 模糊匹配）查询

## 适用场景

- 数据变更追溯：定位任意数据在指定时间段内的全部变更历史
- 操作审计：记录关键数据的增删改操作，满足合规审计与责任追踪需求
- 字段级历史对比：查看某条记录每次修改前后的字段级差异

## 技术栈

- Java 25
- Spring Boot
- MyBatis
- Redis
- Fastjson2

## 快速导航

- [功能集成](./integration) - 了解如何集成到项目中
- [设计思路](./design) - 了解架构设计和核心原理
- [功能使用](./usage) - 详细的功能使用示例
