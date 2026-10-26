# 小程序模板工程

sh-miniapp 是基于 sh-framework 的内容展示型微信小程序模板工程，提供从微信底层能力、后端业务到小程序端与管理端前端的完整实现。后端以 Spring Boot 自动配置模块（`sh-miniapp-biz`）+ 启动器（`sh-miniapp-starter`）组织，可被任意启动类项目依赖后零扫描接入；覆盖用户认证、内容展示、消息中心、个人中心、运营管理、消息推送、用户消息七类能力，Maven 坐标为 `com.wkclz.miniapp:sh-miniapp`（parent 为 `com.wkclz.framework:sh-parent`）。

## 功能特性

- **用户认证**：微信登录（`wx.login` → code2session）、用户信息获取与更新、手机号绑定（授权码换脱敏手机号）、Token 刷新（401 静默重登录并重放原请求，仅重试 1 次）
- **内容展示**：Banner 轮播、通知公告、快捷入口、内容流（上拉分页）、内容搜索（热门搜索 + 本地历史）、分类浏览；富文本正文中的私有图片经 fileos 签名 URL 下发
- **消息中心**：消息列表/详情、单条与全部已读管理、微信订阅消息授权（模板 ID 由后端下发）
- **个人中心**：用户信息展示与编辑、我的收藏、浏览记录（日期分组时间线）、用户设置、关于页面、意见反馈（提交/记录双 tab）
- **运营管理**：管理端对 Banner、通知、快捷入口、内容流、分类、消息、用户、微信配置、登录记录的全量管理（CRUD、图片库选择、乐观锁更新、状态开关）
- **消息推送**：消息模板配置（占位符渲染）、微信订阅消息 + 站内消息双渠道推送（43101 未授权自动降级并记录 fail_reason）、推送记录查询
- **用户消息**：微信客服回调消息落库（msg_id 幂等去重）、小程序内反馈提交、运营端统一查询与回复
- **多租户与多实例**：请求头 `tenant-code` + `IdentityContext` 实现数据隔离；`WxMaServiceManager` 按租户管理 WxMaService 实例，access_token 存 Redis 集群共享

## 适用场景

- 内容资讯/门户类小程序：Banner、公告、内容流、搜索、收藏等开箱即用
- 小程序模板脚手架：以 stories 划分的完整业务闭环可作为二次开发的起点
- SaaS 多小程序托管：一套后端以 `tenant_code` 隔离服务多个小程序实例

## 技术栈

- Java 25
- Spring Boot
- MyBatis
- WxJava（weixin-java-miniapp）
- Redis
- 微信小程序原生 + Vant Weapp
- Vue（管理端）

## 快速导航

- [设计思路](./design) - 三端架构、模块划分、数据模型与核心机制
- [功能集成](./integration) - 了解如何集成到项目中
- [后端使用](./backend-usage) - 后端模块的接入与使用
- [小程序端使用](./frontend-usage) - 小程序前端的目录与开发约定
- [微信底层能力](./wxapp) - micro-wxapp 底层微信能力微模块
