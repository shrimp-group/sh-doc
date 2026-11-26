# 门户登录界面

IAM-Portal-UI 是门户登录的前端界面（package name：`sh-portal-ui`，当前版本 3.9.1），门户自持登录页的 SPA 应用。

## 技术栈

- Vue 3.5.16 + vue-router 4.5.1
- Vite 6.3.5
- Element Plus 2.10.7（含 @element-plus/icons-vue）
- Pinia 3.0.2
- @sh/ui-core ^0.0.30（应用装配、Layout、请求、鉴权、错误页等共享层）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务
npm run dev

# 生产构建
npm run build

# 预发构建
npm run build:stage
```

## 页面清单

| 页面 | 路由 | 说明 |
| ---- | ---- | ---- |
| views/login.vue | `/login` | 登录页，登录/改密双模式（见下文登录流程） |
| views/register.vue | `/register` | 注册页，提交后发送注册邮件 |
| views/dashboard/index.vue | `/index` | 首页落地，登录回跳 `/#/` 命中 |
| views/portal/index.vue | 门户首页数据 | 页面就绪，数据接口预留 |
| views/portal/notices.vue | 门户公告 | 页面就绪，数据接口预留 |
| views/portal/statistics.vue | 门户统计 | 页面就绪，数据接口预留 |
| views/portal/todo-list.vue | 门户待办 | 页面就绪，数据接口预留 |
| views/user/profile/index.vue | `/user/profile/:activeTab?` | 个人中心，基本资料/修改密码两个 tab |
| views/user/change-password.vue | 修改密码 | 调 `/iam-portal/user/change-password` |
| views/user/login-records/index.vue | 登录记录 | 页面就绪，数据接口预留 |
| views/user/operate-logs/index.vue | 操作日志 | 页面就绪，数据接口预留 |

路由由 `src/router/index.js` 维护：`/login`、`/register` 为门户自持免登录路由，401/404 兜底页与 `/redirect` 由 @sh/ui-core 内置；`/` 重定向 `/index`。应用装配入口 `src/main.js` 调用 `createAdminApp`，白名单 `whiteList: ['/login', '/register']`，菜单来源 `menuSource: 'remote'`。

## 登录流程要点

登录页 `login.vue` 的关键行为：

- **验证码按失败展示**：默认不展示验证码；仅登录失败（后端正常响应且 `loginStatus≠0`）或接口异常时拉取并展示；改密模式下验证码恒显，失败/异常即刷新
- **RSA 加密密码**：提交前经 `@sh/ui-core` 的 `encrypt` 加密，登录与改密的新旧密码均加密传输，配合后端私钥解密
- **密码过期自助改密**：`loginStatus=48` 时提示「密码已过期，请修改密码后登录」并展示改密入口，点击切换改密模式，改密成功后回登录模式保留用户名
- **Token 写父域 Cookie**：登录成功取 `res.data.token` 经 `setToken` 写入，供同父域各子系统共享登录态
- **redirect 安全回跳**：成功后 600ms 按 `safeTarget(redirect)` 回跳；站内相对目标走路由跳转，跨站/绝对目标整页跳转；已持有登录态时直接回跳，避免重复登录
- **动态标题与背景**：挂载时按 redirect 解析目标应用编码（绝对 URL 取域名首段，回退 `portal`），调 `app-info` 更新页面标题与登录背景，失败静默回退

后端依赖接口：`/iam-portal/public/sso/login`、`/public/sso/reset-password`、`/public/captcha/chart`、`/public/sso/app-info`、`/public/sso/register`、`/user/info`、`/user/change-password`。

## env.js 配置

`src/env.js` 导出运行时环境，供 @sh/ui-core 注入：

| 导出项 | 值/规则 |
| ---- | ---- |
| appCode | `portal`（门户应用编码） |
| name | 单点登录（页面默认标题） |
| env | 依域名推导：127.0.0.1/localhost → local；`.dev.`/`.sit.`/`.uat.` 对应环境；默认 prod |
| envSuffix | 非 prod 环境追加 `【ENV】` 标识，prod 为空 |
| baseApi | local 为 `/api`；未显式配置且域名访问时，取当前域名首段替换为 `api`（地址推导）；localhost/IP 访问需显式配置或用 mock |
| portal | 空串——门户自身即登录上游，guard 无 token 时走 SPA 内导航 `/login`，`redirectToLogin` 兜底拼相对 `/#/login` |
| mock | localStorage `mock-api` 优先级最高，覆盖 baseApi |

## 构建部署

- `npm run build` 产出生产包，`npm run build:stage` 产出预发包（staging 模式）
- 生产环境无需配置 baseApi，按域名首段推导 API 地址；本地联调可用 `/api` 代理或 localStorage 注入 mock 地址
