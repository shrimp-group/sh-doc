# 门户登录

IAM-Portal 是权限系统的门户登录模块，定位为登录/个人中心，提供统一登录、注册与个人中心能力。管理端各子系统未持有登录态时，整页跳转到门户登录页，登录成功后携带 `redirect` 回跳。

## 功能特性

- 统一登录：密码登录，RSA 加密传输，验证码按失败情况启用（1 小时内有失败记录则强制验证码）
- 密码过期自助改密：免登录态公开接口，凭用户名 + 旧密码 + 图片验证码建立身份信任
- 登出与登出事件
- 用户注册与注册验证（路由预留，接口见下方路由表标注）
- 用户信息与菜单树（含若依菜单树适配）
- 个人中心：修改密码、绑定手机/邮箱、登录记录、操作记录（路由预留）
- 门户数据：可访问应用列表；首页数据、公告、统计、待办（路由预留）
- 权限资源远程取数：供 iam-session 远程形态经 HTTP 拉取权限资源与变更指令（`auth-token` 头鉴权）
- 防用户名枚举：用户不存在与密码错误对外统一返回 `用户名或密码错误`，审计记录仍如实区分

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-portal</artifactId>
</dependency>
```

依赖 `iam-common`（实体、DTO、工具）与 `iam-session`（会话管理、JWT Token、权限服务），并依赖框架模块 sh-mybatis、sh-redis、sh-web 与 micro-dict。

### 配置说明

在 `application.yml` 中配置：

```yaml
iam:
  login:
    public-key: ""     # 密码传输加密公钥（前端 RSA 加密密码用）
    private-key: ""    # 密码传输解密私钥（后端解密密码用）
  portal:
    password:
      expire-days: 180        # 密码有效期（天），0 表示不过期，以密码最后修改时间计算
    max-concurrent-sessions: 0  # 门户侧并发会话上限，0 不限制（当前版本预留，登录链路未消费）
    password-history-size: 5    # 密码历史记录数，新密码不能与最近 N 次历史密码相同
    auth:
      token: ""                # 权限资源远程取数共享密钥（请求头 auth-token 比对），未配置时取数接口一律 401
    super-users: root          # super 用户编码列表（逗号分隔），取角色时返回哨兵角色，视为拥有应用内全部角色
