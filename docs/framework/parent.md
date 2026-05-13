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

## sh-parent 实现详解

### 概述
`sh-parent` 是 sh-framework 框架的核心父工程，为所有子模块和业务项目提供统一的构建配置、依赖管理和插件配置。它继承自 Spring Boot Parent 4.0.0，并集成了 `sh-bom` 进行依赖版本管理。

### 核心特性

1. **标准化构建配置**
   - Java 25 编译配置
   - UTF-8 编码统一
   - 源码打包自动生成
   - 注解处理器预配置

2. **依赖版本管理**
   - 通过 `sh-bom` 统一管理第三方依赖版本
   - 管理所有 sh-framework 模块版本
   - 管理微服务模块版本

3. **插件预配置**
   - maven-compiler-plugin：Java 25 编译
   - maven-source-plugin：源码打包
   - flatten-maven-plugin：CI/CD 友好
   - exec-maven-plugin：外部命令执行

4. **最佳实践集成**
   - 统一的构建标准
   - CI/CD 友好配置
   - 多模块项目管理
   - 版本控制策略

## 在 sh-framework 子模块中使用

```xml
<!-- sh-core/pom.xml -->
<project>
    <modelVersion>4.0.0</modelVersion>

    <!-- 继承 sh-parent -->
    <parent>
        <groupId>com.wkclz.framework</groupId>
        <artifactId>sh-parent</artifactId>
        <version>5.0.0-SNAPSHOT</version>
        <relativePath>../sh-parent/pom.xml</relativePath>
    </parent>

    <artifactId>sh-core</artifactId>

    <dependencies>
        <!-- 无需指定版本，版本由 sh-bom 统一管理 -->
        <dependency>
            <groupId>com.wkclz.framework</groupId>
            <artifactId>sh-tool</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
        </dependency>
    </dependencies>
</project>
```

## 在业务项目中使用

```xml
<!-- 业务项目 pom.xml -->
<project>
    <modelVersion>4.0.0</modelVersion>

    <!-- 继承 sh-parent -->
    <parent>
        <groupId>com.wkclz.framework</groupId>
        <artifactId>sh-parent</artifactId>
        <version>5.0.0-SNAPSHOT</version>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>my-business-app</artifactId>
    <version>1.0.0</version>

    <dependencies>
        <!-- 使用 sh-framework 组件 -->
        <dependency>
            <groupId>com.wkclz.framework</groupId>
            <artifactId>sh-core</artifactId>
        </dependency>
        <dependency>
            <groupId>com.wkclz.framework</groupId>
            <artifactId>sh-mybatis</artifactId>
        </dependency>
        <dependency>
            <groupId>com.wkclz.framework</groupId>
            <artifactId>sh-redis</artifactId>
        </dependency>

        <!-- 使用微服务模块 -->
        <dependency>
            <groupId>com.wkclz.microapp</groupId>
            <artifactId>micro-dict</artifactId>
        </dependency>
        <dependency>
            <groupId>com.wkclz.microapp</groupId>
            <artifactId>micro-file</artifactId>
        </dependency>
    </dependencies>
</project>
```

## 管理的模块版本

### 框架核心模块
- `sh-tool`：工具模块
- `sh-core`：核心模块
- `sh-mybatis`：ORM 模块
- `sh-dynamicdb`：动态数据源
- `sh-redis`：缓存模块
- `sh-spring`：Spring 集成
- `sh-xxljob`：任务调度
- `sh-mqtt`：消息队列
- `sh-web`：Web 模块

### 微服务模块
- `micro-audit`：审计服务
- `micro-dict`：字典服务
- `micro-file`：文件服务
- `micro-liteflow`：规则引擎
- `micro-form`：表单服务
- `micro-fun`：函数服务
- `micro-mask`：脱敏服务
- `micro-msg`：消息服务
- `micro-pay`：支付服务
- `micro-pdf`：PDF 服务
- `micro-rmcheck`：关联检查
- `micro-seq`：序列服务
- `micro-wxapp`：微信小程序
- `micro-wxmp`：微信公众号

## 配置详解

### 属性配置
```xml
<properties>
    <!-- 项目版本 -->
    <revision>5.0.0-SNAPSHOT</revision>

    <!-- Java 配置 -->
    <maven.compiler.source>25</maven.compiler.source>
    <maven.compiler.target>25</maven.compiler.target>
    <maven.compiler.release>25</maven.compiler.release>

    <!-- 编码配置 -->
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

    <!-- 插件版本 -->
    <flatten-maven-plugin.version>1.7.3</flatten-maven-plugin.version>
</properties>
```

### 依赖管理
```xml
<dependencyManagement>
    <dependencies>
        <!-- 导入 sh-bom 进行依赖版本管理 -->
        <dependency>
            <groupId>com.wkclz.framework</groupId>
            <artifactId>sh-bom</artifactId>
            <version>${revision}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>

        <!-- 管理框架模块版本 -->
        <dependency>
            <groupId>com.wkclz.framework</groupId>
            <artifactId>sh-core</artifactId>
            <version>${revision}</version>
        </dependency>

        <!-- 管理微服务模块版本 -->
        <dependency>
            <groupId>com.wkclz.microapp</groupId>
            <artifactId>micro-dict</artifactId>
            <version>${revision}</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

## 最佳实践

### 1. 新项目搭建
```xml
<!-- 父项目 pom.xml -->
<parent>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-parent</artifactId>
    <version>5.0.0-SNAPSHOT</version>
</parent>

<groupId>com.example</groupId>
<artifactId>my-project</artifactId>
<version>1.0.0</version>
<packaging>pom</packaging>

<modules>
    <module>common</module>
    <module>service</module>
    <module>web</module>
</modules>
```

### 2. 现有项目迁移
1. 添加 `<parent>` 元素
2. 移除重复配置
3. 简化依赖声明（移除版本）
4. 测试构建流程

### 3. 自定义配置
```xml
<properties>
    <!-- 覆盖 Java 版本 -->
    <maven.compiler.source>25</maven.compiler.source>
    <maven.compiler.target>25</maven.compiler.target>
</properties>

<build>
    <plugins>
        <!-- 添加额外插件 -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-checkstyle-plugin</artifactId>
            <version>3.3.1</version>
        </plugin>
    </plugins>
</build>
```

## 常见问题

### Q1: sh-parent 和 sh-bom 的区别？
- **sh-parent**：完整构建配置（插件、属性、依赖管理）
- **sh-bom**：仅依赖版本管理
- **关系**：`sh-parent` 导入 `sh-bom`

### Q2: 如何查看有效配置？
```bash
mvn help:effective-pom
mvn dependency:tree
```

### Q3: 如何更新版本？
```xml
<parent>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-parent</artifactId>
    <version>5.0.1-SNAPSHOT</version>
</parent>
```

### Q4: 依赖冲突怎么办？
```bash
# 分析依赖树
mvn dependency:tree -Dverbose

# 排除冲突
<dependency>
    <groupId>冲突的groupId</groupId>
    <artifactId>冲突的artifactId</artifactId>
    <exclusions>
        <exclusion>
            <groupId>要排除的groupId</groupId>
            <artifactId>要排除的artifactId</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

## 总结

`sh-parent` 提供：
- ✅ 标准化 Maven 构建配置
- ✅ 统一的依赖版本管理
- ✅ 预配置的构建插件
- ✅ 完整的框架生态支持

通过使用 `sh-parent`，开发者可以：
- 快速启动新项目
- 减少配置复杂度
- 保证项目质量
- 享受统一的开发体验

开始使用 `sh-parent`，让构建配置更简单！
