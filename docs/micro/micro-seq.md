# 序列服务

Micro-Seq 是序列号生成微服务模块，提供分布式序列号生成功能。

## 功能特性

- 分布式：支持分布式环境
- 多种类型：支持数字、日期等多种格式
- 自定义规则：灵活的序列号规则
- 高性能：高性能序列号生成

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-seq</artifactId>
</dependency>
```

### 获取序列号

```java
String seq = SeqApi.next("ORDER");
```
