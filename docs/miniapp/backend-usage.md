# 后端使用指南

后端接口分管理端（`/miniapp-admin`）与小程序端（`/miniapp`）两组，路径常量集中在 `AdminRoute` / `MiniappRoute`。全局约定（响应包裹、分页、请求头、错误码）见 sh-miniapp 工程 `docs/api/README.md`。

## Admin API 概览

路径前缀 `/miniapp-admin`（`AdminRoute.ADMIN_PREFIX`），共 14 类资源 47 个接口。

| 资源 | 接口路径 | 说明 |
|------|----------|------|
| Banner | `GET /banner/page`、`GET /banner/info`、`POST /banner/create`、`POST /banner/update`、`POST /banner/remove` | 轮播图管理；软删除、乐观锁 |
| 分类 | `GET /category/tree`、`POST /category/create`、`POST /category/update`、`POST /category/remove` | 两级分类树；存在子分类禁止删除 |
| 内容流 | `GET /feed/page`、`GET /feed/info`、`POST /feed/create`、`POST /feed/update`、`POST /feed/remove` | 内容管理；content 为 null 不修改、空串清空 |
| 热门搜索 | `GET /hot-search/page`、`GET /hot-search/info`、`POST /hot-search/create`、`POST /hot-search/update`、`POST /hot-search/remove` | 热搜词管理 |
| 通知公告 | `GET /notice/page`、`GET /notice/info`、`POST /notice/create`、`POST /notice/update`、`POST /notice/remove` | 公告管理；富文本正文 |
| 快捷入口 | `GET /quick-entry/list`、`GET /quick-entry/info`、`POST /quick-entry/create`、`POST /quick-entry/update`、`POST /quick-entry/remove` | 入口管理；列表非分页 |
| 用户 | `GET /user/page`、`GET /user/info` | 只读查询；列表不含 openid/unionid |
| 消息 | `GET /message/page` | 站内消息分页查询 |
| 消息模板 | `GET /msg-template/page`、`GET /msg-template/info`、`POST /msg-template/create`、`POST /msg-template/update`、`POST /msg-template/remove` | 推送模板管理；wechat/both 渠道 wechatTemplateId 必填 |
| 消息推送 | `POST /msg-push/send` | 按模板 + 用户列表触发推送 |
| 推送记录 | `GET /msg-push-log/page` | 只读；时间范围必填 |
| 用户消息 | `GET /user-message/page`、`POST /user-message/reply` | 反馈与客服消息查询、回复 |
| 登录记录 | `GET /login-record/page` | 只读；时间范围必填 |
| 微信配置 | `GET /wx-config/page`、`GET /wx-config/info`、`POST /wx-config/create`、`POST /wx-config/update`、`POST /wx-config/remove` | 跨租户维护；appSecret 加密存储、返回掩码 |

## Miniapp API 概览

路径前缀 `/miniapp`（`MiniappRoute.MINIAPP_PREFIX`），共 38 个接口。免鉴权白名单为 `/miniapp/public/**`（登录、公开配置、微信回调），其余接口需请求头 `Authorization: Bearer <token>`；C 端列表接口采用游标分页（默认 20 条、上限 50 条）。

| 功能 | 接口路径 | 说明 |
|------|----------|------|
| 登录认证 | `POST /public/login` | `wx.login` 的 code 换 token；免鉴权 |
| 用户 | `GET /user/info`、`GET /user/overview`、`POST /user/update`、`POST /user/upload-avatar`、`POST /user/bind-mobile` | 概览含内置状态字段 + SPI 扩展；头像走 fileos 签名 URL；手机号授权码绑定脱敏存储 |
| 内容 - Banner | `GET /banner/list`、`GET /banner/info` | status=1、sort 升序 |
| 内容 - 通知 | `GET /notice/list`、`GET /notice/info` | 同上 |
| 内容 - 快捷入口 | `GET /quick-entry/list`、`GET /quick-entry/info` | 详情为落地页数据源 |
| 内容 - 内容流 | `GET /feed/page`、`GET /feed/search`、`GET /feed/info` | 游标分页；详情访问后自动记录浏览 |
| 内容 - 搜索与分类 | `GET /hot-search/list`、`GET /category/tree` | 热搜词、两级分类树 |
| 收藏 | `GET /favorite/page`、`POST /favorite/create`、`POST /favorite/remove` | 创建/取消均幂等 |
| 浏览记录 | `GET /browse-log/page`、`POST /browse-log/remove`、`POST /browse-log/clear` | 单条删除与一键清空 |
| 消息 | `GET /message/page`、`GET /message/count`、`GET /message/info`、`POST /message/remove`、`POST /message/read-all`、`GET /message/subscribe-templates` | count 用于 TabBar 角标；详情查看自动已读；subscribe-templates 下发可授权的订阅模板 ID |
| 设置 | `GET /user-setting/list`、`GET /user-setting/info`、`POST /user-setting/update` | 固定 key：notification / dark_mode / font_size；upsert 幂等 |
| 反馈 | `POST /user/feedback`、`POST /user/feedback/upload`、`GET /user/feedback/page` | 写 user-message（source=feedback）；图片返回签名 URL |
| 公开配置 | `GET /public/wx-config/info` | 免鉴权；固定返回 appName/appLogo/servicePhone/about/agreement/privacy |
| 微信回调 | `GET /public/callback/{appId}`、`POST /public/callback/{appId}` | 微信服务器调用，响应为纯字符串 |

