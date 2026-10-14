# sh-spring

> Spring 生态扩展模块 - 提供 Spring 上下文工具、系统启动初始化、雪花ID生成、敏感配置加解密、邮件发送和模板渲染

## 模块概述

`sh-spring` 是 `sh-framework` 的 Spring 生态扩展模块，基于 `sh-core` 构建，为 Spring Boot 应用提供了一系列实用的工具和增强功能。该模块旨在简化企业级应用开发中的常见需求，包括 Spring 上下文管理、系统环境与启动状态管理、敏感配置加密存储与自动解密、唯一ID生成、邮件发送和模板渲染等。

### 核心价值

1. **简化开发**：提供静态工具方法，减少重复代码
2. **增强功能**：扩展 Spring 生态，提供企业级常用功能
3. **安全防护**：敏感配置支持 RSA 密钥库/AES 加密存储，启动时自动解密
4. **线程安全**：关键组件采用线程安全设计
5. **配置驱动**：支持灵活的配置管理

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

`sh-spring` 使用 Spring Boot 的自动配置机制，通过 `ShSpringAutoConfig` 自动扫描并注册 `com.wkclz.spring` 包下的组件，无需额外配置即可使用：

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

- `@Component` + `@Lazy(false)` 确保容器启动即实例化
- 实现 `ApplicationContextAware` 注入上下文到 volatile 静态变量
- 实现 `DisposableBean`，容器关闭时自动清空静态变量
- 静态方法调用前校验上下文已注入，否则抛出异常

### 2. 系统启动初始化 (Sys)

系统启动后（`ApplicationRunner.run()`）自动执行初始化，管理环境类型、启动时间与启动完成状态。

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

从 `spring.profiles.active` 读取所有激活的 Profile，逐个进行环境匹配：

1. 每个 Profile 大写后按 **PROD > UAT > SIT > DEV** 顺序做 `contains` 匹配
2. 后匹配到的结果覆盖先匹配到的结果，最终环境取最后一个激活 Profile 的匹配结果
3. 无任何匹配时保持默认环境 **DEV**

#### 状态管理（原子变量）

| 变量 | 初始值 | 说明 |
| --- | --- | --- |
| `CURRENT_ENV` | DEV | 当前运行环境，`run()` 执行后按 Profile 匹配结果更新 |
| `STARTUP_DATE` | 当前时间戳 | 启动时间，`run()` 执行后更新为 Spring 容器的实际启动时间 |
| `SYSTEM_START_UP_CONFIRM` | false | 启动完成标志，`run()` 执行后置为 true |

### 3. 系统配置 (SystemConfig)

统一管理系统配置属性，支持敏感配置的加密存储与自动解密，以及告警邮件配置。

#### 配置属性

| 属性 | 配置键 | 默认值 | 说明 |
|------|--------|--------|------|
| configKeystorePath | sh.config.keystore.path | 空 | RSA 密钥库文件路径（配置后启用 RSA 模式） |
| configKeystoreAlias | sh.config.keystore.alias | config-decrypt | 密钥库中私钥的别名 |
| configKeystorePassword | SH_CONFIG_KEYSTORE_PASSWORD（优先）/ sh.config.keystore.password | 空 | 密钥库密码，建议通过环境变量注入 |
| configDecryptAesKey | SH_CONFIG_DECRYPT_AES_KEY（优先）/ sh.config.decrypt-aes-key | 空 | AES 解密密钥，建议通过环境变量注入 |
| applicationName | spring.application.name | APP | 应用名称 |
| profiles | spring.profiles.active | dev | 激活的 Profile |
| alarmEmailEnabled | alarm.email.enabled | false | 告警邮件启用 |
| alarmEmailHost | alarm.email.host | smtp.exmail.qq.com | SMTP 主机 |
| alarmEmailFrom | alarm.email.from | alarm@wkclz.com | 发件人 |
| alarmEmailPassword | alarm.email.password | 空（须 ENC 加密） | 邮件密码，禁止明文硬编码 |
| alarmEmailTo | alarm.email.to | admin@wkclz.com | 收件人 |

#### 使用示例

```java
@Autowired
private SystemConfig systemConfig;

public void checkConfig() {
    String appName = systemConfig.getApplicationName();
    boolean emailEnabled = systemConfig.isAlarmEmailEnabled();
    String emailHost = systemConfig.getAlarmEmailHost();
    // 使用配置...
}
```

### 4. 敏感配置加解密 (SensitiveConfigEncryptor / SensitiveConfigDecryptor)

支持配置文件中敏感值（如邮件密码）的加密存储与启动时自动解密。

#### 加密模式

`SystemConfig.initSensitiveConfig()` 在启动时按以下优先级自动选择解密模式：

