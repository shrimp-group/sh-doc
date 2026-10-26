# 微信底层能力（Micro-WxApp）

Micro-WxApp 是微信小程序底层能力微模块，Maven 坐标为 `com.wkclz.microapp:micro-wxapp`，提供多 appId 配置管理、小程序登录、用户信息、手机号绑定与媒体管理等基础能力。它作为底层支撑被 sh-miniapp-biz 的 wx 包（`WxMaServiceManager` 等）依赖使用，业务层的封装与扩展详见[设计思路](./design)。

## 功能特性

- **多 appId 配置管理**：以 `wxapp_config` 表维护各租户小程序的 appId、Secret、Token、AESKey 与证书，appId 租户内唯一，详情查询敏感字段脱敏
- **登录认证**：code2Session 换取 openId/unionId/sessionKey，新用户自动注册并写入登录日志，经 iam-session 创建统一会话（AuthType.WECHAT_MINI）
- **用户信息与手机号**：用户信息查询（手机号脱敏、头像签名）、资料更新、手机号绑定与加密数据解密获取
- **媒体管理**：小程序临时素材（图片）上传与下载
- **登录日志**：记录 userCode、openId 与登录 IP

## REST 接口清单

接口统一前缀 `/micro-wxapp`，共 14 个。

| 模块 | 接口路径 | HTTP 方法 | 说明 |
| --- | --- | --- | --- |
| 验签（WxAppRest） | `/public/miniapp/portal` | GET | 微信小程序服务器验签，校验通过返回 echostr |
| 用户（WxMaUserRest） | `/public/miniapp/login` | POST | 小程序登录，自动注册/更新用户并创建会话 |
| 用户（WxMaUserRest） | `/miniapp/userinfo` | GET | 获取当前登录用户信息 |
| 用户（WxMaUserRest） | `/miniapp/userinfo/update` | POST | 更新当前用户昵称、头像 |
| 用户（WxMaUserRest） | `/miniapp/mobile/bind` | POST | 绑定手机号（code 换取手机号） |
| 用户（WxMaUserRest） | `/customer/wx_user/phone` | GET | 按 sessionKey 解密获取手机号 |
| 用户（WxMaUserRest） | `/user/page` | GET | 小程序用户分页查询 |
| 素材（WxMaMediaRest） | `/customer/wx/media/upload` | POST | 上传临时素材，返回 media_id 列表 |
| 素材（WxMaMediaRest） | `/customer/wx/media/download/{mediaId}` | GET | 下载临时素材 |
| 配置（WxappConfigRest） | `/config/page` | GET | 小程序配置分页查询 |
| 配置（WxappConfigRest） | `/config/info` | GET | 配置详情，Secret/Token/AESKey/证书脱敏 |
| 配置（WxappConfigRest） | `/config/create` | POST | 创建配置，appId 唯一校验 |
| 配置（WxappConfigRest） | `/config/update` | POST | 更新配置，掩码字段视为未修改保留原值 |
| 配置（WxappConfigRest） | `/config/remove` | POST | 删除配置，支持单个 id 与批量 ids |

## 数据模型清单

| 实体 | 表名 | 说明 |
| --- | --- | --- |
| WxappConfig | `wxapp_config` | 小程序配置：appId、appSecret、certPem、keyPem、appToken、aesKey、tenantCode |
| WxappUser | `wxapp_user` | 小程序用户：userCode、nickname、appId、openId、unionId、mobile、email、gender、avatar、loginTimes |
| WxappLoginLog | `wxapp_login_log` | 登录日志：userCode、openId、loginIp |

## 配置清单

小程序凭证不使用 YAML 配置，统一存储于 `wxapp_config` 表，按租户（tenantCode）隔离，通过 `/config/create`、`/config/update` 接口维护。

| 配置项 | 说明 | 示例 |
| --- | --- | --- |
| appId | 小程序 AppID | `wx1234567890abcdef` |
| appSecret | 小程序 AppSecret | `a1b2c3d4e5f6...` |
| appToken | 消息服务器配置 Token | `myToken` |
| aesKey | 消息服务器配置 EncodingAESKey | `base64 43 位串` |
| certPem | 证书文件 cert | PEM 文本 |
| keyPem | 证书文件 key | PEM 文本 |

**多 appId 多实例**：`WxMaConfiguration` 维护 `tenantCode → WxMaService`、`tenantCode → WxMaMessageRouter`、`appId → tenantCode` 三张内存映射，首次访问时按 appId/租户从 `wxapp_config` 表懒加载初始化对应的 `WxMaService` 实例；每个 appId 一套独立凭证，天然支撑多小程序、多租户并存。

## 快速接入

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-wxapp</artifactId>
</dependency>
```

### 配置小程序

当前版本小程序凭证由 `wxapp_config` 表配置（见[配置清单](#配置清单)），历史文档的 YAML 写法保留参考：

```yaml
wx:
  miniapp:
    appId: xxx
    secret: xxx
```

### 申请测试号

- 沙箱地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/sandbox.html
- 申请后获取 AppID 和 AppSecret，通过配置接口写入 `wxapp_config` 表
