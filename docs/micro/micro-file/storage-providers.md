# 存储服务商指南

本文档详细介绍 Micro-File 支持的文件存储服务商，包括申请方式、配置方式、授权方式和费用评估。

## 支持的存储服务商清单

| 服务商 | 类型 | 协议 | 适用场景 | 推荐指数 |
|--------|------|------|----------|----------|
| 阿里云 OSS | 云服务 | OSS | 生产环境、高可用场景 | ★★★★★ |
| AWS S3 | 云服务 | S3 | 国际化业务、AWS生态 | ★★★★☆ |
| 腾讯云 COS | 云服务 | COS | 国内业务、微信生态 | ★★★★☆ |
| 华为云 OBS | 云服务 | OBS | 政企项目、华为生态 | ★★★★☆ |
| MinIO | 自建服务 | S3 | 私有化部署、成本敏感 | ★★★☆☆ |

## 阿里云 OSS

### 服务简介

阿里云对象存储 OSS（Object Storage Service）是阿里云提供的海量、安全、低成本、高可靠的云存储服务。数据设计持久性不低于 99.9999999999%（12 个 9），服务设计可用性不低于 99.995%。

### 申请方式

#### 1. 注册阿里云账号

1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 点击"免费注册"，完成账号注册
3. 完成实名认证（个人或企业）

#### 2. 开通 OSS 服务

1. 登录阿里云控制台
2. 搜索"对象存储 OSS"，进入产品页面
3. 点击"立即开通"
4. 选择计费方式（按量付费或资源包）

#### 3. 创建 AccessKey

