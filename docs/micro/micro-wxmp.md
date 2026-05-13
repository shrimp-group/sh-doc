# 微信公众号

Micro-WxMp 是微信公众号微服务模块，提供微信公众号服务端功能。

## 功能特性

- 消息处理：接收和响应微信消息
- 菜单管理：自定义菜单管理
- 用户管理：粉丝用户管理
- 素材管理：图文素材管理

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-wxmp</artifactId>
</dependency>
```

### 配置公众号

```yaml
wx:
  mp:
    appId: xxx
    secret: xxx
    token: xxx
```
