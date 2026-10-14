# 存储服务商指南

本文档聚焦 Micro-FileOS 各存储服务商的申请、开通与按需授权。

- Bucket 的创建与管理 REST API：见 [功能集成](./integration) 初始化配置章节
- Bucket 字段定义与数据库表结构：见 [功能集成](./integration) 数据库表结构章节
- 文件上传使用方式：见 [后端使用指南](./backend-usage)

## 1. 支持的存储服务商清单

| 服务商 | 类型 | 协议 | 底层实现 | 适用场景 | 推荐指数 |
|--------|------|------|----------|----------|----------|
| 阿里云 OSS | 云服务 | OSS | `AliOssServiceImpl` | 生产环境、高可用场景 | ★★★★★ |
| AWS S3 | 云服务 | S3 | `S3ServiceImpl` | 国际化业务、AWS 生态 | ★★★★☆ |
| S3 兼容存储（MinIO） | 自建服务 | S3 | `S3ServiceImpl` | 私有化部署、成本敏感 | ★★★☆☆ |

### 1.1 OSS 服务商枚举

| 枚举值 | 说明 |
|--------|------|
| `ALI_OSS` | 阿里云 OSS，使用 `aliyun-sdk-oss` SDK |
| `AWS_S3` | AWS S3，使用 AWS SDK `software.amazon.awssdk:s3` |
| `S3_COMPATIBLE` | S3 兼容存储（如 MinIO），同样使用 AWS S3 SDK |

---

## 2. 阿里云 OSS

### 2.1 服务简介

阿里云对象存储 OSS（Object Storage Service）是阿里云提供的海量、安全、低成本、高可靠的云存储服务。数据设计持久性不低于 99.9999999999%（12 个 9），服务设计可用性不低于 99.995%。

### 2.2 申请开通

#### 1. 注册阿里云账号

1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 点击"免费注册"，完成账号注册
3. 完成实名认证（个人或企业）

#### 2. 开通 OSS 服务

1. 登录阿里云控制台
2. 搜索"对象存储 OSS"，进入产品页面
3. 点击"立即开通"
4. 选择计费方式（按量付费或资源包）

#### 3. 创建 Bucket

1. 进入 OSS 控制台
2. 点击"创建 Bucket"
3. 配置 Bucket 参数：
   - Bucket 名称：全局唯一
   - 区域：根据业务选择（建议与应用服务器同区域）
   - 存储类型：标准存储（默认）
   - 读写权限：私有（推荐）

### 2.3 访问授权（按需授权）

不建议为 RAM 用户直接绑定阿里云预置的 OSS 全量授权策略，应遵循最小权限原则，仅授予业务所需 Bucket 的必要 Action。建议使用 RAM 子用户 AccessKey，而非主账号 AccessKey。

创建自定义权限策略并生成 AccessKey 的步骤：

1. 进入 [RAM 控制台](https://ram.console.aliyun.com/)，选择"权限策略" → "创建权限策略"
2. 选择"脚本编辑"，粘贴下方策略 JSON（将 `my-bucket` 替换为实际 Bucket 名称）
3. 进入"用户"页面，为 RAM 用户绑定该权限策略
4. 在 [AccessKey 管理页面](https://ram.console.aliyun.com/manage/ak) 为该 RAM 用户生成 AccessKey，获取 AccessKey ID 与 AccessKey Secret

最小权限策略 JSON 示例：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject",
        "oss:ListObjects",
        "oss:GetBucketInfo",
        "oss:AbortMultipartUpload",
        "oss:ListMultipartUploads",
        "oss:ListParts"
      ],
      "Resource": [
        "acs:oss:*:*:my-bucket",
        "acs:oss:*:*:my-bucket/*"
      ]
    }
  ]
}
```

Action 说明：

| Action | 用途 |
|--------|------|
| `oss:PutObject` | 上传文件 |
| `oss:GetObject` | 下载 / 预签名读取 |
| `oss:DeleteObject` | 删除文件 |
| `oss:ListObjects` | 列举文件（目录树） |
| `oss:GetBucketInfo` | 校验 Bucket |
| `oss:AbortMultipartUpload` / `oss:ListMultipartUploads` / `oss:ListParts` | 分片上传管理 |

> 提示：如需多个 Bucket，将 Resource 中的 bucket 名替换或追加即可；预签名直传场景仅需上述 Action 即可。

### 2.4 Endpoint 参考

| 区域 | 内网 Endpoint | 外网 Endpoint |
|------|--------------|--------------|
| 华东1（杭州） | `https://oss-cn-hangzhou-internal.aliyuncs.com` | `https://oss-cn-hangzhou.aliyuncs.com` |
| 华东2（上海） | `https://oss-cn-shanghai-internal.aliyuncs.com` | `https://oss-cn-shanghai.aliyuncs.com` |
| 华北1（青岛） | `https://oss-cn-qingdao-internal.aliyuncs.com` | `https://oss-cn-qingdao.aliyuncs.com` |
| 华北2（北京） | `https://oss-cn-beijing-internal.aliyuncs.com` | `https://oss-cn-beijing.aliyuncs.com` |
| 华南1（深圳） | `https://oss-cn-shenzhen-internal.aliyuncs.com` | `https://oss-cn-shenzhen.aliyuncs.com` |

