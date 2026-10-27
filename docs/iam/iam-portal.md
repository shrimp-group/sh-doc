# 门户登录

IAM-Portal 是权限系统的门户登录模块，定位为登录/个人中心，提供统一登录、注册与个人中心能力。

## 功能特性

- 统一登录：密码登录，支持图形验证码
- 登出与 Token 刷新
- 忘记/重置密码
- 用户注册与注册验证
- 用户信息与菜单树（含若依菜单树适配）
- 个人中心：修改密码、绑定手机/邮箱、登录记录、操作记录
- 门户数据：首页数据、公告、统计、待办

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-portal</artifactId>
</dependency>
```

依赖 `iam-common`（实体、常量）与 `iam-session`（会话管理、JWT Token）。

### 配置说明

在 `application.yml` 中配置：

```yaml
iam:
  login:
    public-key: ""   # 密码传输加密公钥（前端加密密码用）
    private-key: ""  # 密码传输解密私钥（后端解密密码用）
  portal:
    password:
      expire-days: 180        # 密码有效期（天），0 表示不过期
    max-concurrent-sessions: 0
    password-history-size: 5  # 密码历史记录数，新密码不能与最近 N 次历史密码相同
```

- `private-key` 非空时，登录与修改密码接口对超过 32 位的密码字段执行 RSA 私钥解密
- `password.expire-days` 以密码最后修改时间计算，登录时校验，过期则拒绝登录

## 扩展点

### SPI

- `CredentialChecker`：凭证校验 SPI，按用户名与原始密码返回校验结果。默认实现 `DefaultCredentialChecker`，校验顺序为 存在 → 禁用 → 锁定 → 认证禁用 → 密码匹配 → 密码过期；旧格式密码（`{MD5}`/无前缀）登录成功后自动升级为 `{PBKDF2}` 存储
- `PasswordEncoder`：密码编码器 SPI，提供 `encode(rawPassword, salt)` 与 `matches(rawPassword, salt, encodedPassword)`。默认实现 `Pbkdf2PasswordEncoder`

### 事件

通过 Spring 事件机制发布，`@EventListener` 订阅：

- `LoginEvent`：登录事件，以 `Type`（SUCCESS/FAILED）区分结果；成功时携带 `token`、`userCode`，失败时携带 `loginStatus`
- `LogoutEvent`：登出事件，携带 `username` 与脱敏后的 `maskedToken`
- `PasswordChangedEvent`：密码修改事件，携带 `userCode`
