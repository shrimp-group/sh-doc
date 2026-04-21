# 支付服务

Micro-Pay 是支付管理微服务模块，提供多渠道支付接入功能。

## 功能特性

- 多渠道支付：支持支付宝、微信支付
- 订单管理：支付订单统一管理
- 回调处理：支付回调统一处理
- 对账功能：支付对账支持

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-pay</artifactId>
</dependency>
```

### 配置支付

```yaml
pay:
  alipay:
    appId: xxx
    privateKey: xxx
  wxpay:
    appId: xxx
    mchId: xxx
```
