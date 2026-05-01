# 服务端使用说明 - Generator-Server

Generator-Server 是代码生成系统的核心服务模块，您可以将它集成到自己的Spring Boot应用中，为您的应用添加代码生成能力。

## 什么是 Generator-Server？

Generator-Server 是一个Spring Boot Starter，它提供了：
- **代码生成核心逻辑**：基于FreeMarker模板引擎
- **数据库连接管理**：支持多种数据库类型
- **模板管理接口**：RESTful API接口
- **项目管理功能**：管理代码生成项目

## 使用场景

### 场景1：在现有应用中集成代码生成
如果您已经有一个Spring Boot应用，想要添加代码生成功能，可以集成Generator-Server。

### 场景2：构建代码生成平台
如果您想要构建一个代码生成平台，可以使用Generator-Server作为核心服务。

### 场景3：团队内部工具
为开发团队提供统一的代码生成工具，提高开发效率。

## 快速集成

### 1. 添加依赖

在您的Spring Boot项目中添加依赖：

```xml
<dependency>
    <groupId>com.wkclz.generator</groupId>
    <artifactId>generator-server</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. 基本配置

在 `application.yml` 中添加基本配置：

```yaml
# 服务端口
server:
  port: 8080

# 数据库配置（用于存储模板、项目等数据）
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/generator_db
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver
  
  # JPA配置
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

# 代码生成配置
generator:
  # 临时文件路径
  temp-path: /tmp/generator
  # 最大生成文件数
  max-file-count: 1000
  # 是否启用Swagger文档
  swagger-enabled: true
```

### 3. 启动应用

启动您的Spring Boot应用，Generator-Server会自动集成并启动。

## 详细配置

### 1. 数据库配置

Generator-Server需要数据库来存储以下数据：
- 数据源配置
- 模板配置
- 项目配置
- 生成日志

支持的数据库：
- MySQL 5.7+
- PostgreSQL 10+
- 其他Spring Data JPA支持的数据库

### 2. 文件存储配置

```yaml
generator:
  # 临时文件存储路径
  temp-path: ${user.home}/.generator/temp
  
  # 上传文件大小限制
  upload:
    max-file-size: 10MB
    max-request-size: 100MB
  
  # 生成文件配置
  output:
    # 默认输出路径
    default-path: ./generated
    # 是否自动清理临时文件
    auto-clean: true
    # 临时文件保留时间（小时）
    temp-retention-hours: 24
```

### 3. 安全配置

```yaml
# 安全配置（可选）
security:
  # 是否启用安全认证
  enabled: true
  
  # JWT配置
  jwt:
    secret: your-jwt-secret-key
    expiration: 86400000  # 24小时
    
  # 用户配置
  users:
    - username: admin
      password: admin123
      roles: ADMIN
    - username: user
      password: user123
      roles: USER
```

### 4. 缓存配置

```yaml
# Redis缓存配置（可选）
spring:
  redis:
    host: localhost
    port: 6379
    password: 
    database: 0

generator:
  cache:
    # 模板缓存
    template:
      enabled: true
      ttl: 3600  # 缓存时间（秒）
    
    # 数据源缓存
    datasource:
      enabled: true
      ttl: 1800
```

## API接口

集成后，您的应用将提供以下RESTful API：

### 1. 数据源管理
- `GET /generator/datasource/page` - 分页查询数据源
- `POST /generator/datasource/create` - 创建数据源
- `POST /generator/datasource/update` - 更新数据源
- `POST /generator/datasource/remove` - 删除数据源
- `GET /generator/datasource/options` - 获取数据源选项

### 2. 模板管理
- `GET /generator/template/page` - 分页查询模板
- `POST /generator/template/create` - 创建模板
- `POST /generator/template/update` - 更新模板
- `POST /generator/template/remove` - 删除模板
- `GET /generator/template/options` - 获取模板选项

### 3. 项目管理
- `GET /generator/project/page` - 分页查询项目
- `POST /generator/project/create` - 创建项目
- `POST /generator/project/update` - 更新项目
- `POST /generator/project/remove` - 删除项目
- `POST /generator/project/copy` - 复制项目

### 4. 任务管理
- `GET /generator/task/list` - 查询项目任务
- `POST /generator/task/save` - 保存任务配置
- `POST /generator/task/remove` - 删除任务

### 5. 代码生成
- `POST /generator/gen/generate` - 生成代码
- `GET /generator/gen/zip` - 下载生成的代码包
- `GET /generator/gen/preview` - 预览生成结果

## 自定义扩展

### 1. 自定义模板变量

您可以添加自定义的模板变量处理器：

```java
@Component
public class CustomTemplateVariableProcessor implements TemplateVariableProcessor {
    
    @Override
    public Map<String, Object> process(Map<String, Object> variables) {
        // 添加自定义变量
        variables.put("currentYear", LocalDate.now().getYear());
        variables.put("companyName", "示例公司");
        variables.put("author", System.getProperty("user.name"));
        
        return variables;
    }
    
    @Override
    public int getOrder() {
        return 0;  // 执行顺序
    }
}
```

### 2. 自定义数据库类型映射

```java
@Component
public class CustomDbTypeMapper implements DbTypeMapper {
    
