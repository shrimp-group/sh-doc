# 功能集成

## 添加依赖

在项目的 `pom.xml` 中添加依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-file</artifactId>
    <version>${revision}</version>
</dependency>
```

## 数据库初始化

模块启动时会自动创建所需的数据表。首次使用前，需要通过管理后台配置 Bucket 信息。

## 配置文件

在 `application.yml` 中配置文件服务参数：

### 图片配置

| 配置项 | 是否必填 | 默认值 | 可选值 | 说明 |
|--------|----------|--------|--------|------|
| `shrimp.fs.image.max-size-mb` | 否 | 2 | 正整数 | 图片最大大小，单位 MB |
| `shrimp.fs.image.extension-names` | 否 | jpg,jpeg,png,gif,webp | 逗号分隔的扩展名 | 支持的图片格式 |

### 视频配置

| 配置项 | 是否必填 | 默认值 | 可选值 | 说明 |
|--------|----------|--------|--------|------|
| `shrimp.fs.video.max-size-mb` | 否 | 100 | 正整数 | 视频最大大小，单位 MB |
| `shrimp.fs.video.extension-names` | 否 | mp4,mpeg,avi,mov,wmv,rm,rmvb | 逗号分隔的扩展名 | 支持的视频格式 |

### 配置示例

```yaml
shrimp:
  fs:
    image:
      max-size-mb: 5
      extension-names: jpg,jpeg,png,gif,webp,bmp
    video:
      max-size-mb: 500
      extension-names: mp4,mpeg,avi,mov,wmv,rm,rmvb,mkv
```

## Bucket 配置

Bucket 配置用于连接文件存储后端（如阿里云 OSS、MinIO 等）。

### 配置方式

通过管理后台的图形化界面进行 Bucket 配置，支持：

- 添加多个 Bucket
- 设置默认 Bucket
- 配置存储服务商（阿里云 OSS、AWS S3、MinIO）
- 配置内外网 Endpoint
- 配置访问密钥

### 配置字段说明

| 字段 | 是否必填 | 说明 |
|------|----------|------|
| Bucket 名称 | 是 | 存储桶名称 |
| 存储服务商 | 是 | 选择阿里云 OSS、AWS S3 或 MinIO |
| 内网 Endpoint | 是 | 服务端上传文件使用的地址 |
| 外网 Endpoint | 是 | 客户端访问文件使用的地址 |
| 区域 | 是 | 存储区域，如 cn-hangzhou |
| Access Key | 是 | 访问密钥 |
| Secret Key | 是 | 密钥 |
| 默认标识 | 否 | 是否为默认 Bucket |

### 多 Bucket 配置

支持配置多个 Bucket，系统会根据以下规则自动选择：

1. 如果指定了 Bucket 名称，使用指定的 Bucket
2. 如果未指定，使用默认 Bucket
3. 如果没有默认 Bucket，使用第一个可用的 Bucket

## 验证集成

启动应用后，可以通过以下方式验证集成是否成功：

1. **检查 Bucket 缓存**：查看日志中是否输出 `micro-file: bucket更新成功`
2. **测试上传接口**：调用文件上传接口测试
3. **检查数据库**：确认文件记录是否正确写入
