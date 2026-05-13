# sh-spring

> Spring 生态扩展模块 - 提供 Spring 上下文工具、雪花ID生成、邮件发送和模板渲染

## 模块概述

`sh-spring` 是 `sh-framework` 的 Spring 生态扩展模块，基于 `sh-core` 构建，为 Spring Boot 应用提供了一系列实用的工具和增强功能。该模块旨在简化企业级应用开发中的常见需求，包括 Spring 上下文管理、唯一ID生成、邮件发送和模板渲染等。

### 核心价值

1. **简化开发**：提供静态工具方法，减少重复代码
2. **增强功能**：扩展 Spring 生态，提供企业级常用功能
3. **线程安全**：关键组件采用线程安全设计
4. **配置驱动**：支持灵活的配置管理

## 快速开始

### 1. 添加依赖

在项目的 `pom.xml` 文件中添加 `sh-spring` 依赖：

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-spring</artifactId>
    <version>${sh-framework.version}</version>
</dependency>
```

### 2. 自动配置

`sh-spring` 使用 Spring Boot 的自动配置机制，无需额外配置即可使用。模块通过 `ShSpringAutoConfig` 类自动扫描并注册相关组件：

```java
@AutoConfiguration
@ComponentScan(basePackages = {"com.wkclz.spring"})
public class ShSpringAutoConfig {
}
```

## 核心功能

### 1. Spring 上下文持有器 (SpringContextHolder)

在非 Spring 管理的类中获取 Spring Bean 和 ApplicationContext。

#### 使用示例

```java
// 获取 ApplicationContext
ApplicationContext ctx = SpringContextHolder.getApplicationContext();

// 按名称获取 Bean（自动转型）
MyService service = SpringContextHolder.getBean("myService");

// 按 Class 类型获取 Bean
MyService service = SpringContextHolder.getBean(MyService.class);
```

#### 实现特性

- 实现 `ApplicationContextAware` 和 `DisposableBean` 接口
- 使用 `@Component` + `@Lazy(false)` 确保立即实例化
- 线程安全的单例模式
- 容器关闭时自动清理静态变量

### 2. 雪花ID生成器 (SnowflakeHelper)

分布式环境下生成唯一ID，基于网络接口和环境类型生成。

#### 使用示例

```java
// 生成唯一雪花ID
long id = SnowflakeHelper.getSnowflakeId();
System.out.println("生成的ID: " + id);
```

#### ID 生成策略

- **Worker ID**：本机所有网络接口的 `hashCode % 31`
- **Datacenter ID**：当前环境 `EnvType` 的 `hashCode % 31`
- **线程安全**：使用 `synchronized` 保证线程安全
- **懒初始化**：首次调用时创建 `SnowflakeIdWorker` 实例

### 3. 系统启动初始化 (Sys)

在 Spring Boot 启动后执行系统初始化，管理环境类型和启动状态。

#### 使用示例

```java
// 获取当前运行环境
EnvType env = Sys.getCurrentEnv();  // DEV/SIT/UAT/PROD

// 获取系统启动时间
Long startupDate = Sys.getStartupDate();

// 检查系统是否启动完成
boolean confirmed = Sys.getSystemStartUpConfirm();
```

#### 环境判断逻辑

从 `spring.profiles.active` 读取激活 Profile，按优先级匹配：
1. PROD > UAT > SIT > DEV
2. 默认环境为 DEV

#### 原子变量管理

- `CURRENT_ENV`：当前环境（默认 DEV）
- `STARTUP_DATE`：启动时间戳
- `SYSTEM_START_UP_CONFIRM`：启动完成标志

### 4. 系统配置 (SystemConfig)

统一管理系统配置属性，支持配置解密和告警邮件配置。

#### 配置属性

| 属性 | 配置键 | 默认值 | 说明 |
|------|--------|--------|------|
| applicationName | spring.application.name | APP | 应用名称 |
| profiles | spring.profiles.active | dev | 激活的 Profile |
| configDecryptAesKey | sh.config.decrypt-aes-key | 空 | 配置解密 AES 密钥 |
| alarmEmailEnabled | alarm.email.enabled | false | 告警邮件启用 |
| alarmEmailHost | alarm.email.host | 空 | SMTP 主机 |
| alarmEmailFrom | alarm.email.from | 空 | 发件人 |
| alarmEmailPassword | alarm.email.password | 空 | 邮件密码 |
| alarmEmailTo | alarm.email.to | 空 | 收件人 |

#### 使用示例

```java
@Autowired
private SystemConfig systemConfig;

