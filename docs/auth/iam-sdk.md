# 开发套件

IAM-SDK 是权限系统的开发套件，为其他系统提供权限集成的 SDK。

## 功能特性

- 权限注解：方法级别的权限控制
- 用户上下文：获取当前登录用户
- API 客户端：调用权限服务 API
- 缓存集成：权限数据缓存

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-sdk</artifactId>
</dependency>
```

### 使用注解

```java
@PreAuthorize("hasRole('admin')")
public void adminOnly() {
    // 只有 admin 角色可访问
}
```