| 模式 | 启用条件 | 解密方式 | 安全性 |
| --- | --- | --- | --- |
| **RSA 密钥库模式（推荐）** | 配置了 `sh.config.keystore.path` | 从 PKCS12 密钥库加载私钥，RSA 信封解密 | 需同时获取密钥库文件 + 密钥库密码 + 配置文件，三重防护 |
| **AES 模式** | 未配置密钥库，但配置了 AES 密钥 | 使用对称密钥直接解密 | 密钥与密文建议分离存放（环境变量） |
| **明文模式** | 未配置任何解密密钥 | 不解密，直接使用明文值 | 仅建议开发环境使用 |

- **明文模式兜底**：若未配置任何解密密钥，而配置值仍为 `ENC(...)` 格式，将抛出 `SystemException` 提示配置解密密钥
- **AES 密钥来源检查**：AES 模式下若密钥非来自环境变量 `SH_CONFIG_DECRYPT_AES_KEY` 或 JVM 属性 `sh.config.decrypt-aes-key`（即来自配置文件），会输出安全警告

#### ENC 格式

加密值统一使用 `ENC(...)` 包裹：

- **AES 格式**：`ENC(密文)`，即 `AES加密(明文)` 的结果
- **RSA 信封格式**：`ENC(RSA加密的AES密钥.AES加密的数据)`，内部以 `.` 分隔；流程为生成随机 AES 密钥 → AES 加密数据 → RSA 加密 AES 密钥 → 拼接

#### 加密工具类 (SensitiveConfigEncryptor)

| 方法 | 说明 |
| --- | --- |
| `encrypt(plaintext, aesKey)` | AES 对称加密，返回 `ENC(密文)` |
| `encryptRsa(plaintext, rsaPublicKeyBase64)` | RSA 信封加密，返回 `ENC(aesKey.data)` |
| `generateKeyPairToKeystore(keystorePath, alias, password, keySize)` | 生成 RSA 密钥对并存入 PKCS12 密钥库（BouncyCastle 自签名证书，有效期 25 年），输出公钥 |
| `exportPublicKey(keystorePath, alias, password)` | 从密钥库导出 Base64 公钥 |
| `loadPrivateKeyBase64(keystorePath, alias, password)` | 从密钥库加载 Base64 私钥 |

#### 解密工具类 (SensitiveConfigDecryptor)

| 方法 | 说明 |
| --- | --- |
| `isEncrypted(value)` | 判断值是否为 `ENC(...)` 格式 |
| `decrypt(value, aesKey)` | AES 解密 `ENC(...)` 配置值 |
| `decryptRsa(value, rsaPrivateKeyBase64)` | RSA 信封解密（拆分密文 → RSA 解密 AES 密钥 → AES 解密数据） |

#### CLI 命令行

通过 `SensitiveConfigEncryptor` 的 main 入口可完成密钥生成与值加密：

```bash
# AES 加密（简单场景）
java SensitiveConfigEncryptor aes <plaintext> <aesKey>

# RSA 信封加密（推荐）
java SensitiveConfigEncryptor rsa <plaintext> <rsaPublicKeyBase64>

# 生成 RSA 密钥对到 PKCS12 密钥库（默认 keySize 2048，支持 1024/2048/4096），并输出公钥
java SensitiveConfigEncryptor keygen <keystorePath> <alias> <password> [keySize]

# 从密钥库导出公钥
java SensitiveConfigEncryptor export-pub <keystorePath> <alias> <password>
```

#### 完整使用流程（RSA 模式）

1. 生成密钥库并导出公钥：
   ```bash
   java SensitiveConfigEncryptor keygen /path/to/config-decrypt.p12 config-decrypt your-keystore-password
   java SensitiveConfigEncryptor export-pub /path/to/config-decrypt.p12 config-decrypt your-keystore-password
   ```
2. 使用公钥加密配置值：
   ```bash
   java SensitiveConfigEncryptor rsa "your-plain-password" <rsaPublicKeyBase64>
   # 输出：ENC(...)
   ```
3. 配置文件中写入加密值与密钥库路径，密钥库密码通过环境变量注入：
   ```yaml
   sh:
     config:
       keystore:
         path: /path/to/config-decrypt.p12
         alias: config-decrypt
   alarm:
     email:
       password: ENC(...)
   ```
   ```bash
   export SH_CONFIG_KEYSTORE_PASSWORD=your-keystore-password
   ```
4. 应用启动后 `SystemConfig` 自动解密，`alarmEmailPassword` 即为明文密码。

### 5. 雪花ID生成器 (SnowflakeHelper)

分布式环境下生成唯一ID，基于网络接口和环境类型生成 Worker ID 与 Datacenter ID。

#### 使用示例

```java
// 生成唯一雪花ID
long id = SnowflakeHelper.getSnowflakeId();
```

#### ID 生成策略