public void checkConfig() {
    String appName = systemConfig.getApplicationName();
    boolean emailEnabled = systemConfig.isAlarmEmailEnabled();
    // 使用配置...
}
```

### 5. 邮件发送工具 (MailUtil)

支持 HTML 内容、内嵌图片、附件的邮件发送功能。

#### 使用示例

```java
// 创建邮件实例
MailUtil mailUtil = new MailUtil();
mailUtil.setEmailHost("smtp.exmail.qq.com");
mailUtil.setEmailFrom("sender@example.com");
mailUtil.setEmailPassword("your-password");
mailUtil.setToEmails("receiver1@example.com,receiver2@example.com");
mailUtil.setSubject("系统告警通知");
mailUtil.setContent("<h1>系统异常</h1><p>发现系统异常，请及时处理。</p>");

// 添加内嵌图片
Map<String, String> pictures = new HashMap<>();
pictures.put("chart1", "/path/to/chart1.png");
mailUtil.setPictures(pictures);

// 添加附件
Map<String, String> attachments = new HashMap<>();
attachments.put("report.pdf", "/path/to/report.pdf");
mailUtil.setAttachments(attachments);

// 发送邮件
mailUtil.sendEmail();
```

#### 特性

- 支持 HTML 内容和纯文本
- 支持多收件人（逗号/分号/竖线分隔）
- SSL 加密连接
- 密码在 `toString()` 中隐藏显示
- 使用独立 Properties，不污染全局系统属性

### 6. FreeMarker 模板工具 (FreeMarkerTemplateUtil)

提供 FreeMarker 模板渲染功能，支持从 classpath 和自定义目录加载模板。

#### 使用示例

```java
// 从 classpath:/templates/ 加载模板
Template template = FreeMarkerTemplateUtil.getTemplate("email-template.ftl");

// 从自定义目录加载模板
Template template = FreeMarkerTemplateUtil.getTemplate("template.ftl", "/path/to/templates");

// 字符串模板渲染
Map<String, Object> params = new HashMap<>();
params.put("name", "张三");
params.put("age", 25);
String result = FreeMarkerTemplateUtil.parseString("你好 ${name}，年龄：${age}", params);

// 清除模板缓存
FreeMarkerTemplateUtil.clearCache();
```

#### 特性

- 默认模板路径：`classpath:/templates/`
- 编码：UTF-8
- 异常处理：RETHROW_HANDLER
- 缓存策略：NullCacheStorage（不缓存）
- 线程安全：使用 `ReentrantLock` 保护模板加载器切换

## 高级用法

### 1. 在非 Spring Bean 中获取 Bean

```java
public class NonSpringClass {
    
    public void doSomething() {
        // 在非 Spring 管理的类中获取 Service
        UserService userService = SpringContextHolder.getBean(UserService.class);
        List<User> users = userService.findAll();
    }
}
```

### 2. 根据环境执行不同逻辑

```java
public class EnvAwareService {
    
    public void process() {
        EnvType currentEnv = Sys.getCurrentEnv();
        
        switch (currentEnv) {
            case DEV:
                // 开发环境逻辑
                logDebugInfo();
                break;
            case PROD:
                // 生产环境逻辑
                sendAlarmIfNeeded();
                break;
            default:
                // 其他环境逻辑
                break;
        }
    }
}
```

### 3. 批量生成唯一ID

```java
public class BatchIdGenerator {
    
    public List<Long> generateIds(int count) {
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            ids.add(SnowflakeHelper.getSnowflakeId());
        }
        return ids;
    }
}
```

### 4. 邮件模板渲染与发送

```java
public class EmailService {
    
    public void sendWelcomeEmail(User user) {
        // 渲染模板
        Map<String, Object> params = new HashMap<>();
        params.put("user", user);
        params.put("welcomeDate", new Date());
        
        String content = FreeMarkerTemplateUtil.parseString(
            "<html><body>欢迎 ${user.name} 注册！<br/>注册时间：${welcomeDate?string('yyyy-MM-dd HH:mm:ss')}</body></html>",
            params
        );
        
        // 发送邮件
        MailUtil mailUtil = new MailUtil();
        mailUtil.setEmailHost("smtp.exmail.qq.com");
        mailUtil.setEmailFrom("noreply@example.com");
        mailUtil.setEmailPassword("password");
        mailUtil.setToEmails(user.getEmail());
        mailUtil.setSubject("欢迎注册");
        mailUtil.setContent(content);
        mailUtil.sendEmail();
    }
}
```

## 配置说明

### 1. 邮件配置示例

```yaml
# application.yml
alarm:
  email:
    enabled: true
    host: smtp.exmail.qq.com
    from: alarm@yourcompany.com
    password: ${EMAIL_PASSWORD}  # 建议使用环境变量
    to: admin1@yourcompany.com,admin2@yourcompany.com
