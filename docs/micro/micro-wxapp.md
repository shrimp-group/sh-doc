# 微信小程序

Micro-WxApp 是微信小程序微服务模块，提供微信小程序服务端功能。

## 功能特性

- 登录认证：微信小程序登录
- 用户信息：获取用户信息
- 消息推送：模板消息推送
- 媒体管理：媒体文件管理

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-wxapp</artifactId>
</dependency>
```

### 配置小程序

```yaml
wx:
  miniapp:
    appId: xxx
    secret: xxx
```

### 申请测试号

- 沙箱地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/sandbox.html
- 申请后获取 AppID 和 AppSecret，填入上方配置
