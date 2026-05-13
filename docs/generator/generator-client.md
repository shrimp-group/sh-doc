# 代码生成客户端

Generator-Client 是代码生成系统的客户端模块，为其他项目提供代码生成的调用接口。

## 功能特性

- API 客户端：调用代码生成服务
- 模板下载：下载生成好的代码模板
- 项目配置：配置项目生成参数
- 本地生成：支持本地代码生成

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.generator</groupId>
    <artifactId>generator-client</artifactId>
</dependency>
```

### 配置服务地址

```yaml
generator:
  server:
    url: http://localhost:8080
```
