# 门户登录启动器

IAM-Portal-Starter 是门户登录服务的独立启动模块，可作为独立认证服务部署。

## 功能特性

- 独立部署：主类 `com.wkclz.iam.portal.starter.IamPortalApplication`，通过 spring-boot-maven-plugin 打包为可执行 jar
- 自动配置：依赖 `iam-portal` 即自动装配，开箱即用
- 健康检查：集成 Actuator，独立监控端口

## 快速开始

### 启动服务

```bash
java -jar iam-portal-starter.jar
```

### 默认端口

- 服务端口：8080
- 监控端口：50000（Actuator）
