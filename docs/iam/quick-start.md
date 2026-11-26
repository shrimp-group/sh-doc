# 快速开始

按使用场景选择路径：

| 场景 | 路径 |
| ---- | ---- |
| 业务应用需要登录鉴权 | [路径一：业务应用集成 SDK](#路径一-业务应用集成-sdk) |
| 搭建认证/管理中心 | [路径二：认证/管理服务独立部署](#路径二-认证-管理服务独立部署) |
| 参与前端开发联调 | [路径三：前端本地开发](#路径三-前端本地开发) |

前置依赖：JDK 25+、Maven 3.9+、MySQL、Redis；前端开发需 Node.js 18+（Vite 6 要求）。

## 路径一：业务应用集成 SDK

业务应用引入 iam-session 依赖，自动装配会话校验、URL 鉴权与请求控制。

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-session</artifactId>
</dependency>
```

groupId 统一为 `com.wkclz.iam`，版本由父工程 sh-parent 统一管理。

### 最小配置

```yaml
iam:
  session:
    token:
      secret-key: "<your-jwt-secret-key>"   # HS256 密钥，≥32 字符，须与认证中心一致
```

仅此一项必配（代码有内置默认值，仅限本地开发）。其余配置项均有合理默认：

```yaml
iam:
  session:
    token:
      ttl: 172800            # Token 有效期（秒），默认 48h
    white-list: ""           # 扩展白名单（Ant 风格，逗号分隔），默认白名单 /**/public/**
    max-concurrent: 0        # 同一用户最大并发会话数，0 不限制
    redis-ttl: 86400         # Redis 会话 TTL（秒），默认 24h
  request-control:
    enabled: true            # 请求控制全局开关（API 级开关默认关闭）
```

完整配置说明见 [会话模块](./iam-session)。配置后 Token 通过请求头 `Authorization: Bearer <token>` 或 `token: <token>` 传递。

### 验证

- 未携带 Token 访问受保护接口，返回 401
- 从认证中心登录获取 Token 后携带访问，返回业务数据

## 路径二：认证/管理服务独立部署

认证中心（iam-portal-starter）与管理中心（iam-admin-starter）为两个独立 Spring Boot 服务。

### 构建打包

在 sh-iam 仓库根目录执行：

```bash
mvn package -DskipTests
```

产物：

- `iam-portal-starter/target/iam-portal-starter-<version>.jar` —— 认证中心
- `iam-admin-starter/target/iam-admin-starter-<version>.jar` —— 管理中心

### 启动服务

```bash
java -jar iam-portal-starter-<version>.jar --spring.profiles.active=prod
java -jar iam-admin-starter-<version>.jar --spring.profiles.active=prod
```

默认端口均为 8080（监控端口 50000），需提前准备 MySQL 与 Redis，配置骨架与完整部署步骤见 [部署指南](./deployment)。

## 路径三：前端本地开发

iam-admin-ui（授权中心）与 iam-portal-ui（单点登录）为两个独立前端工程。

```bash
# 安装依赖（任选一个前端工程）
pnpm install

# 启动开发服务
npm run dev

# 生产构建
npm run build
```

### env.js local 模式

前端根目录 `env.js` 按 host 判定环境：`127.0.0.1` / `localhost` 访问时进入 local 模式，local 配置如下：

| 工程 | appCode | local 配置 |
| ---- | ------- | ---------- |
| iam-admin-ui | `auth` | `portal: '/portal'`，`baseApi: '/api'` |
| iam-portal-ui | `portal` | `baseApi: '/api'` |

- dev server 通过 proxy 将 `/api`（及 admin-ui 的 `/portal` 前缀）转发到目标服务，转发目标在 `vite.config.js` 中按需修改
- localStorage 中设置 `mock-api` / `mock-portal` 可覆盖对应地址，用于直连任意环境
- 机制详见 [部署指南 · env.js 环境配置](./deployment#env-js-环境配置机制)

## 阅读路径指引

按关注点选择模块文档：

| 想了解 | 阅读 | 说明 |
| ---- | ---- | ---- |
| 会话校验、Token、请求控制 | [iam-session](./iam-session) | 业务应用集成的核心 SDK |
| 登录、注册、个人中心 | [iam-portal](./iam-portal) | 认证中心服务端能力与 SPI |
| 认证中心如何启动部署 | [iam-portal-starter](./iam-portal-starter) | 独立启动器 |
| 用户/角色/菜单管理 | [iam-admin](./iam-admin) | 管理中心服务端能力 |
| 管理中心如何启动部署 | [iam-admin-starter](./iam-admin-starter) | 独立启动器 |
| 门户/管理前端 | [iam-portal-ui](./iam-portal-ui) / [iam-admin-ui](./iam-admin-ui) | 技术栈与命令 |