- **Worker ID**：遍历本机所有网络接口拼接后 `hashCode % 31` 取绝对值（0~30）
- **Datacenter ID**：`Sys.getCurrentEnv().hashCode() % 31` 取绝对值（0~30），不同环境天然隔离
- **线程安全**：`getSnowflakeId()` 为 `synchronized` 方法
- **懒初始化**：首次调用时创建 `SnowflakeIdWorker`（sh-tool）实例

### 6. 邮件发送工具 (MailUtil)

支持 HTML 内容、内嵌图片、附件的邮件发送功能。

#### 使用示例

```java
// 创建邮件实例
MailUtil mailUtil = new MailUtil();
mailUtil.setEmailHost("smtp.exmail.qq.com");
mailUtil.setEmailFrom("sender@example.com");
mailUtil.setEmailPassword("your-password");
mailUtil.setToEmails("receiver1@example.com;receiver2@example.com");
mailUtil.setSubject("系统告警通知");
mailUtil.setContent("<h1>系统异常</h1><p>发现系统异常，请及时处理。</p>");

// 添加内嵌图片（key 为图片 ID，用于 HTML 中 cid: 引用；value 为图片地址）
Map<String, String> pictures = new HashMap<>();
pictures.put("chart1", "/path/to/chart1.png");
mailUtil.setPictures(pictures);

// 添加附件（key 为附件 ID，value 为附件地址）
Map<String, String> attachments = new HashMap<>();
attachments.put("report.pdf", "/path/to/report.pdf");
mailUtil.setAttachments(attachments);

// 发送邮件
mailUtil.sendEmail();
```

#### 特性

- 支持 HTML 内容（`MimeMessageHelper` UTF-8，`setText(content, true)`）
- 支持多收件人，以中英文逗号、中英文分号、竖线分隔（`[,，;；|]`）
- SSL 加密连接，且 `setTrustAllHosts(true)` 信任所有主机
- 使用独立 `Properties`（含 `mail.smtp.ssl.socketFactory`），不污染全局系统属性
- 发件人信息（host/from/password）不完整或收件人为空时抛出异常
- 图片/附件不存在或 ID 缺失时抛出异常
- `toString()` 中密码脱敏显示为 `******`
- 发送异常（`MessagingException` / `GeneralSecurityException`）记录 error 日志

### 7. FreeMarker 模板工具 (FreeMarkerTemplateUtil)

提供 FreeMarker 模板渲染功能，支持从 classpath 和自定义目录加载模板，以及字符串模板渲染。

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

- 默认模板路径：`classpath:/templates/`（`ClassTemplateLoader`）
- 版本：`Configuration.VERSION_2_3_22`
- 编码：UTF-8
- 异常处理：`RETHROW_HANDLER`（模板异常向上抛出）
- 缓存策略：`NullCacheStorage`（不缓存模板）
- 线程安全：使用 `ReentrantLock` 保护模板加载器切换
- `parseString(content, params)` 基于 `StringTemplateLoader` 渲染字符串模板

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
    password: ENC(...)  # 建议使用 ENC(...) 加密，配合 RSA 密钥库或 AES 密钥自动解密
    to: admin1@yourcompany.com;admin2@yourcompany.com
```

### 2. 敏感配置示例

```yaml
# RSA 密钥库模式（推荐）
sh:
  config:
    keystore:
      path: /path/to/config-decrypt.p12
      alias: config-decrypt
# 密钥库密码通过环境变量注入：export SH_CONFIG_KEYSTORE_PASSWORD=your-keystore-password

# AES 模式（简单场景）
sh:
  config:
    decrypt-aes-key: your-aes-key   # 建议通过环境变量注入：export SH_CONFIG_DECRYPT_AES_KEY=your-aes-key
