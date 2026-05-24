# 设计思路

## 设计要点

### 多存储后端支持

通过策略模式实现多存储后端支持：

1. **FileosService 接口** - 定义统一的文件操作接口，包含上传、签名、删除等操作
2. **OssSpEnum 枚举** - 定义支持的存储服务商（阿里云 OSS、AWS S3、S3_COMPATIBLE）
3. **动态服务选择** - 运行时根据 Bucket 配置动态选择对应的服务实现

这种设计的好处是：
- 业务代码无需关心底层存储细节
- 切换存储服务商只需修改配置，无需改动代码
- 易于扩展新的存储后端

### Bucket 缓存机制

采用本地缓存 + Redis 分布式通知实现配置热更新：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  管理后台    │────▶│    Redis    │◀────│  服务实例 A  │
│ (修改配置)   │     │  (通知通道)  │     │  (本地缓存)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                                │
                                                │ 12秒检查
                                                ▼
                                        ┌─────────────┐
                                        │  服务实例 B  │
                                        │  (本地缓存)  │
                                        └─────────────┘
```

- **本地缓存**：减少数据库查询，提高性能
- **Redis 通知**：配置变更时通知所有实例刷新
- **定时检查**：每 12 秒检查一次配置变更

### 文件访问安全

#### 私有读（默认）
- 文件上传后默认为私有访问
- 需要通过签名 URL 才能访问
- 支持自定义过期时间（默认 10 分钟）

#### 公有读（慎用）
- 上传时指定为公有文件
- 无需签名即可直接访问
- 适用于公开资源，如网站 Logo

#### 签名机制
- 使用存储服务商的预签名 URL 机制
- 支持单文件、批量文件签名
- 支持富文本内容中的文件 URL 自动签名

### 文件类型限制

通过配置限制上传文件的大小和类型：

- **图片限制**：可配置最大大小（默认 10MB）和允许的格式
- **视频限制**：可配置最大大小（默认 500MB）和允许的格式
- **扩展名检查**：上传时自动检查文件扩展名是否在允许列表中

### 分片上传

支持大文件分片上传：
- 将大文件切分为多个小分片
- 支持并发上传，提高效率
- 支持断点续传，避免重复上传
- 定时清理过期的分片上传记录

### Hash 去重

通过文件内容的 Hash 值实现去重：
- 上传时计算文件内容的 Hash（支持 MD5、SHA-1、SHA-256、SHA-512）
- 检查是否已存在相同内容的文件
- 如存在，复用已有文件，节省存储空间

### 目录管理

自动维护文件目录结构：
- 上传时自动创建目录记录
- 支持目录层级查询
- 异步更新目录文件数量和总大小

### 图片处理

支持阿里云 OSS 的图片处理功能：
- 缩放（按比例、填充、裁剪）
- 裁剪（指定区域）
- 水印（文字水印，支持位置、透明度、字号）

## 文件存储路径规则

文件在存储后端中的路径格式：

```
{system}/{env}/{category}/{date}/[public/]{timestamp}_{seq}_{safeFilename}

示例：
sh-fileos/prod/avatar/20240115/1705300000000_0_a1b2c3d4.jpg
sh-fileos/prod/order_attach/20240115/1705300000000_1_e5f6g7h8.pdf
sh-fileos/prod/logo/20240115/public/1705300000000_0_i9j0k1l2.png
```

- **system**：系统标识
- **env**：环境标识（dev/test/prod）
- **category**：业务类型，用于分类管理
- **date**：上传日期，便于按时间归档
- **timestamp**：时间戳
- **seq**：序号
- **safeFilename**：安全的文件名
- **public/**：可选前缀，公有文件会添加此前缀

公有文件会在路径前添加 `public/` 前缀。

## 核心组件速查

| 组件 | 说明 |
|------|------|
| FileosUploadApi | 文件上传 API |
| FileosSignApi | 文件签名 API |
| FileosDownloadApi | 文件下载 API |
| FileosDeleteApi | 文件删除 API |
| FileosPresignUploadApi | 预签名上传 API |
| FileosService | 文件存储服务接口 |
| AliOssServiceImpl | 阿里云 OSS 实现 |
| S3ServiceImpl | AWS S3 和 S3 兼容实现 |
| MdmFileosBucketService | Bucket 配置服务 |
| MdmFileosRecordService | 文件记录服务 |
| MdmFileosDirectoryService | 目录管理服务 |
| MdmFileosMultipartService | 分片上传服务 |
| BucketCache | Bucket 缓存 |
| PathHelper | 路径处理工具 |
| DirectoryHelper | 目录处理工具 |
| FileHashHelper | 文件 Hash 计算工具 |
| FileTypeHelper | 文件类型检查工具 |
| ImageProcessHelper | 图片处理工具 |
