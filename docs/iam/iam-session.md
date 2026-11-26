# 会话模块

IAM-Session 是权限系统的会话与鉴权基础模块，为应用提供会话管理、Token 认证与请求控制能力。SDK 性质，业务应用引入依赖后自动装配。

## 功能特性

- 会话管理：会话的创建、校验、滑窗续期、销毁，支持并发会话控制（超限踢出最早会话）
- JWT Token：HS256 签发与校验，claims 仅含最小信息集（userCode / username / nickname / jti）
- 会话认证过滤器：SessionAuthFilter 完成身份识别与准入判断，本地白名单与 DB 白名单放行，未认证返回 401
- 请求上下文：每次请求将请求头 `app-code` / `tenant-code` 注入 IdentityContext，供请求控制与业务代码使用
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
      secret-key: "<your-jwt-secret-key>"  # JWT 签名密钥（HS256，最低 32 字符），源码仅内置开发用默认值，生产必须显式配置
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

## 会话认证与请求上下文

SessionAuthFilter（`@Order(LOWEST_PRECEDENCE - 5)`，位于 RequestRecordFilter 之后、RequestControlFilter 之前）按以下流程处理每个请求：

1. **上下文注入**：无条件从请求头 `app-code`、`tenant-code` 读取并写入 IdentityContext，供请求控制与业务代码使用
2. **身份识别**：提取 Token 并做完整会话验证（JWT 有效 + Redis 会话存在），成功后写入用户身份；验证失败不阻断，继续白名单判断
3. **准入判断**：
   - 本地白名单（WhiteListMatcher）命中 → 放行；无有效会话时尽力解析 Token claims 填充身份，仅供审计日志，不作为准入依据
   - DB 白名单命中 → 免登录放行
   - 其余请求须持有有效会话，否则返回 401

DB 白名单（`iam_api.write_flag=1` 的接口，免登录且免接口权限校验）：

- 判定资源键（ownerKey）：配置了 `iam.session.app-code` 时按该应用资源判定，未配置时按全局资源（`__GLOBAL__`）判定
- 白名单数据随应用静态资源缓存加载，精确 URI 走 O(1) 索引，含通配符的 URI 走 Ant 遍历匹配
- fail-closed 于豁免：判定链路异常时视为非白名单，继续走正常鉴权链路

## 扩展点（SPI）

模块通过 SPI 支持上层扩展，各接口均有 NoOp 默认实现，未提供自定义实现时静默跳过：

| 接口 | 用途 |
| ---- | ---- |
| SessionEventListener | 会话生命周期事件监听（创建 / 销毁 / 过期），用于审计日志等扩展 |
| AuthResourceFacade | 权限资源供给（角色 / 菜单 / 接口 / 请求控制配置），权限缓存的数据源；需标注 `@Primary` 覆盖默认空实现，未覆盖时权限判断退化为全放行 |
| RequestRecordHandler | 请求日志持久化，建议实现方异步处理以免阻塞请求链路 |

> API 级请求控制配置（互斥 / 限流）不再是独立 SPI，由 AuthResourceFacade 供给的应用静态资源（iam_api 表配置）承载。

### 会话事件

SessionManager 在会话生命周期节点通过 Spring 事件机制发布统一的 `SessionEvent`（内部 `Type` 区分类型），可用 `@EventListener` 或 `ApplicationListener` 直接消费：

| Type | 触发时机 | 事件载荷 |
| ---- | ---- | ---- |
| CREATED | 会话创建成功 | session（含 sessionId / subjectId / token 等） |
| DESTROYED | 主动登出、改密、禁用等销毁 | sessionId / subjectId / reason（DestroyReason） |
| EXPIRED | Redis 会话过期被清理 | sessionId / subjectId |

`SessionEventListener` SPI 是上述事件的回调式封装（onCreated / onDestroyed / onExpired），与直接监听 `SessionEvent` 择一使用即可。模块内置监听器 AuthCacheSessionCleaner 会在用户最后一个会话终结（DESTROYED / EXPIRED）时清理其权限缓存，业务无需重复注册。

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
