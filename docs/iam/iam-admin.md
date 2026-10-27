# 管理后台

IAM-Admin 是权限系统的管理后台模块，提供用户、角色、权限等核心管理功能。

## 功能特性

- 用户管理：用户的增删改查、状态管理
- 角色管理：角色定义、权限分配
- 菜单管理：系统菜单配置
- 部门管理：组织架构管理
- 岗位管理：岗位信息维护

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-admin</artifactId>
</dependency>
```

### 配置说明

在 `application.yml` 中配置：

```yaml
iam:
  admin:
    enabled: true
```