1. 进入 [AccessKey 管理页面](https://ram.console.aliyun.com/manage/ak)
2. 建议使用 RAM 子用户 AccessKey（更安全）
3. 创建 RAM 用户并授予 `AliyunOSSFullAccess` 权限
4. 生成 AccessKey ID 和 AccessKey Secret

#### 4. 创建 Bucket

1. 进入 OSS 控制台
2. 点击"创建 Bucket"
3. 配置 Bucket 参数：
   - Bucket 名称：全局唯一
   - 区域：根据业务选择（建议与应用服务器同区域）
   - 存储类型：标准存储（默认）
   - 读写权限：私有（推荐）

### 配置方式

#### 管理后台配置

在系统管理后台的 Bucket 配置页面填写：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Bucket 名称 | 创建的 Bucket 名称 | my-app-files |
| 存储服务商 | 选择"阿里云 OSS" | ALI_OSS |
| 内网 Endpoint | 服务端上传使用 | oss-cn-hangzhou-internal.aliyuncs.com |
| 外网 Endpoint | 客户端访问使用 | oss-cn-hangzhou.aliyuncs.com |
| 区域 | 存储区域 | cn-hangzhou |
| Access Key | AccessKey ID | LTAI5t... |
| Secret Key | AccessKey Secret | xxxxxx... |

#### Endpoint 说明

| 区域 | 内网 Endpoint | 外网 Endpoint |
|------|---------------|---------------|
| 华东1（杭州） | oss-cn-hangzhou-internal.aliyuncs.com | oss-cn-hangzhou.aliyuncs.com |
| 华东2（上海） | oss-cn-shanghai-internal.aliyuncs.com | oss-cn-shanghai.aliyuncs.com |
| 华北2（北京） | oss-cn-beijing-internal.aliyuncs.com | oss-cn-beijing.aliyuncs.com |
| 华南1（深圳） | oss-cn-shenzhen-internal.aliyuncs.com | oss-cn-shenzhen.aliyuncs.com |

### 授权方式

#### Bucket 级别授权

**私有读写（推荐）**：
- 只有 Bucket 拥有者可以读写
- 其他用户需要通过签名 URL 访问
- 适合存储敏感数据

**公共读私有写**：
- 任何人可读，只有拥有者可写
- 适合公开资源（网站图片、静态资源）

#### RAM 授权策略

最小权限策略示例：

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
        "oss:ListObjects"
      ],
      "Resource": [
        "acs:oss:*:*:my-bucket",
        "acs:oss:*:*:my-bucket/*"
      ]
    }
  ]
}
```

#### 跨域配置（CORS）

如果需要前端直传，需配置 CORS 规则：

| 配置项 | 推荐值 |
|--------|--------|
| 来源 | `*` 或指定域名 |
| 允许 Methods | GET, POST, PUT, DELETE, HEAD |
| 允许 Headers | `*` |
| 暴露 Headers | ETag, x-oss-request-id |
| 缓存时间 | 3600 |

### 费用评估

#### 计费项说明

| 计费项 | 说明 | 价格参考 |
|--------|------|----------|
| 存储费用 | 按存储量计费 | 约 0.12 元/GB/月 |
| 流量费用 | 外网流出流量 | 约 0.5 元/GB |
| 请求费用 | API 请求次数 | 约 0.01 元/万次 |
| 数据处理 | 图片处理等 | 按处理量计费 |

#### 成本估算示例

假设场景：
- 月上传文件：10,000 个
- 平均文件大小：500KB
- 月存储量：5GB
- 月下载流量：50GB

月费用估算：
- 存储费用：5GB × 0.12 元 = 0.6 元
- 流量费用：50GB × 0.5 元 = 25 元
- 请求费用：约 1 元
- **合计：约 27 元/月**

#### 成本优化建议

1. **使用内网 Endpoint**：服务端上传免流量费
2. **购买资源包**：大流量场景可购买流量包
3. **生命周期规则**：自动清理过期文件
4. **存储类型选择**：低频访问、归档存储更便宜

---

## AWS S3

### 服务简介

Amazon Simple Storage Service（Amazon S3）是 AWS 提供的对象存储服务，具有高扩展性、数据可用性、安全性和性能。

### 申请方式

#### 1. 注册 AWS 账号

1. 访问 [AWS 官网](https://aws.amazon.com/)
2. 点击"创建 AWS 账号"
3. 完成账号注册和付款方式绑定

#### 2. 创建 IAM 用户

1. 进入 IAM 控制台
2. 创建新用户，选择"编程访问"
3. 授予 `AmazonS3FullAccess` 权限
4. 获取 Access Key ID 和 Secret Access Key

#### 3. 创建 S3 Bucket

1. 进入 S3 控制台
2. 点击"创建存储桶"
3. 配置 Bucket 参数：
   - Bucket 名称：全局唯一
   - 区域：根据业务选择
   - 公共访问设置：建议阻止公共访问

### 配置方式

#### 管理后台配置

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Bucket 名称 | S3 Bucket 名称 | my-app-files |
| 存储服务商 | 选择"AWS S3" | AWS_S3 |
| 内网 Endpoint | 内网地址（VPC 内） | s3.cn-north-1.amazonaws.com.cn |
| 外网 Endpoint | 外网地址 | s3.cn-north-1.amazonaws.com.cn |
| 区域 | 存储区域 | cn-north-1 |
| Access Key | Access Key ID | AKIA... |
| Secret Key | Secret Access Key | xxxxxx... |

### 授权方式

#### Bucket Policy 示例

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAppAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/app-user"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

### 费用评估

| 计费项 | 价格参考 |
|--------|----------|
| 存储费用 | 约 0.15 元/GB/月 |
| 流量费用 | 约 0.6 元/GB |
| 请求费用 | 约 0.005 元/万次 |

---

## 腾讯云 COS

### 服务简介

腾讯云对象存储（Cloud Object Storage，COS）是腾讯云提供的存储服务，具有高扩展性、低成本、可靠安全等特点。

### 申请方式

#### 1. 注册腾讯云账号

1. 访问 [腾讯云官网](https://cloud.tencent.com/)
2. 完成账号注册和实名认证

#### 2. 开通 COS 服务

1. 搜索"对象存储 COS"
2. 点击"立即使用"开通服务

#### 3. 创建密钥

1. 进入 [访问管理 - 访问密钥](https://console.cloud.tencent.com/cam/capi)
2. 创建密钥，获取 SecretId 和 SecretKey

#### 4. 创建存储桶

1. 进入 COS 控制台
2. 创建存储桶，配置参数

### 配置方式

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Bucket 名称 | 存储桶名称 | my-app-1234567890 |
| 存储服务商 | 选择"腾讯云 COS" | TENCENT_COS |
| 内网 Endpoint | 内网地址 | cos.ap-guangzhou.myqcloud.com |
| 外网 Endpoint | 外网地址 | cos.ap-guangzhou.myqcloud.com |
| 区域 | 存储区域 | ap-guangzhou |
| Access Key | SecretId | xxxxxx... |
| Secret Key | SecretKey | xxxxxx... |

### 费用评估

| 计费项 | 价格参考 |
|--------|----------|
| 存储费用 | 约 0.118 元/GB/月 |
| 流量费用 | 约 0.5 元/GB |
| 请求费用 | 约 0.01 元/万次 |

---

## 华为云 OBS

### 服务简介

华为云对象存储服务（Object Storage Service，OBS）是华为云提供的海量、安全、高可靠、低成本的数据存储服务。

### 申请方式

#### 1. 注册华为云账号

1. 访问 [华为云官网](https://www.huaweicloud.com/)
2. 完成账号注册和实名认证

#### 2. 开通 OBS 服务

1. 搜索"对象存储服务 OBS"
2. 开通服务

#### 3. 创建访问密钥

1. 进入"我的凭证"页面
2. 创建访问密钥，获取 AK 和 SK

#### 4. 创建桶

1. 进入 OBS 控制台
2. 创建桶，配置参数

### 配置方式

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Bucket 名称 | 桶名称 | my-app-files |
| 存储服务商 | 选择"华为云 OBS" | HUAWEI_OBS |
| 内网 Endpoint | 内网地址 | obs.cn-north-4.myhuaweicloud.com |
| 外网 Endpoint | 外网地址 | obs.cn-north-4.myhuaweicloud.com |
| 区域 | 存储区域 | cn-north-4 |
| Access Key | AK | xxxxxx... |
| Secret Key | SK | xxxxxx... |

### 费用评估

| 计费项 | 价格参考 |
|--------|----------|
| 存储费用 | 约 0.099 元/GB/月 |
| 流量费用 | 约 0.5 元/GB |
| 请求费用 | 约 0.01 元/万次 |

---

## MinIO

### 服务简介

MinIO 是高性能的分布式对象存储服务，兼容 Amazon S3 API，适合私有化部署场景。

### 申请方式

MinIO 是开源软件，无需申请，自行部署即可使用。

#### Docker 部署

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -v /data/minio:/data \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=admin123 \
  minio/minio server /data --console-address ":9001"
```