```

### 2. 环境配置

```yaml
# application-dev.yml (开发环境)
spring:
  profiles:
    active: dev
  application:
    name: myapp-dev

# application-prod.yml (生产环境)
spring:
  profiles:
    active: prod
  application:
    name: myapp-prod
```

## 最佳实践

### 1. SpringContextHolder 使用建议

- **适用场景**：在工具类、静态方法、非 Spring 管理的类中获取 Bean
- **避免滥用**：在 Spring Bean 中优先使用依赖注入
- **异常处理**：调用前确保 Spring 上下文已初始化

### 2. 雪花ID生成优化

- **批量生成**：需要大量ID时考虑批量生成
- **ID 解析**：使用 `SnowflakeIdWorker` 的解析方法分析ID结构
- **环境隔离**：不同环境使用不同的数据中心ID

### 3. 邮件发送最佳实践

- **密码安全**：通过环境变量或配置中心管理邮件密码
- **异步发送**：大量邮件发送时考虑异步处理
- **错误处理**：实现邮件发送失败的重试机制
- **模板管理**：使用 FreeMarker 模板统一邮件格式

### 4. 模板管理建议

- **模板目录**：统一管理模板文件，便于维护
- **缓存策略**：开发环境禁用缓存，生产环境启用缓存
- **国际化**：支持多语言模板
- **版本控制**：模板文件纳入版本控制

## 常见问题解答

### Q1: SpringContextHolder 获取不到 Bean 怎么办？

**A**: 检查以下问题：
1. 确保 `sh-spring` 依赖已正确添加
2. 确认 Spring 上下文已初始化完成
3. 检查 Bean 名称或类型是否正确
4. 确保目标 Bean 已被 Spring 管理

### Q2: 雪花ID 生成冲突怎么办？

**A**: 雪花ID 冲突的常见原因和解决方案：
1. **时钟回拨**：检查系统时间是否同步
2. **Worker ID 冲突**：确保不同机器的网络接口不同
3. **数据中心ID 冲突**：不同环境使用不同的数据中心ID

### Q3: 邮件发送失败如何处理？

**A**: 邮件发送失败的排查步骤：
1. 检查 SMTP 配置是否正确
2. 验证发件人密码是否有效
3. 检查网络连接和防火墙设置
4. 查看邮件服务器日志

### Q4: 如何自定义模板路径？

**A**: 使用 `FreeMarkerTemplateUtil.getTemplate(templateName, templatesDir)` 方法指定自定义目录：

```java
Template template = FreeMarkerTemplateUtil.getTemplate(
    "custom-template.ftl", 
    "/opt/myapp/templates"
);
```

## 贡献指南

### 1. 代码规范

- 遵循项目已有的代码风格
- 添加必要的单元测试
- 更新相关文档

### 2. 组件分类

了解 `sh-spring` 中哪些是 Spring Bean，哪些是工具类：

| 类 | 是否 Bean | 使用方式 |
|----|---------|---------|
| SpringContextHolder | 是 | 自动注入或静态方法 |
| Sys | 是 | 静态方法访问 |
| SystemConfig | 是 | 可注入 |
| SnowflakeHelper | 否 | 静态方法调用 |
| FreeMarkerTemplateUtil | 否 | 静态方法调用 |
| MailUtil | 否 | 实例化+setter+sendEmail() |

### 3. 依赖关系

```
sh-tool (SnowflakeIdWorker, StringFormat)
  ↑
sh-core (SystemException, EnvType, CommonException)
  ↑
sh-spring (SpringContextHolder, Sys, SystemConfig, SnowflakeHelper, FreeMarkerTemplateUtil, MailUtil)
```

## 总结

`sh-spring` 模块作为 `sh-framework` 的 Spring 生态扩展，为企业级应用开发提供了以下核心价值：

1. **简化开发**：提供静态工具方法，减少重复代码编写
2. **增强功能**：扩展 Spring 生态，提供企业级常用功能
3. **线程安全**：关键组件采用线程安全设计，支持高并发场景
4. **配置驱动**：支持灵活的配置管理，适应不同环境需求

通过合理使用 `sh-spring` 的各项功能，开发者可以：
- 在非 Spring 管理的类中方便地获取 Spring Bean
- 在分布式环境下生成唯一ID
- 实现灵活的邮件发送和模板渲染
- 根据环境执行不同的业务逻辑

该模块的设计遵循了 Spring Boot 的约定优于配置原则，通过自动配置机制简化了使用复杂度，是企业级应用开发的重要基础设施组件。