# ui-core 核心包

`@sh/ui-core` 是管理后台的统一外壳 npm 包：布局（layout）、状态管理（store）、请求封装（request）、公共组件与样式都在里面。业务子系统依赖它之后，只需要写自己的页面（views）、接口（api）和路由，就能得到与其他子系统完全一致的外观与行为——侧边栏、页签、面包屑、字典标签、分页、上传等统统开箱即用。

体系形态为 **统一登录门户 + 多个子系统站点**（不用微前端）：所有子系统经门户登录，登录态通过父域 Cookie 全体系互通，子系统之间是浏览器整页跳转。

## 包简介

| 项 | 说明 |
| --- | --- |
| npm 包名 | `@sh/ui-core` |
| 当前版本 | 0.0.14 |
| 发布形态 | ESM 预构建发布：`dist` 目录按源码目录结构逐文件镜像（每源文件一个产物），消费方 import 路径与源码形态一致 |
| peer 依赖 | 仅 `vite ^6`（需消费方自装） |
| 传递依赖 | vue、element-plus、pinia、vue-router、axios 等经包的 dependencies 传递，消费方无需重复安装，但需保持版本一致 |
| 技术基线 | Vue 3.5 + Vite 6 + Element Plus 2.10 + Pinia 3（RuoYi-Vue3 体系抽取） |
| 环境要求 | Node 22+、pnpm 11+ |

## 安装

包发布在 npm 私服，先在项目根目录配置 `.npmrc`（将地址替换为实际私服地址）：

```ini
@sh:registry=https://registry.example.com/
```

然后安装：

```bash
pnpm add @sh/ui-core
```

## 五分钟接入

以下 5 步即可得到一个可运行的管理后台子系统，完整文件共 4 个：`env.js`、`vite.config.js`、`src/main.js`、`src/router/index.js`。

### 步骤 1：编写 env.js（唯一运行时配置入口）

