# 单点登录启动器

IAM-SSO-Starter 是单点登录服务的独立启动模块。

## 功能特性

- 独立部署：可作为独立认证服务
- 多应用支持：支持多个应用接入
- 登录页面：内置登录界面
- 回调处理：支持多种回调方式

## 快速开始

### 启动服务

```bash
java -jar iam-sso-starter.jar
```

### 配置应用

```yaml
iam:
  sso:
    apps:
      - appId: app1
        appSecret: secret1
        callbackUrl: http://app1.com/callback
```
