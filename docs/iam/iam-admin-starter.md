# 后台启动器

IAM-Admin-Starter 是管理后台的独立启动模块，将 iam-admin 以独立微服务方式运行。

- 依赖坐标：`com.wkclz.iam:iam-admin-starter`（仅启动用途，install / deploy 已跳过）
- 主类：`com.wkclz.iam.admin.starter.IamAdminApplication`（`@SpringBootApplication`）
- 依赖模块：仅依赖 `iam-admin`，传递引入 iam-portal 及框架模块

## 快速开始

### 打包

```bash
mvn clean package -DskipTests -pl iam-admin-starter -am
```

`spring-boot-maven-plugin` 产出可执行 jar（`target/iam-admin-starter-*.jar`）。

### 启动

```bash
java -jar iam-admin-starter/target/iam-admin-starter-*.jar
```

- 服务端口：`8080`
- 管理端口：`50000`（Actuator 独立端口，暴露全部 endpoints，健康检查开启 probes）

## 配置骨架

`src/main/resources/config/application.yml`（敏感信息以 `<占位符>` 标注，按环境注入）：

```yaml
server:
  port: 8080

spring:
  application:
    name: iam-admin-starter
  profiles:
    active: local
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    # 连接地址 / 账号 / 密码：<数据库连接信息>，不入仓库，由部署编排或环境变量注入
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
    ssl:
      enabled: false
  metrics:
    tags:
      application: ${spring.application.name}
  endpoint:
    health:
      showDetails: always
      probes:
        enabled: true
    shutdown:
      enabled: true
    restart:
      enabled: true
```

- 日志配置：`logback-spring.xml`
- 业务侧配置（`iam.api.scan.*`、Redis、权限缓存等）见各模块文档
