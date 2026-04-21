# 字典服务

Micro-Dict 是字典数据微服务模块，提供系统字典的统一管理。

## 功能特性

- 字典管理：字典类型和字典项管理
- 缓存支持：字典数据本地缓存
- 动态刷新：支持字典动态刷新
- 常用接口：提供常用字典查询接口

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-dict</artifactId>
</dependency>
```

### 使用字典

```java
// 获取字典值
String dictValue = DictCache.get("user_status", "1");
```
