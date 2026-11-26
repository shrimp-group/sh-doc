# 公共模块

IAM-Common 是权限系统的公共模块，提供通用的实体类、DTO、事件定义与工具类，被 iam-portal、iam-session、iam-admin 等模块共同依赖。

## 功能特性

- 实体类定义：用户、应用、租户、角色、菜单、API、AK 等主数据实体，及用户认证、密码、登录记录等安全实体
- 关联关系实体：角色-菜单、菜单-API、用户-角色等多对多关联实体
- DTO 体系：与实体一一对应的传输对象，及跨表聚合 DTO
- 事件定义：管理端安全事件
- 工具类：IP 归属地本地缓存解析等

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-common</artifactId>
</dependency>
```

模块依赖框架模块 sh-web 与 spring-boot-starter。

## 包结构

```
com.wkclz.iam.common
├── entity   # 数据库实体
├── dto      # 传输对象
├── event    # 事件定义
└── helper   # 工具类
```

## 实体体系

### 主数据实体

| 实体 | 说明 |
| ---- | ---- |
| IamUser | 用户 |
| IamApp | 应用 |
| IamTenant | 租户 |
| IamRole | 角色 |
| IamMenu | 菜单 |
| IamApi | API 资源 |
| IamApiField | API 字段 |
| IamAccessKey | AK 访问密钥 |
| IamDataDimension | 数据维度 |

### 安全实体

| 实体 | 说明 |
| ---- | ---- |
| IamUserAuth | 用户认证信息（认证标识、状态、最后登录 IP 等） |
| IamUserAuthPassword | 用户密码（hash、salt、最后修改时间，登录校验与过期判断依据） |
| IamUserPasswordHis | 密码变更历史（历史密码检查） |
| IamLoginRecord | 登录记录（登录状态、IP、User-Agent 等） |
| IamRequestRecord | 请求记录（含 IP 归属地、ISP） |

### 关联关系实体

| 实体 | 关联关系 |
| ---- | ---- |
| IamUserRole | 用户-角色 |
| IamRoleMenu | 角色-菜单 |
| IamRoleData | 角色-数据维度 |
| IamMenuApi | 菜单-API |
| IamMenuField | 菜单-字段 |
| IamAccessKeyApi | AK-API |

## DTO 体系

- 每个实体均有对应的 `IamXxxDto`（如 `IamUserDto`、`IamRoleDto`），用于接口传输
- 聚合 DTO：`IamUserAuthDto` 聚合认证状态、密码、salt 与密码最后修改时间，供登录凭证校验一次查询取齐；`IamLoginRecordDto`、`IamRequestRecordDto` 用于记录类查询

## 事件定义

- `AdminSecurityEvent`：管理端安全事件，供上层模块监听审计

## 工具能力

### IpLocalCacheHelper

IP 归属地本地缓存解析，供请求日志等场景补全 IP 归属地与 ISP：

- 本地缓存：Guava Cache，容量上限 10000 条，写入后 24 小时过期
- 写队列：`offerQueue` 入队（Set 去重，重复 IP 不重复入队），缓存命中时直接返回实时结果；`pollQueue` 出队（出队后允许再次入队）
- 归属地解析：局域网 IP 直接标记为本地局域网；公网 IP 调用外部归属地查询服务 `<IP 归属地查询服务地址>`，解析出位置与运营商；解析失败标记为未知并缓存
