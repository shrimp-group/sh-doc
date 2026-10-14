# API 规范

## 接口命名规范

### 请求方法规范

| 方法 | 用途 | 幂等性 | 说明 | 使用理由 |
|------|------|--------|------|----------|
| GET | 读取数据 | 是 | 用于查询操作，不修改数据 | GET 天然幂等，可被浏览器缓存，适合查询场景 |
| POST | 提交数据 | 否 | 用于创建或执行业务逻辑 | POST 可携带复杂请求体，适合写入操作，统一使用 POST 便于后端统一处理 |

### URI 结构规范

#### 结构说明

| 层级 | 说明 | 示例 | 是否必需 |
|------|------|------|----------|
| 模块名 | 后端模块标识 | `iam`、`sys`、`cms` | 是 |
| 权限标识 | 免鉴权接口标识 | `public` | 否 |
| 资源名 | 业务资源名称 | `user`、`order` | 是 |
| 操作后缀 | 具体操作类型 | `page`、`list`、`info` | 是 |

#### 结构示例

| 完整 URI | 模块名 | 权限标识 | 资源名 | 操作后缀 | 说明 |
|----------|--------|----------|--------|----------|------|
| `/iam/user/page` | `iam` | - | `user` | `page` | 用户分页查询（需鉴权） |
| `/iam/user/list` | `iam` | - | `user` | `list` | 用户列表查询（需鉴权） |
| `/iam/user/info/{id}` | `iam` | - | `user` | `info` | 用户详情查询（需鉴权） |
| `/iam/user/save` | `iam` | - | `user` | `save` | 用户保存（需鉴权） |
| `/iam/user/remove` | `iam` | - | `user` | `remove` | 用户删除（需鉴权） |
| `/iam/public/login` | `iam` | `public` | `login` | - | 用户登录（免鉴权） |
| `/iam/public/picture/captcha` | `iam` | `public` | `picture` | `captcha` | 获取验证码（免鉴权） |

### 操作后缀与 URI 示例

| 后缀 | 用途 | HTTP 方法 | URI 示例 | 接口描述 | 是否需要鉴权 |
|------|------|-----------|----------|----------|--------------|
| `/page` | 分页查询 | GET | `/iam/user/page` | 获取用户分页 | 是 |
| `/list` | 列表查询 | GET | `/iam/user/list` | 获取用户列表 | 是 |
| `/info` | 详情查询 | GET | `/iam/user/info/{id}` | 获取用户详情 | 是 |
| `/save` | 保存（新增/修改一体） | POST | `/iam/user/save` | 保存用户信息 | 是 |
| `/create` | 新增（仅有新增需求） | POST | `/iam/user/create` | 新增用户 | 是 |
| `/update` | 修改（仅有修改需求） | POST | `/iam/user/update` | 修改用户信息 | 是 |
| `/remove` | 删除（单个/批量） | POST | `/iam/user/remove` | 删除用户 | 是 |
| `/options` | 下拉选项查询 | GET | `/iam/user/options` | 获取用户下拉选项 | 是 |
| - | 登录接口 | POST | `/iam/public/login` | 用户登录 | 否 |
| `/captcha` | 获取验证码 | GET | `/iam/public/picture/captcha` | 获取图片验证码 | 否 |

### 接口组划分规则

| 规则 | 说明 | 示例 |
|------|------|------|
| 去除模块名 | 删除一级模块标识 | `/user/page` → `user` |
| 去除权限标识 | 删除 `public` 层级 | `/public/login` → `login` |
| 去除操作后缀 | 删除末尾操作标识 | `/user/page` → `user` |
| 剩余部分为接口组 | 相同接口组共享业务逻辑 | `user` 接口组 |

## 接口参数规范

### 请求参数列表

| 参数名称 | 参数位置 | 类型 | 默认值 | 必填 | 说明 |
|----------|----------|------|--------|------|------|
| token | header | String | - | 否 | 用户认证 token |
| current | query | Integer | 1 | 否 | 页码 |
| size | query | Integer | 10 | 否 | 每页条数 |
| orderBy | query | String | id desc | 否 | 排序字段 |
| timeFrom | query | String | - | 否 | 时间范围开始 |
| timeTo | query | String | - | 否 | 时间范围结束 |

### 参数格式规范