### 2.5 注意事项

- 阿里云 OSS 使用 V4 签名，需确保 SDK 版本兼容
- 内网 Endpoint 仅在阿里云 ECS 同区域时可用，否则请使用外网 Endpoint
- 预签名上传场景必须配置 `endpointOuter`，否则客户端无法访问

---

## 3. AWS S3

### 3.1 服务简介

Amazon Simple Storage Service（Amazon S3）是 AWS 提供的对象存储服务，具有高扩展性、数据可用性、安全性和性能。

### 3.2 申请开通

#### 1. 注册 AWS 账号

1. 访问 [AWS 官网](https://aws.amazon.com/)
2. 点击"创建 AWS 账号"
3. 完成账号注册和付款方式绑定

#### 2. 创建 IAM 用户

1. 进入 IAM 控制台
2. 创建新用户，选择"编程访问"
3. 先按 [3.3 访问授权](#_3-3-访问授权-按需授权) 创建自定义权限策略并绑定
4. 获取 Access Key ID 和 Secret Access Key

#### 3. 创建 S3 Bucket

1. 进入 S3 控制台
2. 点击"创建存储桶"
3. 配置 Bucket 参数：
   - Bucket 名称：全局唯一
   - 区域：根据业务选择
   - 公共访问设置：建议阻止公共访问

### 3.3 访问授权（按需授权）

不建议为 IAM 用户直接绑定 AWS 预置的 S3 全量授权策略，应遵循最小权限原则，仅授予业务所需 Bucket 的必要 Action。

自定义 IAM 策略 JSON 示例（将 `my-bucket` 替换为实际 Bucket 名称）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

Action 说明：

- `s3:ListBucket`：作用于 Bucket 本身（对应 Resource `arn:aws:s3:::my-bucket`），用于列举 Bucket 内的文件
- `s3:PutObject` / `s3:GetObject` / `s3:DeleteObject` 等对象级操作：作用于 Bucket 内对象（对应 Resource `arn:aws:s3:::my-bucket/*`）

### 3.4 Endpoint 参考

| 区域 | Endpoint |
|------|----------|
| 美国东部（弗吉尼亚北部） | `https://s3.us-east-1.amazonaws.com` |
| 美国西部（俄勒冈） | `https://s3.us-west-2.amazonaws.com` |
| 欧洲（爱尔兰） | `https://s3.eu-west-1.amazonaws.com` |
| 亚太（东京） | `https://s3.ap-northeast-1.amazonaws.com` |
| 亚太（新加坡） | `https://s3.ap-southeast-1.amazonaws.com` |

### 3.5 注意事项

- AWS S3 无内网/外网区分，`endpointInner` 可不配置
- `region` 必须与 Bucket 所在区域一致
- IAM 策略需授予 `s3:PutObject`、`s3:GetObject`、`s3:DeleteObject` 等必要权限，自定义策略见 [3.3 访问授权](#_3-3-访问授权-按需授权)

---

## 4. MinIO（S3 兼容存储）

### 4.1 服务简介

MinIO 是高性能的分布式对象存储服务，兼容 Amazon S3 API，适合私有化部署场景。

### 4.2 Docker 部署

```yaml
# docker-compose.yml
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

volumes:
  minio-data:
```

部署后访问控制台：

- API 地址：`http://localhost:9000`
- 控制台地址：`http://localhost:9001`
- 默认账号：minioadmin / minioadmin

> 生产环境务必修改默认口令。

### 4.3 AccessKey 管理与授权（按需授权）

不应使用 root 账号（minioadmin）作为业务 AccessKey，应在控制台单独创建业务用户，并遵循最小权限原则授权。

创建自定义 policy 并绑定业务用户的步骤：

1. 登录 MinIO 控制台，进入 Identity → Policies → Create Policy
2. 粘贴下方策略 JSON（将 `my-bucket` 替换为实际 Bucket 名称）
3. 进入 Identity → Users，创建业务用户
4. 为该用户绑定上述 policy，该用户的 Access Key / Secret Key 即为业务 AccessKey

最小权限策略 JSON 示例（MinIO 兼容 AWS IAM 语法）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

### 4.4 Endpoint 说明

MinIO 常用地址：S3 API 地址为 `http://<host>:9000`，控制台地址为 `http://<host>:9001`（本地部署即 `localhost`）。

Bucket 配置中的内外网 Endpoint 用法：

- `endpointInner`：内网 Endpoint，适用于 Docker 内网或 K8s 集群内部访问（如 `http://minio:9000`），服务端访问优先使用
- `endpointOuter`：外网 Endpoint，用于生成预签名 URL 供客户端直传（如 `http://192.168.1.100:9000`）

### 4.5 注意事项

- `ossSp` 必须设为 `S3_COMPATIBLE`，底层使用 AWS S3 SDK 的自定义 Endpoint 模式
- MinIO 默认 `region` 为 `us-east-1`，除非自定义配置
- 开发环境可使用 HTTP，生产环境建议配置 HTTPS
- `endpointInner` 适用于 Docker 内网或 K8s 集群内部访问

---

## 5. 服务商对比与选型

### 5.1 功能对比

| 功能 | 阿里云 OSS | AWS S3 | MinIO |
|------|-----------|--------|-------|
| 存储容量 | 无限 | 无限 | 取决于硬件 |
| 数据持久性 | 99.9999999999% | 99.999999999% | 取决于部署 |
| 服务可用性 | 99.995% | 99.99% | 取决于部署 |
| 图片处理 | 支持 | 支持 | 需额外配置 |
| 视频处理 | 支持 | 支持 | 需额外配置 |
| CDN 加速 | 支持 | 支持 | 需额外配置 |
| 跨区域复制 | 支持 | 支持 | 支持 |

### 5.2 成本对比（月费用估算）

假设场景：存储 100GB，月流量 200GB

| 服务商 | 存储费用 | 流量费用 | 合计 |
|--------|----------|----------|------|
| 阿里云 OSS | 12 元 | 100 元 | 112 元 |
| AWS S3 | 15 元 | 120 元 | 135 元 |
| MinIO | 服务器成本 | 带宽成本 | 视情况 |

### 5.3 选型建议

| 场景 | 推荐服务商 | 理由 |
|------|-----------|------|
| 国内生产环境 | 阿里云 OSS | 稳定性高、生态完善、文档丰富 |
| 国际化业务 | AWS S3 | 全球节点、AWS 生态 |
| 私有化部署 | MinIO | 开源免费、数据自主可控 |
| 成本敏感 | MinIO | 无云服务费用 |

---

## 6. 最佳实践

### 6.1 安全建议

1. **使用私有读写**：默认使用私有访问，通过签名 URL 授权
2. **最小权限原则**：RAM/IAM 用户只授予必要的权限，自定义策略见各服务商"访问授权"章节
3. **定期轮换密钥**：定期更换 AccessKey
4. **开启日志审计**：记录所有访问操作
5. **启用版本控制**：防止误删除
6. **跨域配置**：如果需要前端直传，需配置 CORS 规则

### 6.2 性能优化

1. **使用内网 Endpoint**：服务端上传免流量费且速度快
2. **开启 CDN 加速**：提升用户访问速度
3. **合理设置签名过期时间**：避免频繁签名
4. **使用并发上传**：大文件分片并发上传
5. **就近选择区域**：Bucket 区域应接近用户群体

### 6.3 成本控制

1. **生命周期规则**：自动清理过期文件
2. **存储分级**：低频文件转低频存储
3. **购买资源包**：大流量场景购买流量包
4. **监控告警**：设置费用告警阈值
5. **使用内网 Endpoint**：服务端上传免流量费
