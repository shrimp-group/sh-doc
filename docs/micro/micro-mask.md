# 脱敏服务

Micro-Mask 是数据脱敏微服务模块，提供敏感数据脱敏处理功能。

## 功能特性

- 自动脱敏：响应数据自动脱敏
- 规则配置：灵活的脱敏规则
- 多种类型：支持多种脱敏类型
- 注解支持：通过注解指定脱敏

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-mask</artifactId>
</dependency>
```

### 使用脱敏

```java
@Mask(MaskType.PHONE)
private String phone;
```
