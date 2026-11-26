# 门户登录启动器

IAM-Portal-Starter 是门户登录服务的独立启动模块，将 iam-portal 聚合为可执行应用，作为独立认证服务部署。

## 功能特性

- 独立部署：主类 `com.wkclz.iam.portal.starter.IamPortalApplication`，通过 spring-boot-maven-plugin 打包为可执行 jar
- 自动配置：依赖 `iam-portal` 即自动装配（`IamPortalAutoConfig` 扫描 `com.wkclz.iam.portal` 包与 mapper），开箱即用
- 运维端点：集成 Actuator，暴露全部 Web 端点，`management.server.port` 配置为独立管理端口 50000

## 快速开始

### 依赖模块

仅依赖 `iam-portal`，传递引入 iam-common（实体、DTO、工具）与 iam-session（会话管理、Token 认证）。

### 打包与启动

```bash
# 打包（启动模块跳过 install 与 deploy）
mvn -pl iam-portal-starter -am package

# 启动
java -jar iam-portal-starter/target/iam-portal-starter-<版本>.jar
```

### 默认端口

- 服务端口：8080
- Actuator 管理端口：50000（`management.server.port` 独立端口配置，base-path `/`）

## 配置骨架

`src/main/resources/config/application.yml` 骨架（密钥与连接信息按占位符脱敏，部署时补充）：

```yaml
server:
  port: 8080

spring:
  application:
    name: iam-portal-starter
  profiles:
    active: local
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: <数据库连接串>
    username: <数据库用户名>
    password: <数据库密码>
  jackson:
    default-property-inclusion: non_null

mybatis:
  mapper-locations: classpath*:mapper/**/*.xml
  configuration:
    map-underscore-to-camel-case: true

pagehelper:
  helperDialect: mysql
  reasonable: true
  supportMethodsArguments: true
  params: count=countSql

management:
  endpoints:
    web:
      exposure:
        include: "*"
  server:
    port: 50000
    base-path: /
  endpoint:
    health:
      showDetails: always
      probes:
        enabled: true
```

业务配置（登录密钥、密码策略、远程取数 token 等）见门户登录模块文档的配置说明章节。
