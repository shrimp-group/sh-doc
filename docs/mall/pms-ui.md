# 管理端前端（PMS-UI）

PMS-UI 是商城系统的管理端前端（商城管理子系统），面向商城运营人员，提供商品、分类、订单、优惠券、快捷入口的管理能力。工程代码位于 `sh-demo-ui/sh-pms-ui`，基于共享前端内核 [@sh/ui-core](https://www.npmjs.com/package/@sh/ui-core)（RuoYi-Vue3 体系抽包改造）构建，通过 API 网关对接后端商品服务（sh-pms）、订单服务（sh-oms）与内容素材服务（sh-cms）。

## 前端架构

### 技术栈

| 类别 | 选型 | 版本 | 说明 |
| --- | --- | --- | --- |
| 框架 | Vue | ^3.5.16 | Composition API，`<script setup>` 单文件组件 |
| 路由 | vue-router | 4.5.1 | Hash 模式（`createWebHashHistory`） |
| 状态管理 | Pinia | （由 @sh/ui-core 内置） | user / permission / settings / app 等 store 均在 @sh/ui-core 内 |
| UI 库 | Element Plus + @element-plus/icons-vue | icons 2.3.1 | Element Plus 全局装配与常用全局组件（pagination、dict-tag、editor、table-setting 等）由 @sh/ui-core 完成 |
| 共享内核 | @sh/ui-core | ^0.0.18 | Layout、request 封装、路由守卫、权限指令、字典、登录态全部由包承担 |
| 构建工具 | Vite | 6.3.5 | 插件装配交由 `@sh/ui-core/vite` 的 `createUiCorePreset` preset |
| 语言/样式 | JavaScript + SASS | sass-embedded 1.89.1 | 别名：`@` → `src/`，`~` → 工程根 |

### 目录结构

```
sh-pms-ui/
├── env.js                    # 运行时环境推导：appCode、baseApi、portal 地址
├── vite.config.js            # Vite 配置（preset 装配、别名、dev 代理）
├── package.json
└── src/
    ├── main.js               # 应用装配入口：createAdminApp({ env, routes, views, menuSource: 'remote' })
    ├── router/
    │   └── index.js          # 静态路由为空；views 为 import.meta.glob 组件池
    ├── api/                  # 后端接口封装（按业务域拆分）
    │   ├── common.js         # CMS 图片素材库（图片分页、图片分类选项）
    │   ├── product.js        # 商品与 SKU
    │   ├── productCategory.js# 商品分类
    │   ├── order.js          # 订单
    │   ├── platformCoupon.js # 平台优惠券
    │   ├── merchantCoupon.js # 商户优惠券
    │   └── quickEntrance.js  # 商城快捷入口
    └── views/
        ├── dashboard/        # 工作台（含 QuickActions / RecentActivity / SystemStatus 子组件）
        ├── product/
        │   ├── product/      # 商品管理（editBase 基础信息编辑、editSku 规格编辑）
        │   └── category/     # 商品分类（edit）
        ├── order/
        │   ├── order/        # 订单管理（detail 订单详情、orderItemEdit 子订单编辑）
        │   └── evaluate/     # 订单评价（占位）
        ├── marketing/
        │   ├── platformCoupon/ # 平台优惠券（edit）
        │   ├── merchantCoupon/ # 商户优惠券（edit）
        │   └── flashSale/      # 秒杀（占位）
        ├── merchant/
        │   └── quickEntrance/  # 商城快捷入口（edit）
        └── components/
            └── ShImage/      # 公共图片选择组件（对接 CMS 图片库，含 imageSelect）
```

### API 层封装

所有接口经 `@sh/ui-core/utils/request`（axios 实例）发出，业务代码只声明 `url / method / params / data`：

- **baseURL**：取自运行时环境 `runtimeEnv.baseApi`（由 `env.js` 推导，见[与后端的对接](#与后端的对接)）。
- **请求头**：携带 `token`（登录态）与 `app-code`（应用标识，用于服务端识别子系统，本地开发回退 `env.js` 配置的 `pms`）。
- **防重复提交**：POST/PUT 请求按 `url + 请求体摘要` 在 1 秒窗口内判重，重复直接拒绝。
- **响应约定**：`code === 200` 成功返回 `res.data`；`500` 错误提示、`601` 警告提示；HTTP `401` 弹出确认框后清理登录态并跳转统一门户登录页。
- **通用能力**：`download` / `postDownload` 文件下载（blob + file-saver）；GET 参数统一序列化。

## 页面与路由

### 路由机制

本应用**无静态业务路由**，采用「内置路由 + 服务端菜单动态路由」模式：

- **内置路由**（由 @sh/ui-core 注册）：`/redirect/:path(.*)`、`404`、`/401`。登录页归统一门户持有，本应用不注册 `/login`。
- **动态路由**：登录后前端请求统一门户的菜单树接口（`GET /iam-portal/user/menu/tree/ruoyi`，按 `app-code` 识别当前子系统），将返回的 RuoYi 格式菜单树转换为路由并 `router.addRoute` 注册。菜单 `component` 字符串与 `import.meta.glob('../views/**/*.vue')` 组件池匹配（支持带 `/index` 后缀的目录式写法），实现菜单驱动、按权限裁剪的页面访问。

### 页面清单

管理端共 9 个业务页面（其中 2 个为占位页），按后端模块归属如下：

| views 分组 | 页面 | 组件 | 说明 | 对应后端模块 |
| --- | --- | --- | --- | --- |
| dashboard | 工作台 | index.vue + QuickActions / RecentActivity / SystemStatus | 门户首页：问候语、快捷操作、最近活动、系统状态、运行环境信息 | — |
| product/product | 商品管理 | index.vue + editBase / editSku | 商品分页查询、基础信息与图文详情编辑、SKU 规格/价格/库存维护、上下架、复制小程序链接 | PMS（/pms/product） |
| product/category | 商品分类 | index.vue + edit | 树形分类维护：逐级新增、编辑、删除 | PMS（/pms/product/category） |
| order/order | 订单管理 | index.vue + detail / orderItemEdit | 订单分页查询、订单详情、子订单状态/物流信息维护、改价 | OMS（/oms/order） |
| order/evaluate | 订单评价 | index.vue | 占位页（功能开发中） | OMS |
| marketing/platformCoupon | 平台优惠券 | index.vue + edit | 平台级卡券的增删改查与发放状态切换 | PMS（/pms/platform/coupon） |
| marketing/merchantCoupon | 商户优惠券 | index.vue + edit | 商户级卡券的增删改查与发放状态切换 | PMS（/pms/merchant/coupon） |
| marketing/flashSale | 秒杀 | index.vue | 占位页（功能开发中） | PMS |
| merchant/quickEntrance | 商城快捷入口 | index.vue + edit | 小程序商城首页快捷入口维护（图标/名称/地址/启用/排序） | PMS（/pms/quick/entrance） |

公共组件 `views/components/ShImage` 为图片选择控件，内嵌 imageSelect 对话框对接 CMS 图片库（`/cms/common/image/page`），被商品封面、SKU 图片、卡券 logo、入口图标等表单复用。

## 权限控制

### 登录与 Token

- **登录委托统一门户**：本应用无登录页（`whiteList` 为空），未登录访问时路由守卫整页跳转门户登录地址并携带 `redirect` 回跳参数。
- **Token 存储**：JWT 存于 Cookie（key 为 `token`），domain 取访问域名去掉首段后的父域，实现同父域下各子系统与门户共享登录态；localhost 访问时不设 domain（host-only，各端口互通）。
- **用户信息**：不请求后端，前端直接 Base64 解码 JWT payload 得到 `userCode / username / nickname / avatar`。
- **登出**：调用 `GET /iam-portal/public/sso/logout` 后清理 Cookie 并跳转门户；HTTP 401 时弹出确认框统一收口重新登录。
- **应用标识**：每个请求携带 `app-code` 请求头；域名访问时取域名首段，本地开发回退 `env.js` 配置的 `pms`。服务端据此识别子系统并下发对应菜单。

### 路由守卫

`@sh/ui-core` 的全局 `beforeEach` 守卫流程：

1. 有 token 且用户信息未加载：解析 JWT → 拉取菜单树 → `generateRoutes` 生成动态路由 → `addRoute` 注册 → 重放当前导航；
2. 有 token 且已加载：直接放行，并按 `to.meta.title` 动态设置页面标题；
3. 无 token：白名单直达（本应用无白名单）→ 整页跳转门户登录；
4. 菜单装配失败：通知报错并中断导航，认证失效场景由请求层 401 弹窗统一处理。

由于菜单树本身按用户权限裁剪下发，**未授权的菜单不会注册为路由**，用户无法通过 URL 直接访问未授权页面。

### 按钮级权限

页面内操作按钮通过 `v-hasPermi` 指令控制显隐，权限标识不匹配时直接移除 DOM 元素。典型标识：

| 权限标识 | 控制的操作 | 出现页面 |
| --- | --- | --- |
| `page` | 搜索查询 | 商品、订单 |
| `create` / `update` | 新增 / 编辑 | 商品、分类等 |
| `remove` | 删除 | 商品、订单、优惠券等 |
| `onOffShelves` | 商品上下架开关 | 商品 |
| `sku` | SKU 维护入口 | 商品 |
| `detail` | 订单详情 | 订单 |
| `orderStatus` | 子订单状态/物流编辑 | 订单详情 |

此外 @sh/ui-core 还提供 `v-hasRole` 角色指令与 `auth.hasPermiOr / hasRoleOr` 判断工具，供动态路由按 `permissions` / `roles` 过滤。

## 核心交互逻辑

### 商品管理

- **商品编辑（editBase）**：对话框内两个 Tab——「基础信息」（名称、副标题、商品类型、树形分类选择、单位、封面、关键词、描述）与「图文详情」（富文本编辑器）。新增与编辑复用同一表单，提交走 `productSave`。
- **SKU 维护（editSku）**：左侧维护 1~3 个销售属性树（如颜色/尺寸），右侧自动生成属性组合 SKU 表格，支持批量设置原价/销售价/订金/库存/预设销量，逐行设置有效标记、图片与价格；修改态仅允许改文案，不允许增减属性。
- **上下架**：表格行内 switch 直接触发 `productShelvesOn / productShelvesOff`；SKU 数量为 0 的商品开关禁用并提示「请先维护SKU才能上架」，保证上架商品必有可售规格。
- **复制小程序链接**：将 `/pages/goods/index?productCode={productCode}` 复制到剪贴板，供运营投放使用。

### 商品分类

树形表格展示（`categoryCode / pcode` 组装层级），行内「新增」携带父编码创建子分类；仅叶子节点提供删除按钮，避免误删含子级分类。图片组以逗号分隔多图存储，前端拆分为数组预览。

### 订单管理

- **查询与详情**：支持订单号、手机号、订单状态、时间范围检索（默认近 7 天）；详情对话框上半部展示订单主信息（状态、金额、支付方式、支付流水等），下半部为子订单清单。
- **子订单维护（orderItemEdit）**：可修改子订单状态（必填）、承运商与快递单号，提交 `orderItemUpdate` 后刷新清单；改价能力经 `orderPriceChange` 封装。
- **物流跟踪**：快递单号支持一键复制，并可跳转快递 100 按承运商 + 单号查询物流轨迹。

### 优惠券（平台 / 商户）

平台与商户优惠券两套页面结构一致：按卡券编码/名称/类型/状态检索；卡券类型分 `DISCOUNT`（折扣，展示折扣列）与 `VOUCHERS`（代金，展示面值列）；编辑对话框维护有效期、使用范围、门槛金额、发放数量等；`ISSUED` 状态的卡券可经 `status/on / status/off` 接口切换发放状态；删除需二次确认。

### 商城快捷入口

维护小程序商城首页的快捷入口卡片：图标（ShImage 选图）、入口名称、跳转地址、启用开关与排序值，支持增删改查与分页。

## 与后端的对接

### API 模块对应关系

| API 模块 | 后端服务 | Rest 前缀 | 主要接口 |
| --- | --- | --- | --- |
| api/product.js | sh-pms（PMS） | `/pms/product` | page / info / save / remove / sku/info / sku/save / shelves/on / shelves/off |
| api/productCategory.js | sh-pms（PMS） | `/pms/product/category` | list / info / save / remove / options |
| api/platformCoupon.js | sh-pms（PMS） | `/pms/platform/coupon` | page / info / save / remove / status/on / status/off |
| api/merchantCoupon.js | sh-pms（PMS） | `/pms/merchant/coupon` | page / info / save / remove / status/on / status/off |
| api/quickEntrance.js | sh-pms（PMS） | `/pms/quick/entrance` | page / info / create / update / remove |
| api/order.js | sh-oms（OMS） | `/oms/order` | page / detail / item/list / price/change / item/update |
| api/common.js | 内容素材服务（CMS） | `/cms/common/image`、`/cms/image/category` | image/page、options/withimgcount |
| （@sh/ui-core 内置） | 统一门户（IAM） | `/iam-portal` | user/menu/tree/ruoyi（菜单树）、public/sso/logout（登出） |

接口统一走 API 网关：前端以 `baseApi` 为 baseURL，按 URL 前缀路由到对应后端微服务。

### 本地开发代理

本地开发（`npm run dev`）时，Vite dev server 通过代理消除跨域，代理目标为本地开发服务，可在工程 `vite.config.js` 的 `server.proxy` 中按环境调整：

| 代理路径 | 转发目标 | 说明 |
| --- | --- | --- |
| `/api` | 后端 API 网关（同源代理，rewrite 去除 `/api` 前缀） | 所有 `/pms`、`/oms`、`/cms`、`/iam-portal` 请求 |
| `/portal` | 统一门户站点（整站镜像） | 登录页在本站 origin 运行，登录后 token Cookie 落本机同源 |

运行时环境由 `env.js` 按访问域名自动推导（localhost / `.dev.` / `.sit.` / `.uat.` / 生产），并支持通过 `localStorage` 写入 `mock-api`、`mock-portal` 临时覆盖接口基址与门户地址，便于联调。

---

返回[商城概述](./index)。