    @Override
    public String mapToJavaType(String dbType, Integer length) {
        // 自定义数据库类型到Java类型的映射
        if ("custom_type".equalsIgnoreCase(dbType)) {
            return "String";
        }
        return null;  // 返回null使用默认映射
    }
    
    @Override
    public String mapToTsType(String dbType) {
        // 自定义数据库类型到TypeScript类型的映射
        if ("custom_type".equalsIgnoreCase(dbType)) {
            return "string";
        }
        return null;
    }
}
```

### 3. 自定义生成后处理器

```java
@Component
public class CustomPostProcessor implements GeneratePostProcessor {
    
    @Override
    public void process(GenResult result) {
        // 生成后的处理逻辑
        if (result.isSuccess()) {
            // 发送通知
            sendNotification("代码生成完成", result.getFileCount() + "个文件已生成");
            
            // 记录日志
            logGenerateResult(result);
        }
    }
    
    private void sendNotification(String title, String message) {
        // 发送通知的实现
    }
    
    private void logGenerateResult(GenResult result) {
        // 记录日志的实现
    }
}
```

## 集成示例

### 示例1：简单的管理后台

```java
@SpringBootApplication
@EnableGeneratorServer  // 启用代码生成服务
public class AdminApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(AdminApplication.class, args);
    }
    
    @Bean
    public CommandLineRunner initData(GenTemplateService templateService) {
        return args -> {
            // 初始化默认模板
            if (templateService.count() == 0) {
                initDefaultTemplates(templateService);
            }
        };
    }
    
    private void initDefaultTemplates(GenTemplateService templateService) {
        // 创建默认模板
        GenTemplate entityTemplate = new GenTemplate();
        entityTemplate.setTempCode("entity_java");
        entityTemplate.setTempName("Java实体类模板");
        entityTemplate.setTempSubfix(".java");
        entityTemplate.setTempContent("package ${table.packagePath};\\n\\nimport lombok.Data;\\n\\n@Data\\npublic class ${table.entityName} {\\n<#list table.fullColumns as column>\\n    private ${column.javaType} ${column.fieldName};\\n</#list>\\n}");
        
        templateService.save(entityTemplate);
    }
}
```

### 示例2：带权限控制的管理后台

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .authorizeRequests()
                .antMatchers("/generator/**").hasRole("ADMIN")  // 代码生成接口需要ADMIN权限
                .antMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            .and()
            .formLogin()
                .loginPage("/login")
                .permitAll()
            .and()
            .logout()
                .permitAll();
    }
    
    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth
            .inMemoryAuthentication()
                .withUser("admin").password("{noop}admin123").roles("ADMIN")
                .and()
                .withUser("user").password("{noop}user123").roles("USER");
    }
}
```

## 监控与运维

### 1. 健康检查

集成后，可以通过以下端点监控服务状态：

Note: 1.1.2. Spring Boot Actuator 端点
- `/actuator/health` - 健康检查
- `/actuator/info` - 应用信息
- `/actuator/metrics` - 性能指标
- `/actuator/prometheus` - Prometheus指标

### 2. 日志配置

```yaml
logging:
  level:
    com.wkclz.generator: DEBUG
  file:
    name: logs/generator.log
  pattern:
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{50} - %msg%n"
```

### 3. 性能监控

```java
@Configuration
public class MetricsConfig {
    
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config().commonTags(
            "application", "generator-server",
            "version", "1.0.0"
        );
    }
}
```

## 常见问题

### Q: 集成后启动失败怎么办？
**排查步骤：**
1. 检查依赖冲突
2. 检查数据库配置
3. 查看启动日志
4. 检查端口占用

### Q: 如何自定义API路径？
A: 在配置文件中修改：
```yaml
generator:
  api:
    prefix: /api/generator  # 修改API前缀
```

### Q: 支持集群部署吗？
A: 支持，需要配置共享的数据库和文件存储。

### Q: 如何备份数据？
A: 定期备份数据库和模板文件。

### Q: 性能如何优化？
**优化建议：**
1. 启用缓存
2. 使用CDN存储静态资源
3. 数据库优化
4. 异步处理大文件生成

## 最佳实践

### 1. 生产环境部署
- **使用专用数据库**：不要使用开发数据库
- **配置备份策略**：定期备份重要数据
- **启用监控告警**：监控服务状态
- **配置安全策略**：启用身份认证和授权

### 2. 性能优化
- **启用缓存**：减少数据库查询
- **异步处理**：大文件生成使用异步
- **分页查询**：大数据量使用分页
- **连接池优化**：配置合适的连接池参数

### 3. 安全加固
- **启用HTTPS**：生产环境使用HTTPS
- **配置防火墙**：限制访问IP
- **定期更新**：及时更新依赖版本
- **访问日志**：记录所有访问日志

## 相关资源

- [GitHub仓库](https://github.com/shrimp-group/sh-generator)
- [API文档](../../api/generator/)
- [示例项目](https://github.com/shrimp-group/sh-generator-examples)

---

**提示**：如果您在集成过程中遇到问题，可以查看[常见问题](#常见问题)部分或提交Issue。