| 参数类型 | 格式要求 | 示例 |
|----------|----------|------|
| 时间格式 | yyyy-MM-dd HH:mm:ss | 2024-01-01 12:00:00 |
| 日期格式 | yyyy-MM-dd | 2024-01-01 |
| 页码范围 | ≥ 1 | current ≥ 1 |
| 每页条数 | 1-100 | size: 1-100 |

## 接口返回值规范

### 通用返回字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | Integer | 响应码 |
| msg | String | 响应消息 |
| data | Object | 业务数据 |
| requestTime | LocalDateTime | 请求进入时间（生产环境为 null） |
| responseTime | LocalDateTime | 响应返回时间（生产环境为 null） |
| costTime | Long | 请求耗时毫秒（生产环境为 null） |

### 响应码说明

| 响应码 | 含义 | 处理方式 |
|--------|------|----------|
| 200 | 成功 | 正常业务处理 |
| 400 | 参数校验失败 | 提示用户修正参数 |
| 401 | 未授权（token 缺失或会话失效） | 跳转登录 |
| 403 | 禁止访问 | 提示无权限 |
| 404 | 资源不存在 | 提示资源不存在 |
| 429 | 请求过于频繁（限流） | 稍后重试 |
| 500 | 系统错误 | 需要开发人员处理 |
| -1 | 通用业务异常（未指定业务码时兜底） | 提示 msg 内容 |

### 分页返回结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| current | Integer | 当前页码 |
| size | Integer | 每页条数 |
| page | Integer | 总页码数 |
| total | Integer | 数据总条数 |
| offset | Integer | 偏移量 |
| rows | Array | 业务数据列表 |

### 返回值示例

**成功响应：**
```json
{
  "code": 200,
  "msg": "Success",
  "data": {
    "id": 1,
    "name": "John"
  },
  "requestTime": "2024-01-01 12:00:00",
  "responseTime": "2024-01-01 12:00:00",
  "costTime": 100
}
```

**分页响应：**
```json
{
  "code": 200,
  "msg": "Success",
  "data": {
    "current": 1,
    "size": 10,
    "page": 10,
    "total": 100,
    "offset": 0,
    "rows": [...]
  },
  "requestTime": "2024-01-01 12:00:00",
  "responseTime": "2024-01-01 12:00:00",
  "costTime": 150
}
```

## 错误码对照表

ResultCode 仅定义 HTTP 标准语义码（200/400/401/403/404/500）。业务异常使用字符串消息描述（如 `ValidationException.of("数据不存在")`），无预定义业务数字码。

### HTTP 状态类返回码

| 返回码 | 枚举值 | 说明 |
|--------|--------|------|
| 200 | SUCCESS | 请求成功 |
| 400 | VALIDATION_ERROR | 参数校验失败（@Valid、ValidationException） |
| 401 | UNAUTHORIZED | 未授权，跳转登录（UnauthorizedException 或会话过滤器拦截） |
| 403 | FORBIDDEN | 禁止访问 |
| 404 | NOT_FOUND | 资源不存在（NotFoundException 或路由不存在） |
| 429 | - | 请求过于频繁（限流过滤器，非 ResultCode 定义） |
| 500 | ERROR | 系统错误 |
| -1 | - | 通用业务异常兜底（CommonException 及未指定业务码的异常） |

### 未授权响应说明

鉴权失败由会话过滤器统一拦截，返回 HTTP 401，响应体为非标准结构：

```json
{
  "message": "缺少认证 Token"
}
```

| message | 说明 |
|---------|------|
| 缺少认证 Token | 请求未携带 token |
| 会话无效或已过期 | token 校验失败或 Redis 会话不存在 |

### 限流响应说明

限流由请求控制过滤器（RequestControlFilter）拦截，返回 code=429 与提示消息。

## 权限校验规范

### 权限校验规则

| 规则 | 说明 | 示例 |
|------|------|------|
| token 校验 | 需验证权限的接口必须在 header 传 token | Authorization: Bearer xxx |
| 临时 token | 一次性 token 从专用接口获取 | 仅支持 query 参数传递 |
| Origin 判断 | 通过 Origin header 确定前端站点 | 可在 query 附加 |

### 免鉴权接口规则

| 规则 | 说明 | 示例 |
|------|------|------|
| 路径标识 | URI 中包含 `public` 层级 | `/iam/public/login` |
| 白名单 | 配置在安全配置类中 | 无需登录即可访问 |
| 验证码接口 | 获取验证码无需鉴权 | `/iam/public/captcha` |
