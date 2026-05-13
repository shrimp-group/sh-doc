# 审计服务

Micro-Audit 是审计日志微服务模块，提供数据变更审计和日志记录功能。

## 功能特性

- 变更审计：自动记录数据变更日志
- 字段对比：记录变更前后的字段值
- 操作追溯：追溯数据修改历史
- 注解支持：通过注解开启审计

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-audit</artifactId>
</dependency>
```

### 使用注解

```java
@AuditLog("用户管理")
public void updateUser(User user) {
    // 自动记录审计日志
}
```
