# 小程序前端使用指南

`sh-miniapp-ui` 为微信小程序前端工程，原生开发 + Vant Weapp 组件库，配套后端 `sh-miniapp-biz`。

## 环境要求与本地启动

| 项目 | 要求 |
|------|------|
| 微信开发者工具 | 基础库 >= 3.0.0 |
| Node.js | >= 16 |

启动步骤：

```bash
# 1. 安装依赖
cd sh-miniapp-ui
npm install

# 2. 用微信开发者工具打开 sh-miniapp-ui/ 目录

# 3. 构建 npm（菜单：工具 -> 构建 npm）
```

本地无后端预览：将 `config/env.js` 中对应环境的 `mock` 置为 `true`，命中 mock 的请求直接返回本地数据，无需启动后端。

## 目录结构

```
sh-miniapp-ui/
├── api/               # 接口模块（home、category、user 等 10 个）
├── components/        # 公共组件（banner-swiper、search-bar 等 5 个）
├── config/            # 环境配置（env.js）
├── custom-tab-bar/    # 自定义 tabBar
├── mock/              # 本地 mock 数据（12 个模块）
├── pages/             # 主包页面（4 个 TabBar 页 + not-found）
├── styles/            # 全局样式、Vant 主题变量
├── subpages/          # 分包页面（13 个）
├── utils/             # 工具函数（request 封装、校验等）
├── app.js / app.json / app.wxss
├── package.json
├── project.config.json
└── sitemap.json
```

## 环境配置

环境配置位于 `config/env.js`，通过 `wx.getAccountInfoSync().miniProgram.envVersion` 自动识别运行环境（develop/trial/release），获取失败时回退 release。

| 环境 | baseUrl | mock |
|------|---------|------|
| develop（开发版） | `https://api.uat.husters.cn/miniapp` | 关闭 |
| trial（体验版） | `https://api.uat.husters.cn/miniapp` | 关闭 |
| release（正式版） | `https://api.uat.husters.cn/miniapp` | 关闭 |

以上为当前 `env.js` 中的实际配置，三个环境指向同一后端。mock 开关由各环境的 `mock` 字段独立控制：

- **联调后端**：保持 `mock: false`，将 `baseUrl` 改为目标后端地址
- **无后端预览**：将 `mock: true`，命中 mock 前缀的请求返回本地数据（模拟 300ms 网络延迟），未命中的前缀仍发真实请求

## 请求层封装

`utils/request.js` 为统一请求入口，职责：

- **baseUrl 拼接**：请求路径不含 baseUrl，GET 参数自动过滤 `undefined`/`null` 并做 URL 编码
- **统一请求头**：`Content-Type: application/json`、`trace-id`（32 位随机串）、`tenant-code`、`app-code`，已登录时携带 `Authorization: Bearer <token>`
- **静默登录**：`wx.login` 获取 code 调 `POST /public/login` 换取 token 并存入本地缓存，内置 12 秒并发锁防止重复登录
- **错误处理**：HTTP 401 时静默重登录并重放原请求（仅重试 1 次）；业务码 `200` 成功返回，`0`/`-1`/其他统一 toast 提示并 reject；默认显示 loading，可通过 `showLoading: false` 关闭

`api/` 目录按业务拆分为 10 个接口模块：

| 模块 | 职责 |
|------|------|
| home.js | 首页（Banner、快捷入口、内容流） |
| category.js | 分类 |
| message.js | 消息 |
| user.js | 用户（信息、头像上传、概览） |
| favorite.js | 收藏 |
| browse-log.js | 浏览记录 |
| feedback.js | 意见反馈 |
| settings.js | 用户设置 |
| config.js | 微信配置（名称、Logo、协议等） |
| hot-search.js | 热门搜索 |

## Mock 数据体系

`mock/` 目录共 12 个模块，由 `utils/request.js` 中的 `MOCK_MAP` 按请求路径前缀路由：

| Mock 文件 | 匹配前缀 | 对应业务 |
|-----------|----------|----------|
| banners.js | `/banner` | Banner |
| categories.js | `/category` | 分类 |
| feed.js | `/feed` | 内容流 |
| messages.js | `/message` | 消息 |
| notices.js | `/notice` | 通知 |
| quickEntries.js | `/quick-entry` | 快捷入口 |
| favorites.js | `/favorite` | 收藏 |
| browseLogs.js | `/browse-log` | 浏览记录 |
| userSettings.js | `/user-setting` | 用户设置 |
| wxConfig.js | `/public/wx-config` | 微信配置 |
| feedbacks.js | `/user/feedback` | 意见反馈 |
| user.js | 未挂载到 MOCK_MAP（预留） | 用户 |

mock 模块支持对象与函数式两种形态：对象直接返回固定数据，函数可按 URL 与参数返回不同数据（用于同一前缀下多个接口）。

## 页面与组件

### TabBar 页面（主包）

tabBar 采用自定义组件 `custom-tab-bar/`，共 4 个页面：

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | pages/home/index | Banner、快捷入口、内容流 |
| 分类 | pages/category/index | 内容分类 |
| 消息 | pages/messages/index | 消息与通知 |
| 我的 | pages/profile/index | 个人中心 |

主包另含 `pages/not-found/index` 兜底页。

### 分包页面（subpages）

| 页面 | 说明 |
|------|------|
| search/index | 搜索 |
| banner-detail/index | Banner 详情 |
| entry-detail/index | 快捷入口详情 |
| feed-detail/index | 内容流详情 |
| article-detail/index | 文章详情 |
| notification-detail/index | 通知详情 |
| message-detail/index | 消息详情 |
| user-info/index | 个人资料编辑 |
| favorite/index | 我的收藏 |
| browse-log/index | 浏览记录 |
| settings/index | 设置 |
| feedback/index | 意见反馈 |
| about/index | 关于 |

### 公共组件（components）

| 组件 | 说明 |
|------|------|
| banner-swiper | 轮播图 |
| search-bar | 搜索栏 |
| quick-entries | 快捷入口 |
| notice-bar | 通知栏 |
| empty-state | 空状态 |

[返回概述](./index)
