# Core

Core 模块是框架的公共技术基础组件集合，提供了应用程序开发所需的基础技术能力。它封装了开发中常用的非业务性技术组件和工具类，旨在减少技术重复实现，提升开发效率和代码质量。

Core 模块基于 Spring 生态系统构建，充分利用了 Spring Framework 的优势，提供纯粹的技术基础设施支持。

## Core 模块定位

在日常开发过程中，我们会遇到许多重复性的非业务技术实现，例如：

1. **通用工具类缺失**：每次都需要重新编写或复制粘贴常用的工具方法
2. **技术组件标准不统一**：不同项目或模块使用不同的技术实现方式，增加维护成本
3. **基础技术能力不规范**：缺乏统一的技术基础设施，影响系统稳定性和可维护性
4. **非业务功能重复开发**：如日志、配置、序列化等功能在多个项目中重复实现

Core 模块解决了这些问题：

- 提供丰富的通用技术工具类，减少重复代码
- 统一技术基础设施的实现标准和使用方式
- 定义标准的技术基础能力和服务
- 集成常用的技术功能，开箱即用

## Core 模块的功能特性

Core 模块主要包括以下几个方面的功能：

### 1. 通用工具类 (Common Utilities)
提供开发中常用的工具类集合：

- 字符串处理工具
- 日期时间处理工具
- 集合操作工具
- 加密解密工具
- JSON 序列化工具
- HTTP 客户端工具

### 2. 基础技术组件 (Base Technical Components)
封装常用的技术基础组件：

- 统一响应结果封装
- 分页查询组件
- 序列化组件
- 网络通信组件

### 3. 异常处理机制 (Exception Handling)
提供标准化的异常处理方案：

- 统一异常处理切面
- 技术异常类型定义
- 异常信息标准化处理
- 错误码管理机制

### 4. 日志管理 (Logging)
集成统一的日志管理方案：

- 标准化的日志输出格式
- 请求链路追踪支持
- 敏感信息脱敏处理
- 日志级别动态调整

### 5. 配置管理 (Configuration)
提供便捷的配置管理功能：

- 配置属性绑定和校验
- 动态配置刷新支持
- 多环境配置管理
- 配置中心集成

## 如何使用 Core 模块

### 1. 添加依赖

在项目的 pom.xml 文件中添加 Core 模块依赖：

```xml
<dependency>
    <groupId>your.framework.group</groupId>
    <artifactId>framework-core</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. 启用 Core 功能

Core 模块基于 Spring Boot autoconfigure 机制，大部分功能会自动生效。对于需要手动启用的功能，可以通过在配置类上添加注解来启用：

```java
@EnableCoreUtils
@EnableExceptionHandling
public class AppConfig {
    // 配置类
}
```

### 3. 使用通用工具类

可以直接通过静态方法调用通用工具类：

```java
import your.framework.core.utils.StringUtils;

public class ExampleService {
    public void exampleMethod() {
        String result = StringUtils.isEmpty("test") ? "empty" : "not empty";
    }
}
```

### 4. 使用基础组件

通过 Spring 的依赖注入机制使用基础组件：

```java
import your.framework.core.component.SerializationService;

@Service
public class BusinessService {

    @Autowired
    private SerializationService serializationService;

    public String serializeObject(Object obj) {
        return serializationService.toJson(obj);
    }
}
```

## Core 模块最佳实践

### 1. 合理使用工具类

- 优先使用 Core 提供的工具类而不是自行实现
- 注意工具类的线程安全性
- 遵循工具类的使用规范和约定

### 2. 异常处理规范

- 合理使用预定义的异常类型
- 避免忽略或吞掉异常信息
- 保持异常处理的一致性

### 3. 配置管理建议

- 将配置项集中在配置类中管理
- 使用配置校验确保配置正确性
- 合理设置配置的默认值

### 4. 扩展性考虑

Core 模块设计时充分考虑了扩展性：

- 大部分组件支持自定义实现替换
- 提供 SPI 扩展点供定制
- 遵循开闭原则，易于功能扩展

## 总结

Core 模块作为框架的技术基础组成部分，为应用程序提供了稳定的技术基础设施。通过使用 Core 模块，开发者可以：

1. 降低技术重复实现，提高开发效率
2. 统一技术实现标准，提升代码质量
3. 减少基础技术功能开发时间
4. 获得经过验证的稳定技术组件，提高系统可靠性

合理使用 Core 模块的各项功能，能够显著提升项目技术架构的质量和维护性。
