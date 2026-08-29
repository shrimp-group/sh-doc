# 框架简介


## 为什么需要框架

在现代 Java 后端开发中，直接使用原始的 Spring 或 Spring Boot 虽然灵活，但往往需要大量的重复配置和基础代码编写。为了提升开发效率、保证代码质量、统一技术标准，我们提供了这套基于 Spring 的后端基础框架。

该框架解决了以下问题：
- 减少重复性的配置工作
- 统一团队开发规范和技术标准
- 提供常用功能的最佳实践实现
- 加速项目启动和开发进程
- 提高系统的可维护性和可扩展性

## 框架组成

框架基于 Spring Boot 4.0.6 构建，要求 Java 25，当前版本为 5.0.1-SNAPSHOT。框架由以下 12 个模块组成：

### 1. sh-parent 父工程
- 统一管理项目的依赖版本
- 定义标准的构建配置
- 提供一致的插件管理

### 2. sh-bom 物料清单（BOM）
- 集中管理所有第三方依赖的版本信息
- 避免版本冲突问题
- 简化子项目的依赖声明

### 3. sh-tool 工具库
- 提供字符串、日期、JSON、Bean 操作等通用工具
- 提供 AES、DES、RSA、MD5、SHA、Base64 等加密工具
- 提供文件 IO、网络、雪花 ID、验证码、二维码等业务工具

### 4. sh-core 核心基础模块
- 定义统一的响应封装 R 与结果码 ResultCode
- 提供 BaseEntity 实体体系与异常体系
- 提供用户上下文 IdentityContext 与日志脱敏能力

### 5. sh-mybatis ORM 持久框架
- 提供 BaseMapper 通用 CRUD 与 BaseService 业务骨架
- 基于 SQL Provider 动态生成 SQL
- 内置查询、更新、审计拦截器与分页、表元数据能力

### 6. sh-spring Spring 扩展模块
- 提供 Spring 上下文全局持有器与雪花 ID 生成
- 提供邮件发送与 FreeMarker 模板渲染
- 提供敏感配置加解密能力

### 7. sh-dynamicdb 动态数据源
- 支持多数据源运行时动态添加、切换与销毁
- 内置数据源缓存与定时清理机制

### 8. sh-redis 缓存与分布式组件
- 提供 Redis 全数据类型缓存操作
- 提供分布式锁、ID 生成器与消息队列

### 9. sh-web Web 增强模块
- 提供全局异常处理与统一响应
- 提供请求、响应工具与标准请求响应 Bean
- 支持响应体用户名自动填充

### 10. sh-xxljob 任务调度
- 集成 XXL-Job 分布式任务调度
- 支持 @XxlJob 注解任务处理器

### 11. sh-mqtt 消息通信
- 提供 MQTT 消息收发能力
- 支持 @MqttController 注解驱动订阅与分发、SSL/TLS 认证与自动重连

### 12. sh-demo 示例模块
- 提供 Entity → Mapper → Service → VO → Controller 的 CRUD 标准范式演示

## 如何使用

使用本框架非常简单：

1. 在您的项目中继承 sh-parent 父工程
2. 引入所需的 Starter 依赖（如 sh-core、sh-mybatis、sh-web 等）
3. 根据需要配置相关参数
4. 直接使用框架提供的功能

通过这种模式，您可以快速搭建一个功能完备、符合最佳实践的 Java 后端应用，同时保持足够的灵活性以满足特定业务需求。