#### 访问控制台

- API 地址：http://localhost:9000
- 控制台地址：http://localhost:9001
- 默认账号：admin / admin123

### 配置方式

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Bucket 名称 | MinIO Bucket 名称 | my-app-files |
| 存储服务商 | 选择"MinIO" | MINIO |
| 内网 Endpoint | 内网地址 | localhost:9000 |
| 外网 Endpoint | 外网地址 | minio.example.com:9000 |
| 区域 | 区域标识 | us-east-1 |
| Access Key | 访问密钥 | admin |
| Secret Key | 密钥 | admin123 |

### 授权方式

#### 创建访问策略

MinIO 控制台创建策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

### 费用评估

MinIO 为开源免费软件，主要成本为服务器资源：

| 成本项 | 说明 |
|--------|------|
| 服务器费用 | 根据配置和存储容量 |
| 带宽费用 | 根据流量计费 |
| 运维成本 | 需要自行维护 |

**适用场景**：
- 私有化部署需求
- 数据安全要求高
- 成本敏感场景
- 有运维能力

---

## 存储服务商对比

### 功能对比

| 功能 | 阿里云 OSS | AWS S3 | 腾讯云 COS | 华为云 OBS | MinIO |
|------|-----------|--------|-----------|-----------|-------|
| 存储容量 | 无限 | 无限 | 无限 | 无限 | 取决于硬件 |
| 数据持久性 | 99.9999999999% | 99.999999999% | 99.999999999% | 99.999999999% | 取决于部署 |
| 服务可用性 | 99.995% | 99.99% | 99.99% | 99.99% | 取决于部署 |
| 图片处理 | 支持 | 支持 | 支持 | 支持 | 需额外配置 |
| 视频处理 | 支持 | 支持 | 支持 | 支持 | 需额外配置 |
| CDN 加速 | 支持 | 支持 | 支持 | 支持 | 需额外配置 |
| 跨区域复制 | 支持 | 支持 | 支持 | 支持 | 支持 |

### 成本对比（月费用估算）

假设场景：存储 100GB，月流量 200GB

| 服务商 | 存储费用 | 流量费用 | 合计 |
|--------|----------|----------|------|
| 阿里云 OSS | 12 元 | 100 元 | 112 元 |
| AWS S3 | 15 元 | 120 元 | 135 元 |
| 腾讯云 COS | 12 元 | 100 元 | 112 元 |
| 华为云 OBS | 10 元 | 100 元 | 110 元 |
| MinIO | 服务器成本 | 带宽成本 | 视情况 |

### 选型建议

| 场景 | 推荐服务商 | 理由 |
|------|-----------|------|
| 国内生产环境 | 阿里云 OSS | 稳定性高、生态完善、文档丰富 |
| 国际化业务 | AWS S3 | 全球节点、AWS 生态 |
| 微信生态业务 | 腾讯云 COS | 与微信生态集成好 |
| 政企项目 | 华为云 OBS | 合规性好、政企支持 |
| 私有化部署 | MinIO | 开源免费、数据自主可控 |
| 成本敏感 | MinIO / 华为云 OBS | 成本较低 |

## 最佳实践

### 安全建议

1. **使用私有读写**：默认使用私有访问，通过签名 URL 授权
2. **最小权限原则**：RAM/IAM 用户只授予必要的权限
3. **定期轮换密钥**：定期更换 AccessKey
4. **开启日志审计**：记录所有访问操作
5. **启用版本控制**：防止误删除

### 性能优化

1. **使用内网 Endpoint**：服务端上传免流量费且速度快
2. **开启 CDN 加速**：提升用户访问速度
3. **合理设置签名过期时间**：避免频繁签名
4. **使用并发上传**：大文件分片并发上传

### 成本控制

1. **生命周期规则**：自动清理过期文件
2. **存储分级**：低频文件转低频存储
3. **购买资源包**：大流量场景购买流量包
4. **监控告警**：设置费用告警阈值
