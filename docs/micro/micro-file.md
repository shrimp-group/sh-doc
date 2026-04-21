# 文件服务

Micro-File 是文件管理微服务模块，提供文件上传、下载、存储管理功能。

## 功能特性

- 多存储支持：支持本地、OSS、MinIO 等存储
- 分片上传：支持大文件分片上传
- 文件管理：文件元数据管理
- 访问控制：文件访问权限控制

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-file</artifactId>
</dependency>
```

### 配置文件存储

```yaml
file:
  storage:
    type: oss
    oss:
      endpoint: xxx
      accessKey: xxx
      secretKey: xxx
```