项目根目录 `env.js`，全部运行时配置只从这里出（详见下文 [env.js 配置协议](#envjs-配置协议)）：

```js
// env.js —— 唯一运行时配置入口
const name = 'CRM 管理后台'
export const appCode = 'crm-admin' // 本地调试回退值；线上自动取访问域名第一段

const configs = {
  local: { portal: 'http://localhost:5180', title: `${name}【LOCAL】`, baseApi: '/api' },
  uat:   { portal: 'https://portal.uat.example.com', title: `${name}【UAT】`,   baseApi: 'https://api.uat.example.com' },
  prod:  { portal: 'https://portal.example.com',     title: name,               baseApi: 'https://api.example.com' }
}

// 按域名特征判定环境
function getEnv() {
  const url = window.location.host
  let env = 'prod'
  if (url.indexOf('127.0.0.1') > -1) env = 'local'
  if (url.indexOf('localhost') > -1) env = 'local'
  if (url.indexOf('.dev.') > -1) env = 'dev'
  if (url.indexOf('.sit.') > -1) env = 'sit'
  if (url.indexOf('.uat.') > -1) env = 'uat'
  return env
}

export const env = getEnv()

function getConfig(env) {
  let c = configs[env]
  if (c === undefined) c = configs.local // 无对应环境配置时回落 local
  c.portal = localStorage.getItem('mock-portal') || c.portal // 联调可临时覆盖
  c.baseApi = localStorage.getItem('mock-api') || c.baseApi
  return c
}

const config = getConfig(env)
export const portal = config.portal   // 门户地址
export const baseApi = config.baseApi // 接口根地址
export const title = config.title     // 站点标题

// 运行时环境聚合（注入 @sh/ui-core）
export const runtimeEnv = { appCode, env, ...config }
```

### 步骤 2：vite.config.js 使用标准预设

`createUiCorePreset` 来自 `@sh/ui-core/vite`，内含 Vue 插件、vue/vue-router/pinia 的 API 自动导入、构建 gzip 压缩（`.gz`，保留原文件），并自动将旧式登录地址归一为 hash 式 `/#/login`：

```js
import { defineConfig } from 'vite'
import { createUiCorePreset } from '@sh/ui-core/vite'

export default defineConfig(({ command }) => ({
  base: '/',
  plugins: [...createUiCorePreset({ isBuild: command === 'build' })]
}))
```

### 步骤 3：main.js 调用 createAdminApp

```js
import { createAdminApp } from '@sh/ui-core'
import { runtimeEnv } from '../env.js'
import { routes, views } from './router'

createAdminApp({
  env: runtimeEnv,
  routes,
  views,
  menuSource: 'remote' // 'remote' 服务端菜单 | 'local' 本地菜单
})
```

### 步骤 4：业务路由与 views 组件池

```js
// src/router/index.js
import { Layout } from '@sh/ui-core'

export const routes = [
  {
    path: '/',
    component: Layout, // 根组件用包内 Layout 外壳
    redirect: '/index',
    children: [
      { path: 'index', component: () => import('../views/index.vue'), name: 'Index', meta: { title: '首页', icon: 'dashboard' } }
    ]
  }
]

// 动态路由的组件池：import.meta.glob 必须在消费方求值
export const views = import.meta.glob('../views/**/*.vue')
```

> **注意**：`import.meta.glob` 是 Vite 的构建期静态分析能力，必须在消费方项目里求值才能扫到消费方的 `views` 目录；包内无法代劳。

### 步骤 5：确定菜单来源

| menuSource | 行为 |
| --- | --- |
| `'remote'`（默认） | 登录后调远端菜单树接口（见 [动态路由与远端菜单](#动态路由与远端菜单)），服务端按应用过滤 |
| `'local'` | 使用 `localMenus` 传入的本地静态菜单，无需后端即可运行（联调与演示场景） |

本地菜单示例（若依兼容格式，`component` 一级固定 `'Layout'`，二级为 views 池内路径）：

```js
// src/router/localMenus.js
export const localMenus = [
  {
    path: '/demo',
    component: 'Layout',
    meta: { title: '组件演示', icon: 'example' },
    children: [
      { path: 'menu-demo', component: 'demo/menu-demo', name: 'MenuDemo', meta: { title: '菜单示例', icon: 'list' } }
    ]
  }
]
```

## createAdminApp 参数

`createAdminApp(options)` 是子系统装配唯一入口，返回 `{ app, router }`。

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `env` | Object | `null` | 运行时环境对象（env.js 聚合导出的 `runtimeEnv`），注入后包内各模块按需读取 |
| `routes` | Array | `[]` | 消费方业务静态路由，追加到内置常量路由之后 |
| `views` | Object | `{}` | `import.meta.glob('../views/**/*.vue')` 组件池，供动态路由懒加载匹配 |
| `menuSource` | String | `'remote'` | 菜单来源：`'local'` \| `'remote'` |
| `localMenus` | Array | `[]` | `menuSource='local'` 时的本地静态菜单（若依兼容格式） |
| `feature` | Object | `{}` | 外观开关，覆盖默认设置；仅当用户未在「布局设置」中保存过该偏好时生效（用户已保存偏好优先）。可用键：`sideTheme`、`navType`、`tagsView`、`tagsIcon`、`fixedHeader`、`sidebarLogo`、`dynamicTitle`、`footerVisible`、`footerContent`、`showSettings`、`isDark` |
| `whiteList` | Array | `[]` | 免登录路由数组，命中直接放行 |

装配动作依次为：注入运行时环境 → 注册组件池与菜单源 → 应用外观覆盖 → 全局装配（Element Plus 默认属性覆写、全局样式与图标、全局组件/方法/插件/指令）→ 创建路由（内置常量路由 + 消费方路由，hash 模式）→ 安装 store 与 router → 注册路由守卫 → 挂载 `#app`。

内置常量路由：`/redirect/:path(.*)`（页签刷新中转）、404 兜底路由、`/401` 无权限页。

## env.js 配置协议

env.js 是消费方**唯一**运行时配置入口，其余配置通道一律禁止。

| 字段 | 说明 |
| --- | --- |
| `appCode` | 应用标识。线上取访问域名第一段（部署约定 `{appCode}.example.com` 泛域名子域即应用）；localhost/127.0.0.1 本地调试回退为 env.js 配置值。随请求头 `app-code` 上送，远端菜单按其过滤 |
| `portal` | 门户地址。门户自身应用配空串；子系统配完整地址（无 token 整页跳转 / 登出回跳的目标） |
| `title` | 页面标题，动态标题的基准 |
| `baseApi` | 接口根地址，推荐同域反代 `/api`，避免跨域 |

**环境判定**：按域名特征自动判定，无需手工切换：

| 域名特征 | 环境 |
| --- | --- |
| 含 `localhost` 或 `127.0.0.1` | `local` |
| 含 `.dev.` | `dev` |
| 含 `.sit.` | `sit` |
| 含 `.uat.` | `uat` |
| 其他 | `prod` |

**运行时覆盖**：localStorage 写入 `mock-api` / `mock-portal` 可临时覆盖 `baseApi` / `portal`，便于本地联调指向不同后端或门户，无需改代码。

## 登录态机制

- **JWT 存父域 Cookie**：key 为 `token`，`SameSite=Lax`。Cookie 域自动取「访问域名去掉首段后的父域」（如 `app.uat.example.com` → `.uat.example.com`），同一父域的所有子域名共享；localhost/127.0.0.1 不设域（仅当前 host），跨端口互通。
- **用户信息本地解析**：用户信息直接从 JWT payload 解析（Base64 解码），得到 `userCode` / `username` / `nickname` / `avatar`（缺省用内置默认头像），不发任何请求。
- **包不承载登录链路**：登录页归属门户应用。子系统无 token 时由路由守卫整页跳门户登录页（`{portal}/#/login?redirect={当前页完整地址}`）；`portal` 配置为空串则视为门户自身，在 SPA 内导航至 `/#/login?redirect=...`（登录路由由门户应用自行注册并加入 whiteList）。
- **白名单路由**：`whiteList` 命中的路径免登录直达。
- **统一登出**：由包统一收口——调用登出接口（由登录服务约定，删除后端会话）→ 清除本地 Cookie → 无论接口成败整页跳门户 `/#/login`；其余已打开的子系统标签页在下次请求收到 401 时自动跳门户。
- **会话失效**：与登出同路径，401 → 弹确认框 → 跳门户。

相关 API（`@sh/ui-core/utils/auth`）：`getToken()` / `setToken(token)` / `removeToken()`。

## 请求封装

`@sh/ui-core/utils/request` 导出配置好的 axios 实例（默认导出），业务 api 模块直接使用：

```js
import request from '@sh/ui-core/utils/request'

// 查询用户列表
export function listUser(query) {
  return request({ url: '/system/user/list', method: 'get', params: query })
}

// 新增用户
export function addUser(data) {
  return request({ url: '/system/user', method: 'post', data })
}
```

**行为约定**：

| 项 | 行为 |
| --- | --- |
| baseURL | 每次请求自动取运行时环境 `baseApi` |
| 请求头 | 自动携带 `token`（已登录时）与 `app-code`（取域名第一段，localhost 回退 env.js 的 `appCode`） |
| 防重复提交 | POST/PUT 默认 1 秒内相同 url+data 的重复请求直接拒绝（提示「数据正在处理，请勿重复提交」）；`headers: { repeatSubmit: false }` 可关闭；请求体超 5MB 跳过校验 |
| 超时 | 12 秒 |

**统一业务码处理**（响应体 `code` 字段）：

| code | 行为 |
| --- | --- |
| 200（或未设置） | 成功，直接返回 `res.data`（不含外层包裹） |
| 500 | 错误提示（ElMessage） |
| 601 | 警告提示（ElMessage） |
| 其他非 200 | 错误通知（ElNotification） |

**HTTP 401**：弹确认框（「登录状态已过期，您可以继续留在该页面，或者重新登录」），确认后清 Cookie 并整页跳门户重新登录（携带 redirect 回跳地址），弹窗全局只出现一次。

**下载方法**（`@sh/ui-core/utils/request` 具名导出）：

```js
import { download, postDownload } from '@sh/ui-core/utils/request'

// GET 下载
download('/system/user/export', queryParams, `user_${new Date().getTime()}.xlsx`)
// POST 下载
postDownload('/system/user/export', postData, `user_${new Date().getTime()}.xlsx`)
```

下载全程显示 Loading；响应为 JSON（业务错误）时自动解析错误信息提示，为二进制时经 file-saver 保存。

## 动态路由与远端菜单

`menuSource='remote'` 时，登录后包内调用**菜单树接口**（体系协议接口，路径由登录服务约定）获取树形菜单，格式为若依兼容格式，服务端按请求头 `app-code` 过滤出当前应用的菜单。

菜单项 `component` 字段的转换规则：

| component 值 | 转换为 |
| --- | --- |
| `'Layout'` | 包内外壳布局组件（一级菜单根） |
| `'ParentView'` | 包内多级菜单路由容器 |
| `'InnerLink'` | 包内外链承载组件（配合 `meta.link`，页面内嵌 iframe） |
| 其他字符串 | 在 views 组件池中按路径匹配懒加载：匹配规则为组件池键中 `views/` 与 `.vue` 之间的路径段，如 `'system/user/index'` 对应 `src/views/system/user/index.vue`；匹配不到则该路由无组件 |

path 为 http(s) 外链的菜单不注册进 vue-router，由内链组件承载展示。

**路由级权限过滤**：消费方如需「带权限的动态路由」（本地定义、按权限注入），在路由对象上声明 `permissions` 或 `roles` 字段，经 `filterDynamicRoutes` 过滤后并入静态路由：

```js
import { Layout } from '@sh/ui-core'
import { filterDynamicRoutes } from '@sh/ui-core/store/modules/permission'

const dynamicRoutes = [
  {
    permissions: ['monitor:online:list'],
    path: '/system/online',
    component: Layout,
    children: [{ path: 'index', component: () => import('../views/monitor/online/index.vue'), name: 'Online', meta: { title: '在线用户', icon: 'online' } }]
  }
]

export const routes = [...constantBusinessRoutes, ...filterDynamicRoutes(dynamicRoutes)]
```

`permissions` 与 `roles` 均为「或」语义（任一命中即注入）。菜单拉取失败时由路由守卫统一收口跳门户，不会白屏。

## 权限控制

权限数据（`permissions` / `roles`）随 JWT 与菜单一并就绪，存于用户 store，三种用法：

**1. 按钮级指令**（无权限时直接从 DOM 移除该元素）：

```vue
<el-button v-hasPermi="['sys:user:add']">新增</el-button>
<el-button v-hasRole="['admin']">管理员专属</el-button>
```

支持通配权限 `*:*:*` 与超级角色 `admin`；未设置值会直接抛错。

**2. 函数式校验**（`@sh/ui-core/utils/permission`）：

```js
import { checkPermi, checkRole } from '@sh/ui-core/utils/permission'

if (checkPermi(['sys:user:edit'])) { /* ... */ }
if (checkRole(['admin', 'common'])) { /* ... */ }
```

**3. 组件内 `this.$auth`**：

```js
this.$auth.hasPermiOr(['sys:user:edit', 'sys:user:remove']) // 任一拥有
this.$auth.hasPermiAnd(['sys:user:edit', 'sys:user:remove']) // 全部拥有
this.$auth.hasRoleOr(['admin', 'common'])
this.$auth.hasRoleAnd(['admin', 'common'])
```

## 内置全局能力清单

装配完成后，以下能力全局可用，无需 import。

**全局组件**（模板中直接使用）：

| 组件 | 用途 |
| --- | --- |
| `DictTag` | 字典标签展示 |
| `Pagination` | 分页 |
| `FileUpload` / `ImageUpload` / `ImagePreview` | 文件上传 / 图片上传 / 图片预览 |
| `RightToolbar` | 表格右侧工具栏（刷新、列设置） |
| `Editor` | 富文本编辑器 |
| `TableSetting` | 表格列设置 |
| `FormTip` / `LabelTip` | 表单项提示 / 标签提示 |
| `LayoutSplit` | 可拖拽分割布局 |
| `svg-icon` | 图标（内置整套 svg 图标库与 Element Plus 图标，已全局注册） |

```vue
<dict-tag :options="sys_normal_disable" :value="row.status" />
<pagination v-show="total > 0" :total="total" v-model:page="queryParams.current" v-model:limit="queryParams.size" @pagination="getList" />
```

**全局方法**（组件内 `this.xxx` 或直接 import）：

| 方法 | 用途 |
| --- | --- |
| `useDict(...types)` | 取字典数据（localStorage 缓存 10 分钟，命中不再请求） |
| `download(url, params, filename)` | GET 下载文件 |
| `parseTime(time, pattern)` | 时间格式化 |
| `resetForm(refName)` | 重置表单 |
| `handleTree(data, id, parentId, children)` | 列表转树 |
| `addDateRange(params, dateRange, propName)` | 日期范围并入查询参数（`timeFrom` / `timeTo`） |
| `selectDictLabel(dicts, value)` / `selectDictLabels(...)` | 回显字典标签（单个/多个） |

```js
const { sys_normal_disable } = useDict('sys_normal_disable') // 字典项：value/label/elTagType/elTagClass/disabled
```

字典数据由公共字典接口 `/micro-dict/common/dicts/list` 提供，按 `dictType` 批量查询。

**插件**（组件内 `this.$xxx`）：

| 插件 | 用途 |
| --- | --- |
| `$tab` | 页签操作：`openPage` / `closePage` / `closeAllPage` / `refreshPage` 等 |
| `$auth` | 权限校验（见上文） |
| `$cache` | 本地/会话缓存：`$cache.local.set(key, value)`、`$cache.session.getJSON(key)` |
| `$modal` | 消息与对话框：`msgSuccess` / `msgError` / `confirm` / `prompt` / `loading` / `closeLoading` 等 |
| `$download` | 文件下载工具 |

```js
await this.$modal.confirm('是否确认删除？') // 确认返回，取消 reject
this.$modal.msgSuccess('保存成功')
```

**指令**：

| 指令 | 用途 |
| --- | --- |
| `v-hasPermi` / `v-hasRole` | 按钮/元素级权限（见上文） |
| `v-copyText` | 点击复制文本，`v-copyText:callback` 绑定复制后回调 |

```vue
<el-button v-copyText="text" v-copyText:callback="copied">复制</el-button>
```

**Element Plus 默认属性覆写**（全项目生效，无需逐个声明）：

| 组件 | 覆写的默认值 |
| --- | --- |
| ElTable | `border: true` |
| TableColumn | `align: 'left'`、`showOverflowTooltip: true` |
| ElDialog | `appendToBody: true`、`draggable: true`、`closeOnClickModal: false` |
| ElDrawer | `appendToBody: true`、`closeOnClickModal: false` |
| ElDatePicker | `format: 'YYYY-MM-DD HH:mm:ss'`、`valueFormat: 'YYYY-MM-DDTHH:mm:ss'` |

另：Element Plus 以中文语言包安装，全局尺寸取 localStorage `size`（默认 `default`）。

## 主题与暗色模式

- **主色运行时派生**：`handleThemeStyle(theme)` 将主色写入 CSS 变量 `--el-color-primary` 并派生 `light-1`~`light-9`、`dark-1`~`dark-9` 共 18 档衍生色，Element Plus 全组件即时换色。默认主色 `#409EFF`，用户可在「布局设置」面板修改（选择器取色，偏好存 localStorage）。
- **侧栏主题**：`feature.sideTheme` 控制侧栏深浅——`theme-dark` 深色 / `theme-light` 浅色（默认浅色）。
- **暗色模式**：基于 `html.dark` 类做全量变量覆盖（页面背景、侧栏、顶部导航、标签页、表格、树、下拉菜单、blockquote 等），与 Element Plus 官方暗色变量方案一致；「布局设置」面板一键切换，偏好持久化。

## 深路径导出参考

包出口经 package.json `exports` 白名单限定，未列入白名单的内部路径（assets/layout/router/settings 等）不可引用。

**exports 白名单**：

| 出口 | 内容 |
| --- | --- |
| `.` | 主入口：`createAdminApp`、`Layout`、`ParentView`、`InnerLink`、`iFrame`、`setRuntimeEnv` |
| `./vite` | `createUiCorePreset` 标准 vite 预设 |
| `./api/*` | 包内接口模块（字典、体系协议接口等） |
| `./components/*` | 全部公共组件 |
| `./core/*` | 装配核心（createAdminApp / guard 等） |
| `./directive/*` | 全部指令 |
| `./plugins/*` | 全部插件 |
| `./store/*` | 全部 store 模块 |
| `./utils/*` | 全部工具模块 |

**常用深路径**：

| 路径 | 导出 |
| --- | --- |
| `@sh/ui-core/utils/auth` | `getToken` / `setToken` / `removeToken` |
| `@sh/ui-core/utils/request` | 默认导出 axios 实例；`download` / `postDownload` |
| `@sh/ui-core/utils/jsencrypt` | `encrypt` / `decrypt`（RSA，公钥内置于包内；私钥不在前端代码，`decrypt` 仅保留接口形态） |
| `@sh/ui-core/utils/safe-target` | `safeTarget`：回跳地址校验，防开放重定向——相对路径放行；绝对地址仅允许 http(s) 且与本站同 host 或同父域，否则回落 `/` |
| `@sh/ui-core/utils/host` | `resolveAppCode`（取域名第一段，localhost 回退 env 配置）、`resolveCookieDomain`（父域解析） |
| `@sh/ui-core/utils/dict` | `useDict` 字典 Hook |
| `@sh/ui-core/utils/permission` | `checkPermi` / `checkRole` |
| `@sh/ui-core/store/modules/permission` | `filterDynamicRoutes` / `loadView` |
| `@sh/ui-core/components/error/404.vue.js` | 404 页面组件（内置路由已挂，可复用样式） |
| `@sh/ui-core/components/error/401.vue.js` | 401 无权限页面组件 |