```

### 3. 环境配置

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

### 2. 敏感配置管理建议

- **首选 RSA 密钥库模式**：密钥库文件、密钥库密码、配置文件三者分离，任一单独泄露均无法解密
- **密钥库密码与 AES 密钥务必通过环境变量注入**，禁止写入配置文件，避免密钥与密文同处一文件
- **邮件密码禁止明文硬编码**，统一使用 `ENC(...)` 加密存储
- **密钥库文件**（`.p12`）纳入安全保管，禁止提交到代码仓库

### 3. 雪花ID生成优化

- **批量生成**：需要大量ID时考虑批量生成
- **ID 解析**：使用 `SnowflakeIdWorker` 的解析方法分析ID结构
- **环境隔离**：Datacenter ID 由当前环境哈希生成，不同环境自动隔离

### 4. 邮件发送最佳实践

- **密码安全**：通过 ENC 加密 + 密钥库/环境变量管理邮件密码
- **异步发送**：大量邮件发送时考虑异步处理
- **错误处理**：实现邮件发送失败的重试机制
- **模板管理**：使用 FreeMarker 模板统一邮件格式

### 5. 模板管理建议

- **模板目录**：统一管理模板文件，便于维护
- **缓存策略**：模块默认使用 `NullCacheStorage`（不缓存），模板变更即时生效
- **国际化**：支持多语言模板
- **版本控制**：模板文件纳入版本控制

## 常见问题解答

### Q1: SpringContextHolder 获取不到 Bean 怎么办？

**A**: 检查以下问题：
1. 确保 `sh-spring` 依赖已正确添加
2. 确认 Spring 上下文已初始化完成（`applicationContext` 已注入）
3. 检查 Bean 名称或类型是否正确
4. 确保目标 Bean 已被 Spring 管理

### Q2: 雪花ID 生成冲突怎么办？

**A**: 雪花ID 冲突的常见原因和解决方案：
1. **时钟回拨**：检查系统时间是否同步
2. **Worker ID 冲突**：确保不同机器的网络接口组合不同
3. **Datacenter ID 冲突**：不同环境使用不同的 Datacenter ID（默认按环境哈希生成）

### Q3: 邮件发送失败如何处理？

**A**: 邮件发送失败的排查步骤：
1. 检查 SMTP 配置（host/from/password）是否正确
2. 确认告警邮件密码已正确解密（非 `ENC(...)` 残留）
3. 检查网络连接和防火墙设置
4. 查看邮件服务器日志

### Q4: 敏感配置报"已加密但未配置解密密钥"怎么办？

**A**: 说明配置值使用了 `ENC(...)` 加密格式，但未配置解密密钥。处理方式：
1. 配置 RSA 密钥库：`sh.config.keystore.path` + 环境变量 `SH_CONFIG_KEYSTORE_PASSWORD`
2. 或配置 AES 密钥：环境变量 `SH_CONFIG_DECRYPT_AES_KEY`（或 `sh.config.decrypt-aes-key`）
3. 若确需明文，请重新加密或改用明文值（仅限开发环境）

### Q5: 如何自定义模板路径？

**A**: 使用 `FreeMarkerTemplateUtil.getTemplate(templateName, templatesDir)` 方法指定自定义目录：

```java
Template template = FreeMarkerTemplateUtil.getTemplate(
    "custom-template.ftl",
    "/opt/myapp/templates"
);
```

## 组件与依赖

### 1. 组件分类

了解 `sh-spring` 中哪些是 Spring Bean，哪些是工具类：

| 类 | 是否 Bean | 使用方式 |
|----|---------|---------|
| SystemConfig | 是（`@Configuration`） | 可注入 |
| Sys | 是（`@Component`） | 静态方法访问 |
| SpringContextHolder | 是（`@Component`） | 自动注入或静态方法 |
| SensitiveConfigEncryptor | 否（工具类，final + 私有构造） | 静态方法调用 / CLI 命令行 |
| SensitiveConfigDecryptor | 否（工具类，final + 私有构造） | 静态方法调用 |
| SnowflakeHelper | 否（工具类） | 静态方法调用 |
| FreeMarkerTemplateUtil | 否（工具类，私有构造） | 静态方法调用 |
| MailUtil | 否（POJO） | 实例化 + setter + sendEmail() |

### 2. 依赖关系

```
sh-tool (SnowflakeIdWorker, AesTool, RsaTool, Base64Tool)
  ↑
sh-core (SystemException, EnvType)
  ↑
sh-spring (SpringContextHolder, Sys, SystemConfig, SensitiveConfigEncryptor/Decryptor, SnowflakeHelper, FreeMarkerTemplateUtil, MailUtil)
```

`sh-spring` 的 maven 依赖：`sh-core`、`spring-boot-starter`、`spring-boot-starter-freemarker`、`spring-boot-starter-mail`、`com.sun.mail:jakarta.mail`、`org.bouncycastle:bcpkix-jdk18on`（RSA 密钥库证书生成）。

## 总结

`sh-spring` 模块作为 `sh-framework` 的 Spring 生态扩展，为企业级应用开发提供了以下核心价值：

1. **简化开发**：提供静态工具方法，减少重复代码编写
2. **增强功能**：扩展 Spring 生态，提供企业级常用功能
3. **安全防护**：敏感配置支持 RSA 密钥库/AES 加密存储与启动时自动解密
4. **线程安全**：关键组件采用线程安全设计，支持高并发场景
5. **配置驱动**：支持灵活的配置管理，适应不同环境需求

通过合理使用 `sh-spring` 的各项功能，开发者可以：
- 在非 Spring 管理的类中方便地获取 Spring Bean
- 在分布式环境下生成唯一ID
- 安全存储并自动解密敏感配置
- 实现灵活的邮件发送和模板渲染
- 根据环境执行不同的业务逻辑

该模块的设计遵循了 Spring Boot 的约定优于配置原则，通过自动配置机制简化了使用复杂度，是企业级应用开发的重要基础设施组件。
