# 高级配置

## 支持的存储服务商

| 服务商 | 说明 |
|--------|------|
| 阿里云 OSS | 阿里云对象存储服务 |
| AWS S3 | 亚马逊云对象存储服务 |
| MinIO | 兼容 S3 协议的开源对象存储 |

## 文件类型配置

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

## 多租户支持

模块支持多租户场景，每个租户可以配置独立的 Bucket。

### 配置方式

通过管理后台的图形化界面进行多租户 Bucket 配置：

- 为不同租户配置独立的 Bucket
- 支持跨租户隔离文件存储
- 支持租户级别的访问控制

### 使用方式

```java
// 上传时自动获取当前租户
MdmFileRecordDto dto = fileApi.upload(file, "business_type");

// 系统会根据当前登录用户的租户编码选择对应的 Bucket
```

## 注意事项

1. **公有文件慎用**：公有文件上传后可被任何人访问，请谨慎使用
2. **Bucket 配置**：首次使用前必须在管理后台配置至少一个 Bucket
3. **签名过期**：私有文件的签名 URL 有过期时间，过期后需要重新签名
4. **文件删除**：删除文件会同时删除存储后端和数据库记录
5. **内网 Endpoint**：服务端使用内网 Endpoint 上传文件，外网 Endpoint 用于生成访问链接

## 常见问题

### Q: 如何切换存储服务商？

A: 在管理后台的 Bucket 配置中修改存储服务商即可，无需修改代码。

### Q: 如何配置多个 Bucket？

A: 在管理后台添加多个 Bucket 配置，将其中一个设置为默认 Bucket。

### Q: 签名 URL 过期了怎么办？

A: 调用后端接口重新获取签名 URL。

### Q: 如何限制上传文件类型？

A: 修改 `application.yml` 中的图片和视频扩展名配置。
