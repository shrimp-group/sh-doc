# 规则引擎

Micro-LiteFlow 是轻量级规则引擎微服务模块，提供流程编排和规则执行功能。

## 功能特性

- 流程编排：可视化流程编排
- 组件化：业务组件化设计
- 规则脚本：支持 EL 表达式规则
- 热部署：规则热更新

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-liteflow</artifactId>
</dependency>
```

### 定义规则

```xml
<chain name="demo">
    THEN(a, b, c);
</chain>
```