```

- `private-key` 非空时，登录与修改密码接口对超过 32 位的密码字段执行 RSA 私钥解密
- `super-users` 按配置项 trim 后与 userCode 精确匹配，防御配置尾随空格导致的错判
- 登录成功后会话并发控制由 iam-session 承担（`iam.session.max-concurrent`），见会话模块文档

## 路由能力

路由前缀 `/iam-portal`，由 `Route` 接口统一定义。标注「预留」的常量已定义，当前版本未提供 Rest 实现。

| 分组 | 接口 | 说明 |
| ---- | ---- | ---- |
| public/认证 | POST `/public/sso/login` | 用户登录，返回 LoginResp（token、用户信息、loginStatus） |
| public/认证 | POST `/public/sso/reset-password` | 密码过期自助修改，免登录态，需图片验证码 |
| public/认证 | GET `/public/sso/logout` | 用户登出，销毁会话并发布 LogoutEvent |
| public/认证 | GET `/public/sso/app-info` | 登录页应用信息查询（params `appCode`），公开接口，仅返回应用名称与登录页背景图 |
| public/认证 | GET `/public/captcha/chart` | 获取图形验证码，返回 captchaId 与 base64 图片 |
| public/取数 | GET `/public/auth/app-resource` | 按应用加载静态资源（iam-session 远程形态，AK/token 鉴权） |
| public/取数 | GET `/public/auth/user-roles` | 按用户加载有效角色，super 用户返回哨兵角色 |
| public/取数 | GET `/public/auth/changes` | 拉取权限变更指令（每键最新） |
| 注册 | POST `/public/sso/register` | 注册（预留） |
| 注册 | POST `/public/sso/register/verify` | 注册验证（预留） |
| 用户信息 | GET `/user/info` | 获取当前登录用户信息 |
| 用户信息 | GET `/user/menu/tree` | 获取用户菜单树，请求头需携带 appCode |
| 用户信息 | GET `/user/menu/tree/ruoyi` | 获取若依格式菜单树（VueRouterMenu） |
| 用户信息 | POST `/user/change-password` | 修改密码，改密成功后全部会话失效 |
| 用户信息 | GET `/user/options` | 用户选择分页查询，仅启用用户；用户名/姓名模糊、性别精确；按用户名升序 |
| 个人中心 | POST `/user/update` | 更新用户资料（预留） |
| 个人中心 | POST `/user/bind-phone` | 绑定手机（预留） |
| 个人中心 | POST `/user/bind-email` | 绑定邮箱（预留） |
| 个人中心 | GET `/user/login-records` | 登录记录（预留） |
| 个人中心 | GET `/user/operate-records` | 操作记录（预留） |
| 门户数据 | GET `/portal/app-options` | 获取当前用户可访问应用列表 |
| 门户数据 | GET `/portal/index-data` | 门户首页数据（预留） |
| 门户数据 | GET `/portal/notices` | 公告（预留） |
| 门户数据 | GET `/portal/statistics` | 统计（预留） |
| 门户数据 | GET `/portal/todo-list` | 待办（预留） |

`/public/auth/**` 属会话白名单，鉴权由端点自身承担：请求头 `auth-token` 与配置 `iam.portal.auth.token` 比对，两者均非空且相等才放行，否则返回 401（fail-closed）。

## 登录状态码语义

登录响应 `LoginResp.loginStatus` 由 `LoginStatus` 枚举定义（参照 LDAP 返回码设计），前端登录页据此展示提示与改密入口：

| 状态码 | 含义 | 口径 |
| ---- | ---- | ---- |
| 0 | 登录成功 | 对外返回 |
| 47 | 账号锁定 | 对外返回 |
| 48 | 密码过期 | 对外返回，前端展示改密入口并切换改密模式 |
| 49 | 账号过期 | 对外返回（触发场景：认证方式禁用 authStatus=0） |
| 52 | 用户名或密码错误 | 对外返回，用户不存在与密码错误统一返回此状态，防用户名枚举 |
| 53 | 账号禁用 | 对外返回 |
| 54 | 验证码错误 | 对外返回 |
| 60 | 需要验证码 | 对外返回，1 小时内有登录失败记录且未提交验证码 |
| 31 | 密码错误 | 仅审计记录使用，不对外返回 |
| 32 | 用户不存在 | 仅审计记录使用，不对外返回 |
| 61 | 验证码超时 | 枚举定义，预留 |
| 51 | 登录尝试次数过多 | 枚举定义，预留 |
| 1 / 3 / 6 / 7 | 内部错误 / 网络错误 / 服务不可用 / 不支持的认证方法 | 枚举定义，预留 |

默认凭证校验 `DefaultCredentialChecker` 校验顺序严格：**存在 → 禁用 → 锁定 → 认证禁用 → 密码匹配 → 密码过期**；密码匹配成功后，旧格式密码（`{MD5}`/无前缀）自动升级为 `{PBKDF2}` 存储。

## 动态登录页（app-info）

登录页标题与背景来自 `GET /iam-portal/public/sso/app-info?appCode=<应用编码>`，仅返回 `appName` 与 `loginBgp`：

- 前端从 `redirect` 参数解析目标应用编码（绝对 URL 取域名首段，非法或缺省回退门户默认编码 `portal`）
- 拉取成功后标题显示 `<应用名称>-单点登录`（非 prod 环境追加环境后缀），背景图设置到登录容器
- 失败或未配置应用信息时静默回退默认标题，不阻塞登录

## 并发会话控制

- 配置项 `iam.portal.max-concurrent-sessions`（默认 0，不限制）已定义，当前版本预留，登录链路未消费
- 实际会话并发控制由 iam-session 的 `iam.session.max-concurrent` 承担，超限踢出最早会话，见会话模块文档
- 修改密码成功后该用户全部会话失效（销毁原因 `PASSWORD_CHANGED`），防止旧凭据继续使用

## 扩展点

### SPI

- `CredentialChecker`：凭证校验 SPI，按用户名与原始密码返回校验结果。默认实现 `DefaultCredentialChecker`，校验顺序见上文状态码章节
- `PasswordEncoder`：密码编码器 SPI，提供 `encode(rawPassword, salt)` 与 `matches(rawPassword, salt, encodedPassword)`。默认实现 `Pbkdf2PasswordEncoder`

### 事件

通过 Spring 事件机制发布，`@EventListener` 订阅：

- `LoginEvent`：登录事件，以 `Type`（SUCCESS/FAILED）区分结果；成功时携带 `token`、`userCode`，失败时携带 `loginStatus`（审计口径真实状态）
- `LogoutEvent`：登出事件，携带 `username` 与脱敏后的 `maskedToken`
- `PasswordChangedEvent`：密码修改事件，携带 `userCode`
