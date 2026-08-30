# 序列号生成服务

Micro-Seq 是序列号生成微服务模块，基于 Spring Boot + MyBatis 实现，提供分布式环境下唯一、有序的序列号（编码）生成能力。采用编程式 `SeqApi` 接口接入（无需注解），支持单号/批量生成、前缀 + 左补零格式化，并通过 `SERIALIZABLE` 事务隔离 + `synchronized` 同步 + 乐观锁三重机制保证并发下序列号不重复。内置序列规则的 REST 查询/更新接口，便于维护与管理。Maven 坐标为 `com.wkclz.microapp:micro-seq`。

## 功能特性

- **编程式 SeqApi 接入**：提供 `genSequence` / `genSequences` 编程式 API，无需任何注解，业务代码直接调用即可获得序列号；`genSequence` 单号生成（序列长度缺省 4），`genSequences` 支持批量生成（指定 size 一次返回多号）
- **前缀 + 左补零**：生成结果由「前缀 + 数字序列」组成（如 `ORDER` + 6 位左补零 → `ORDER000001`），数字部分按序列长度 `codeLength` 左补零，长度不足时自动补齐
- **并发防重三重保障**：核心生成方法采用 `@Transactional(isolation = Isolation.SERIALIZABLE)` 事务 + `synchronized` 方法同步 + 乐观锁（`version` 版本号）三重机制，更新序列失败（影响行数为 0）时抛出异常、放弃本次生成，杜绝序列重复
- **序列自动初始化**：首次按前缀生成时自动创建序列记录（当前序列从 0 开始），`seqName` 未指定时缺省取前缀；后续生成基于已持久化的当前序列递增
- **序列规则管理**：序列名称 `seqName`、前缀 `prefix`、当前序列 `sequence`、序列长度 `codeLength` 持久化于 `mdm_sequence` 表，前缀唯一（`duplicateCheck` 防重校验）
- **REST 查询/更新接口**：提供序列规则的 REST 接口，支持分页查询（`GET /micro-seq/sequence/page`）、详情（`GET /micro-seq/sequence/info`）、修改（`POST /micro-seq/sequence/update`）
- **自动装配**：`SeqAutoConfig` 自动扫描 `com.wkclz.micro.seq` 包下的 Mapper 与组件，引入依赖即可使用

## 适用场景

- 业务单号/编码生成：订单号、流水号、业务单据号等需要唯一且有序的编码
- 多实例并发场景：多线程、多服务实例下需要保证序列号不重复的高并发生成
- 统一编码格式：通过「前缀 + 定长左补零」生成格式统一、可读性强的业务编码

## 技术栈

- Java 25
- Spring Boot
- MyBatis
- Lombok
- Swagger（OpenAPI 注解）

## 快速导航

- [功能集成](./integration) - 了解如何集成到项目中
- [设计思路](./design) - 了解架构设计和核心原理
- [功能使用](./usage) - 详细的功能使用示例
