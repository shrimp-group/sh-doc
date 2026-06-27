# micro-fileos 功能集成文档

## 1. Maven 依赖引入

在主应用的 `pom.xml` 中添加以下依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-fileos</artifactId>
</dependency>
```

模块引入后，`FileosAutoConfig` 会通过 Spring Boot 自动配置机制自动扫描组件和 Mapper，无需手动配置。

---

## 2. 数据库表结构

### 2.1 mdm_fileos_bucket — Bucket 配置表

```sql
CREATE TABLE `mdm_fileos_bucket` (
  `id`              bigint       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_code`     varchar(63)  DEFAULT NULL COMMENT '租户编码',
  `bucket_name`     varchar(127) NOT NULL COMMENT 'Bucket名称',
  `oss_sp`          varchar(31)  NOT NULL COMMENT 'OSS服务商(ALI_OSS/AWS_S3/S3_COMPATIBLE)',
  `endpoint_inner`  varchar(255) DEFAULT NULL COMMENT '内网Endpoint',
  `endpoint_outer`  varchar(255) DEFAULT NULL COMMENT '外网Endpoint',
  `region`          varchar(63)  DEFAULT NULL COMMENT '区域',
  `access_key`      varchar(255) NOT NULL COMMENT 'Access Key',
  `secret_key`      varchar(255) NOT NULL COMMENT 'Secret Key',
  `default_flag`    int          DEFAULT 0  COMMENT '默认标识(1=默认Bucket)',
  `sort`            int          DEFAULT 0  COMMENT '排序',
  `create_time`     datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`       varchar(31)  DEFAULT NULL COMMENT '创建人',
  `update_time`     datetime     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`       varchar(31)  DEFAULT NULL COMMENT '更新人',
  `remark`          varchar(255) DEFAULT NULL COMMENT '备注',
  `version`         int          DEFAULT 0  COMMENT '乐观锁',
  `deleted`         varchar(24)  DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bucket_name` (`bucket_name`, `tenant_code`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件存储Bucket配置';
```

### 2.2 mdm_fileos_record — 文件记录表

```sql
CREATE TABLE `mdm_fileos_record` (
  `id`             bigint        NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_code`    varchar(63)   DEFAULT NULL COMMENT '租户编码',
  `file_id`        varchar(511)  NOT NULL COMMENT '文件存储路径',
  `file_name`      varchar(255)  DEFAULT NULL COMMENT '原始文件名',
  `file_type`      varchar(31)   DEFAULT NULL COMMENT '文件扩展名',
  `file_size`      bigint        DEFAULT NULL COMMENT '文件大小(字节)',
  `file_hash`      varchar(127)  DEFAULT NULL COMMENT '文件Hash',
  `content_type`   varchar(127)  DEFAULT NULL COMMENT 'MIME类型',
  `category`       varchar(63)   DEFAULT NULL COMMENT '业务分类',
  `dir_path`       varchar(511)  DEFAULT NULL COMMENT '所属目录路径',
  `is_public`      int           DEFAULT 0  COMMENT '是否公共读(0=私有,1=公开)',
  `oss_sp`         varchar(31)   DEFAULT NULL COMMENT 'OSS服务商',
  `bucket_name`    varchar(127)  DEFAULT NULL COMMENT '所属Bucket',
  `upload_type`    varchar(31)   DEFAULT NULL COMMENT '上传方式(SIMPLE/MULTIPART/PRESIGN)',
  `upload_id`      varchar(127)  DEFAULT NULL COMMENT '分片上传ID',
  `upload_status`  varchar(31)   DEFAULT NULL COMMENT '上传状态(UPLOADING/COMPLETED/ABORTED)',
  `image_process`  varchar(1023) DEFAULT NULL COMMENT '图片处理参数(JSON)',
  `sort`           int           DEFAULT 0  COMMENT '排序',
  `create_time`    datetime      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`      varchar(31)   DEFAULT NULL COMMENT '创建人',
  `update_time`    datetime      DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`      varchar(31)   DEFAULT NULL COMMENT '更新人',
  `remark`         varchar(255)  DEFAULT NULL COMMENT '备注',
  `version`        int           DEFAULT 0  COMMENT '乐观锁',
  `deleted`        varchar(24)   DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  KEY `idx_file_id` (`file_id`(255)),
  KEY `idx_category` (`category`),
  KEY `idx_file_hash` (`file_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件存储记录';
```

### 2.3 mdm_fileos_directory — 目录表

```sql
CREATE TABLE `mdm_fileos_directory` (
  `id`           bigint       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_code`  varchar(63)  DEFAULT NULL COMMENT '租户编码',
  `bucket_name`  varchar(127) DEFAULT NULL COMMENT '所属Bucket',
  `dir_path`     varchar(511) NOT NULL COMMENT '目录完整路径',
  `dir_name`     varchar(127) DEFAULT NULL COMMENT '目录名',
  `parent_path`  varchar(511) DEFAULT NULL COMMENT '父目录路径',
  `dir_level`    int          DEFAULT NULL COMMENT '目录层级',
  `file_count`   bigint       DEFAULT 0  COMMENT '文件数量',
  `total_size`   bigint       DEFAULT 0  COMMENT '文件总大小(字节)',
  `sort`         int          DEFAULT 0  COMMENT '排序',
  `create_time`  datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`    varchar(31)  DEFAULT NULL COMMENT '创建人',
  `update_time`  datetime     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`    varchar(31)  DEFAULT NULL COMMENT '更新人',
  `remark`       varchar(255) DEFAULT NULL COMMENT '备注',
  `version`      int          DEFAULT 0  COMMENT '乐观锁',
  `deleted`      varchar(24)  DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_bucket_dirpath` (`tenant_code`, `bucket_name`, `dir_path`(255)),
  KEY `idx_parent_path` (`parent_path`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件目录';
```

### 2.4 mdm_fileos_multipart — 分片上传记录表

```sql
CREATE TABLE `mdm_fileos_multipart` (
  `id`              bigint       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_code`     varchar(63)  DEFAULT NULL COMMENT '租户编码',
  `upload_id`       varchar(127) NOT NULL COMMENT '分片上传ID',
  `file_id`         varchar(511) NOT NULL COMMENT '文件存储路径',
  `file_name`       varchar(255) DEFAULT NULL COMMENT '原始文件名',
  `file_size`       bigint       DEFAULT NULL COMMENT '文件大小(字节)',
  `content_type`    varchar(127) DEFAULT NULL COMMENT 'MIME类型',
  `category`        varchar(63)  DEFAULT NULL COMMENT '业务分类',
  `is_public`       int          DEFAULT 0  COMMENT '是否公共读',
  `oss_sp`          varchar(31)  DEFAULT NULL COMMENT 'OSS服务商',
  `bucket_name`     varchar(127) DEFAULT NULL COMMENT '所属Bucket',
  `part_count`      int          DEFAULT NULL COMMENT '分片总数',
  `completed_parts` text         DEFAULT NULL COMMENT '已完成分片信息(JSON)',
  `status`          varchar(31)  DEFAULT 'UPLOADING' COMMENT '状态(UPLOADING/COMPLETED/ABORTED)',
  `expire_time`     datetime     DEFAULT NULL COMMENT '过期时间',
  `sort`            int          DEFAULT 0  COMMENT '排序',
  `create_time`     datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`       varchar(31)  DEFAULT NULL COMMENT '创建人',
  `update_time`     datetime     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`       varchar(31)  DEFAULT NULL COMMENT '更新人',
  `remark`          varchar(255) DEFAULT NULL COMMENT '备注',
  `version`         int          DEFAULT 0  COMMENT '乐观锁',
  `deleted`         varchar(24)  DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  KEY `idx_upload_id` (`upload_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分片上传记录';
```

---

## 3. REST API 接口清单

所有接口前缀：`/micro-fileos`

### 3.1 Bucket 管理

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|--------|
| 1 | GET | `/bucket/page` | Bucket 分页查询 | `MdmFileosBucket` 实体字段作为查询条件 | `R<PageData<MdmFileosBucket>>` |
| 2 | GET | `/bucket/info` | Bucket 详情 | `id` (Long) | `R<MdmFileosBucket>` |
| 3 | POST | `/bucket/create` | 创建 Bucket | `MdmFileosBucket` JSON Body | `R<?>` |
| 4 | POST | `/bucket/update` | 修改 Bucket | `MdmFileosBucket` JSON Body | `R<?>` |
| 5 | POST | `/bucket/remove` | 删除 Bucket | `MdmFileosBucket` JSON Body | `R<?>` |
| 6 | GET | `/bucket/options` | Bucket 选项列表 | `MdmFileosBucket` 实体字段作为查询条件 | `R<List<MdmFileosBucket>>` |

### 3.2 目录管理

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|------|
| 7 | GET | `/directory/list` | 目录列表 | `parentPath` (必填), `bucketName` (可选) | `R<List<MdmFileosDirectory>>` |
| 8 | GET | `/directory/tree` | 目录树 | `bucketName` (可选) | `R<List<MdmFileosDirectoryDto>>` |
| 9 | GET | `/directory/info` | 目录详情 | `dirPath` (必填), `bucketName` (可选) | `R<MdmFileosDirectory>` |

### 3.3 文件上传

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|------|
| 10 | POST | `/upload/simple` | 简单上传 | `file` (MultipartFile), `category` (可选), `bucketName` (可选) | `R<MdmFileosRecordDto>` |
| 11 | POST | `/upload/simple/public` | 公开上传 | `file` (MultipartFile), `category` (可选), `bucketName` (可选) | `R<MdmFileosRecordDto>` |
| 12 | POST | `/upload/multipart/init` | 分片上传初始化 | `MultipartUploadInitRequest` JSON Body | `R<MultipartUploadInitResponse>` |
| 13 | POST | `/upload/multipart/complete` | 分片上传完成 | `MultipartCompleteRequest` JSON Body | `R<MdmFileosRecordDto>` |
| 14 | POST | `/upload/multipart/abort` | 分片上传中止 | `uploadId`, `fileId`, `bucketName` (可选), `ossSp` (可选) | `R<?>` |

### 3.4 文件下载

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|------|
| 15 | GET | `/download/{fileId}` | 文件下载 | `fileId` (路径参数), 支持 `Range` 请求头断点续传 | 文件流 (application/octet-stream) |

### 3.5 预签名上传

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|------|
| 16 | POST | `/presign/upload` | 预签名简单上传 | `PresignUploadRequest` JSON Body | `R<PresignUploadResponse>` |
| 17 | POST | `/presign/upload/batch` | 预签名批量简单上传 | `List<PresignUploadRequest>` JSON Body | `R<List<PresignUploadResponse>>` |
| 18 | POST | `/presign/multipart/init` | 预签名分片上传初始化 | `MultipartUploadInitRequest` JSON Body | `R<MultipartUploadInitResponse>` |
| 19 | POST | `/presign/multipart/complete` | 预签名分片上传完成 | `MultipartCompleteRequest` JSON Body | `R<MdmFileosRecordDto>` |
| 20 | POST | `/presign/multipart/abort` | 预签名分片上传中止 | `uploadId`, `fileId`, `bucketName` (可选), `ossSp` (可选) | `R<?>` |
| 21 | POST | `/presign/complete` | 预签名简单上传完成确认 | `PresignCompleteRequest` JSON Body | `R<MdmFileosRecordDto>` |
| 22 | POST | `/presign/complete/batch` | 预签名批量完成确认 | `List<PresignCompleteRequest>` JSON Body | `R<List<MdmFileosRecordDto>>` |

### 3.6 签名 URL

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|------|
| 23 | GET | `/sign/url` | 单文件签名 | `fileId` (必填), `expireMinutes` (可选) | `R<String>` |
| 24 | POST | `/sign/urls` | 多文件签名 | `List<String>` JSON Body (fileId 列表) | `R<List<String>>` |

### 3.7 文件记录管理

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|------|
| 25 | GET | `/record/page` | 文件记录分页 | `MdmFileosRecord` 实体字段作为查询条件 | `R<PageData<MdmFileosRecord>>` |
| 26 | GET | `/record/info` | 文件记录详情 | `id` (Long) | `R<MdmFileosRecord>` |
| 27 | POST | `/record/remove` | 删除文件记录 | `MdmFileosRecord` JSON Body (含 id) | `R<?>` |

---

## 4. 初始化配置

### 4.1 Bucket 配置

通过 REST API 或直接插入数据库配置 Bucket：

```bash
# 通过 API 创建 Bucket
curl -X POST http://localhost:8080/micro-fileos/bucket/create \
  -H 'Content-Type: application/json' \
  -d '{
    "bucketName": "my-bucket",
    "ossSp": "ALI_OSS",
    "endpointInner": "https://oss-cn-hangzhou-internal.aliyuncs.com",
    "endpointOuter": "https://oss-cn-hangzhou.aliyuncs.com",
    "region": "cn-hangzhou",
    "accessKey": "your-access-key",
    "secretKey": "your-secret-key",
    "defaultFlag": 1
  }'
```

### 4.2 application.yml 配置

```yaml
sh:
  fileos:
    max-size-mb: 50                    # 全局最大文件大小(MB)
    image:
      max-size-mb: 10                  # 图片最大大小(MB)
      extension-names: jpg,jpeg,png,gif,webp,svg,bmp  # 图片扩展名
    video:
      max-size-mb: 500                 # 视频最大大小(MB)
      extension-names: mp4,mpeg,avi,mov,wmv,rm,rmvb,mkv,flv  # 视频扩展名
    presign:
      expire-minutes: 30               # 预签名URL过期时间(分钟)
      multipart:
        expire-minutes: 60             # 分片预签名URL过期时间(分钟)
        default-part-size-mb: 5        # 默认分片大小(MB)
    multipart:
      max-age-hours: 24                # 分片上传记录过期时间(小时)
    hash:
      enabled: true                    # 是否启用Hash去重
      algorithm: SHA-256               # Hash算法
```

---

## 5. 验证集成的方法

### 5.1 检查模块加载

启动应用后，检查控制台日志中是否包含以下信息：

```
FileosAutoConfig 配置已加载
```

### 5.2 验证 Bucket 接口

通过以下命令验证 Bucket 管理接口是否正常：

```bash
# 查询 Bucket 选项列表
curl http://localhost:8080/micro-fileos/bucket/options

# 创建测试 Bucket
curl -X POST http://localhost:8080/micro-fileos/bucket/create \
  -H 'Content-Type: application/json' \
  -d '{
    "bucketName": "test-bucket",
    "ossSp": "ALI_OSS",
    "endpointInner": "https://oss-cn-hangzhou-internal.aliyuncs.com",
    "endpointOuter": "https://oss-cn-hangzhou.aliyuncs.com",
    "accessKey": "test-access-key",
    "secretKey": "test-secret-key",
    "defaultFlag": 1
  }'
```

### 5.3 验证文件上传接口

通过以下命令验证文件上传接口是否正常：

```bash
# 简单上传测试
curl -X POST http://localhost:8080/micro-fileos/upload/simple \
  -F "file=@/path/to/test-file.txt" \
  -F "category=test"
```

### 5.4 验证目录管理接口

通过以下命令验证目录管理接口是否正常：

```bash
# 查询目录树
curl http://localhost:8080/micro-fileos/directory/tree

# 查询子目录列表
curl "http://localhost:8080/micro-fileos/directory/list?parentPath=/"
```

### 5.5 验证预签名上传接口

```bash
# 请求预签名 URL
curl -X POST http://localhost:8080/micro-fileos/presign/upload \
  -H 'Content-Type: application/json' \
  -d '{
    "fileName": "test.jpg",
    "fileSize": 1024,
    "contentType": "image/jpeg",
    "category": "test",
    "expireMinutes": 30
  }'
```

### 5.6 验证签名 URL 接口

```bash
# 先上传文件获取 fileId，然后请求签名 URL
curl "http://localhost:8080/micro-fileos/sign/url?fileId=your-file-id&expireMinutes=60"
```

### 5.7 验证文件记录管理接口

```bash
# 查询文件记录分页
curl "http://localhost:8080/micro-fileos/record/page?current=1&size=10"

# 查询文件记录详情
curl "http://localhost:8080/micro-fileos/record/info?id=1"
```

### 5.8 常见问题排查

1. **Bucket 无法创建**：检查数据库连接是否正常，确认 `mdm_fileos_bucket` 表是否存在
2. **上传失败**：检查 OSS 配置是否正确，包括 accessKey、secretKey、endpoint 等
3. **预签名 URL 生成失败**：确认 Bucket 配置中的 OSS 服务商类型是否正确
4. **文件下载失败**：检查文件是否存在于 OSS，文件路径是否正确
