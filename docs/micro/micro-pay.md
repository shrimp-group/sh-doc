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

## 渠道开通指引

### 支付宝渠道

- 用途：支持用户使用支付宝进行支付
- 对接方：支付宝开放平台（蚂蚁金服）
- 申请地址：<https://open.alipay.com/platform/home.htm>

申请通过后，获取以下配置项并入 `pay.alipay` 配置：

| 配置项 | 说明 |
|---|---|
| appId | 应用 ID |
| privateKey | 商户私钥 |
| alipayPublicKey | 支付宝公钥 |
| appPublicKey | 应用公钥 |
| gatewayUrl | 支付宝网关 |

### 微信支付渠道

获取以下基本信息并入 `pay.wxpay` 配置：

- `mchId`：微信支付商户号
- 商户密钥：V3 的支付密钥（一项证书，包含各项功能）

开通步骤：

1. 关联运营主体：关联公众号或小程序
2. 开通 JSAPI 支付
3. 配置支付授权目录，如 `https://h5.example.com/pay/`
