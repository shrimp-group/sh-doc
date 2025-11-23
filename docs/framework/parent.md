# Parent

> Maven Parent POM

## 什么是 Parent POM

Parent POM (Parent Project Object Model) 是 Maven 中一种特殊的 POM 文件，用于在多模块项目中共享配置。它允许我们将通用的配置、插件、依赖管理等信息集中定义在一个地方，然后被子模块继承，从而实现配置的复用和统一管理。

## 为什么需要 Parent POM

在复杂的多模块项目中，通常会面临以下挑战：

1. **配置重复**：各个子模块需要配置相同的编译选项、插件、依赖等
2. **版本不一致**：不同模块可能使用不同的插件版本或 Java 版本
3. **维护困难**：当需要修改公共配置时，需要逐一修改每个模块
4. **缺乏一致性**：各模块可能采用不同的构建标准和规范

Parent POM 解决了这些问题：

- 集中管理通用配置，避免重复
- 统一项目构建标准和规范
- 简化子模块的 POM 文件
- 便于维护和升级

## Parent POM 的作用

Parent POM 主要提供以下功能：

### 1. 属性定义 (Properties)
集中定义项目中使用的各种属性，如版本号、编码格式等：

```xml
<properties>
    <java.version>1.8</java.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
```

### 2. 依赖管理 (Dependency Management)
通过 `<dependencyManagement>` 统一管理依赖版本：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-core</artifactId>
            <version>${spring.version}</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 3. 插件管理 (Plugin Management)
通过 `<pluginManagement>` 统一管理插件版本和配置：

```xml
<pluginManagement>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.8.1</version>
            <configuration>
                <source>${java.version}</source>
                <target>${java.version}</target>
            </configuration>
        </plugin>
    </plugins>
</pluginManagement>
```

### 4. 资源配置
统一定义资源过滤和包含规则。

## 如何使用 Parent POM

### 1. 创建 Parent POM
创建一个 packaging 为 pom 的项目：

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>my-parent</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>
    
    <!-- 公共配置 -->
</project>
```

### 2. 在子模块中继承 Parent POM
在子模块的 pom.xml 中添加 parent 元素：

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.example</groupId>
        <artifactId>my-parent</artifactId>
        <version>1.0.0</version>
        <relativePath>../pom.xml</relativePath>
    </parent>
    
    <artifactId>my-child-module</artifactId>
    <!-- 子模块特有配置 -->
</project>
```

## Parent POM 最佳实践

### 1. 合理组织结构
- 将共同配置放在 Parent POM 中
- 子模块只保留特有的配置
- 避免过度继承导致的复杂性

### 2. 版本管理
- 使用属性统一管理版本号
- 定期更新和维护依赖版本
- 确保版本兼容性

### 3. 插件配置
- 在 Parent POM 中预配置常用插件
- 为不同类型的项目提供不同的插件集
- 保持插件配置的合理性

### 4. 多层级继承
对于大型项目，可以使用多层级 Parent POM：
```
root-parent (最基础配置)
├── java-parent (Java 项目通用配置)
│   ├── spring-parent (Spring 项目配置)
│   └── ...
└── web-parent (Web 项目通用配置)
    ├── spring-web-parent (Spring Web 项目配置)
    └── ...
```

## 我们的 Parent POM 实现

我们的 Parent POM 提供了以下特性：

1. **标准化构建配置**：统一的编译、测试、打包配置
2. **依赖版本管理**：通过 BOM 管理依赖版本
3. **插件预配置**：预设常用 Maven 插件及其配置
4. **最佳实践集成**：集成行业最佳实践和规范
5. **易于扩展**：提供良好的扩展点供项目定制

通过继承我们的 Parent POM，开发者可以快速搭建符合规范的 Maven 项目，减少配置工作量，提高开发效率。