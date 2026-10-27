# 会话模块

IAM-Session 是权限系统的会话与鉴权基础模块，为应用提供会话管理、Token 认证与请求控制能力。SDK 性质，业务应用引入依赖后自动装配。

## 功能特性

- 会话管理：会话的创建、校验、滑窗续期、销毁，支持并发会话控制（超限踢出最早会话）
- JWT Token：HS256 签发与校验，claims 仅含最小信息集（userCode / username / nickname / jti）
- 会话认证过滤器：SessionAuthFilter 完成身份识别与准入判断，白名单路径放行，未认证返回 401
- 请求控制：API 级开关、互斥锁（RedisLock）与滑动窗口限流，拒绝时返回 429
- 请求记录：RequestRecordFilter 采集请求日志，通过 SPI 持久化
- AK 签名：服务间调用的防篡改与防重放校验
- 远程门面：SsoFacade 远程调用门户认证服务（保存请求日志、登出）

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-session</artifactId>
</dependency>
```

模块依赖框架模块 sh-core、sh-redis、sh-web，会话数据存储于 Redis。

### 配置说明

在 `application.yml` 中配置：

```yaml
iam:
  session:
    token:
      secret-key: ""        # JWT 签名密钥（HS256，最低 32 字符）
      ttl: 172800           # Token 有效期（秒），默认 48h
    white-list: ""          # 扩展白名单路径（Ant 风格，逗号分隔）
    max-concurrent: 0       # 同一用户最大并发会话数，0 不限制
    redis-ttl: 86400        # Redis Session 初始 TTL（秒），默认 24h
    renewal:
      threshold: 1800       # 续期阈值（秒），剩余 TTL 低于该值触发续期，默认 30min
      interval: 300         # 续期间隔（秒），同一会话在该时长内不重复续期，默认 5min
  request-control:
    enabled: true           # 请求控制全局开关（API 级开关默认关闭，需在 API 管理页面显式开启）
    mutex:
      timeout-seconds: 30   # 互斥锁默认超时（秒）
    rate-limit:
      window-seconds: 60    # 限流统计窗口（秒）
      max-requests: 100     # 窗口内最大请求次数
```

- 默认白名单 `/**/public/**`，`iam.session.white-list` 仅作扩展追加
- Token 通过请求头 `Authorization: Bearer <token>` 或 `token: <token>` 传递

## 扩展点（SPI）

模块通过 SPI 支持上层扩展，三个接口均有 NoOp 默认实现，未提供自定义实现时静默跳过：

| 接口 | 用途 |
| ---- | ---- |
| SessionEventListener | 会话生命周期事件监听（创建 / 销毁 / 过期），用于审计日志等扩展 |
| ApiRequestControlProvider | 提供 API 请求控制配置，由上层模块实现（如查询 iam_api 表），需标注 `@Primary` 覆盖默认空实现 |
| RequestRecordHandler | 请求日志持久化，建议实现方异步处理以免阻塞请求链路 |

## API 签名

API 签名用于服务间调用的防篡改与防重放校验，由 `AkSignHelper` 实现签名的生成与验签：客户端按约定生成签名并附加到请求，服务端完成校验后放行。

### 安全措施

| 措施 | 说明 |
| ---- | ---- |
| timestamp | 请求方时间戳，服务端校验有效期（5 分钟），超时直接拒绝，防止请求参数被无限期复用 |
| nonce | 请求方每次生成的随机数，服务端以 Redis SETNX 做一次性校验，重复 nonce 判定为重放攻击；缓存有效期与 timestamp 保持一致 |
| 加密 | 签名串经 RSA 私钥加密传输，服务端用公钥解密后校验，防止篡改 |
| 其他 | 白名单、黑名单、限流、熔断、降级 |

### 功能设计

- 管理后台维护 access_token 信息，包含 app_id、app_secret 及密钥对
- access_token 信息缓存至应用内，网关或拦截器中提取签名并完成各项校验
- 客户端请求时计算并附加签名信息

### 签名约定

客户端生成签名（`AkSignHelper#sign`）：

1. 生成 timestamp（毫秒时间戳）与 nonce（`MD5(UUID + timestamp)`）
2. appId、nonce、timestamp 三个参数按 key 升序拼接为 `appId=xxx&nonce=xxx&timestamp=xxx`，空值不参与签名
3. 使用 RSA 私钥（appSecret）对拼接串加密，密文作为 sign，请求同时携带 app-id 请求头

服务端验签（`AkSignHelper#verifySign`）：

1. RSA 公钥解密签名，解析出 appId / nonce / timestamp
2. 校验签名中的 appId 与请求头 app-id 一致
3. 校验 timestamp 在 5 分钟有效期内
4. Redis SETNX 校验 nonce 一次性（Key 前缀 `iam:ak:nonce:`，TTL 5 分钟），防止重放

```java
// 客户端：生成签名
String sign = AkSignHelper.sign(appId, appSecret);

// 服务端：验签，通过返回 true，失败抛 ValidationException
akSignHelper.verifySign(sign, publicKey, expectedAppId);
```

RSA 加解密实现见后端框架 `RsaTool#encryptByPrivateKey` / `RsaTool#decryptByPublicKey`。
