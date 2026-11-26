# 后台界面

IAM-Admin-UI 是授权中心的管理后台前端（package name `sh-admin-ui`，版本 3.9.1），基于 Vue 3 + `@sh/ui-core` 构建。

## 技术栈

| 依赖 | 版本 | 说明 |
| ---- | ---- | ---- |
| Vue | 3.5.16 | 核心框架 |
| Vite | 6.3.5 | 构建工具 |
| Element Plus | 2.10.7 | UI 组件库（含 icons-vue 2.3.1） |
| Pinia | 3.0.2 | 状态管理 |
| vue-router | 4.5.1 | 路由（hash 模式） |
| axios | 1.9.0 | 请求库 |
| monaco-editor | ^0.55.1 | 请求日志详情等 JSON 展示 |
| @sh/ui-core | ^0.0.30 | 共享框架层（布局 / 全局组件 / 运行时注入） |

## 页面清单

| 页面（src/views） | 功能说明 |
| ---- | ---- |
| dashboard | 首页工作台：统计卡片、快捷操作、最近动态、系统状态 |
| user/user | 用户管理：列表 / 编辑 / 详情、角色绑定、菜单来源、重置密码 |
| user/role | 角色管理：列表 / 树形双视图、角色菜单绑定、角色用户管理 |
| system/menu | 菜单管理：树形 / 列表双视图、编辑 / 详情、导出导入 |
| system/app | 应用管理：列表 / 编辑 |
| system/api | API 管理：CRUD、批量新增、接口文档、在线调试（api-mock）、导入导出、复制为代码、字段权限编辑 |
| system/ak | 访问密钥：AK 管理、AK-API 授权 |
| system/dimension | 数据权限维度：列表 / 编辑、导出导入 |
| log/login | 登录日志查询 |
| log/request | 请求日志查询，详情以 Monaco 只读展示请求体 / 响应体 |

## 与 @sh/ui-core 的关系

- 布局 `Layout`、公共方法（useDict / download / parseTime 等）、全局组件、错误页（401 / 404）、MonacoEditor 均由 `@sh/ui-core` 提供
- 应用入口 `main.js` 调用 `createAdminApp({env, routes, views, whiteList: [], menuSource: 'remote'})`，业务工程仅保留业务视图与路由
- Vite 插件装配交由 `@sh/ui-core` preset（`createUiCorePreset`）
- 动态路由菜单来自远端（`menuSource: 'remote'`），本地仅注册首页与兜底页

## 登录形态

- 管理端无自持登录页与注册页，`/login` 不在本端路由注册
- 登录委托 CAS / SSO（门户），登录回跳 `/#/` 进入 dashboard
- 门户地址由 `env.js` 的 `portal` 配置提供

## env.js 配置说明

- 本端应用编码 `appCode = 'auth'`
- 环境按 host 判定：`localhost` / `127.0.0.1` → local；`.dev.` → dev；`.sit.` → sit；`.uat.` → uat；其余 → prod
- `portal` / `baseApi` 取值优先级：localStorage mock（`mock-portal` / `mock-api`）> 显式配置 > 域名推导（当前域名首段替换为 `portal` / `api`）；localhost / IP 等非域名访问不推导，需显式配置或 mock
- `runtimeEnv`（appCode / env / portal / title / baseApi）注入 `@sh/ui-core` 供运行时使用
- dev 代理：`/api` → `<UAT-API域名>`，`/portal` → `<UAT门户域名>`

## 构建部署

```bash
npm run dev          # 本地开发，base '/'，端口 80
npm run build        # 生产构建
npm run build:stage  # staging 构建
```

- 构建产物 `dist/`，`base: './'` 相对路径 + hash 路由，可部署任意子目录
- 静态资源按 `static/js`、`static/css` 等目录输出（文件名带 hash）