## 消息推送

消息推送由 `MsgPushService` 实现，双渠道：inner（站内消息）+ wechat（微信订阅消息），流程为模板配置 → 触发推送 → 推送记录。

1. **模板配置**：管理端维护 `miniapp_msg_template`，字段含 `templateCode`（租户内唯一）、`channel`（inner / wechat / both）、`title` / `content`（支持 `{key}` 占位符）、`wechatTemplateId`（wechat/both 必填）、`page`（点击跳转路径）
2. **触发推送**：`POST /miniapp-admin/msg-push/send`（`MsgPushService.push`）
   - 按 `templateCode` + 租户查模板（status=1），不存在返回失败
   - 用 `params` 渲染 title/content 占位符
   - 渠道确定：入参 `channel` 优先，否则取模板 `channel`；含 `inner` 走站内分支，含 `wechat` 走订阅消息分支
   - inner：写 `miniapp_message` 主体 + `miniapp_message_user` 投递记录（未读）
   - wechat：按用户 openid 调微信订阅消息；失败（无 openid、43101 用户未授权订阅等）记录日志不中断，`failUsers` 最多收集 10 条
   - 返回结果摘要：`totalUser` / `innerSuccess` / `wechatSuccess` / `wechatFail` / `failUsers`
3. **推送记录**：每次投递写 `miniapp_msg_push_log`（渠道、success/fail、失败原因、推送时间），管理端 `GET /miniapp-admin/msg-push-log/page` 查询

## 微信回调

微信回调由 `MiniappWxCallbackRest` 处理，路径 `/miniapp/public/callback/{appId}`，位于免鉴权白名单内，以路径中的 `appId` 路由到对应租户配置。

- **GET 服务器验证**：`checkSignature` 验签通过回显 `echostr`，失败返回 `fail`
- **POST 客服消息接收**：验签 → 解析（`encrypt_type=aes` 时 AES 解密）→ 设置租户上下文 → 按 `msgType` 分发落库（text/image/event 写 `miniapp_user_message`，source=wechat_cs；`(app_id, msg_id)` 唯一索引幂等去重；其余类型仅记日志）→ 返回 `success` / `fail`
- **失败契约**：配置不存在或处理失败返回 `fail`，微信将重试 3 次后放弃
- **支撑组件**：`WxMaServiceManager` 按 `tenantCode` 懒加载并缓存 WxMaService 实例，提供 `evict` 失效重建；access_token 存 Redis（`wx:ma:token:{tenantCode}`）集群共享

## 管理端对接

管理后台 sh-admin-ui 的 `src/views/miniapp` 下 14 个页面目录与 Admin API 一一对应，接口前缀均为 `/miniapp-admin`：

| 页面（src/views/miniapp） | 对接接口 | 接口数 |
|---------------------------|----------|--------|
| banner | `/banner/page`、`/info`、`/create`、`/update`、`/remove` | 5 |
| category | `/category/tree`、`/create`、`/update`、`/remove` | 4 |
| feed | `/feed/page`、`/info`、`/create`、`/update`、`/remove` | 5 |
| hot-search | `/hot-search/page`、`/info`、`/create`、`/update`、`/remove` | 5 |
| notice | `/notice/page`、`/info`、`/create`、`/update`、`/remove` | 5 |
| quick-entry | `/quick-entry/list`、`/info`、`/create`、`/update`、`/remove` | 5 |
| user | `/user/page`、`/info` | 2 |
| user-message | `/user-message/page`、`/reply` | 2 |
| message | `/message/page` | 1 |
| msg-template | `/msg-template/page`、`/info`、`/create`、`/update`、`/remove` | 5 |
| msg-push | `/msg-push/send` | 1 |
| msg-push-log | `/msg-push-log/page` | 1 |
| login-record | `/login-record/page` | 1 |
| wx-config | `/wx-config/page`、`/info`、`/create`、`/update`、`/remove` | 5 |

banner、notice、quick-entry、category、feed、hot-search、msg-template、wx-config 八个页面含 `components/edit.vue` 编辑组件；msg-push 页面调用推送接口后，推送结果在 msg-push-log 页面查询。
