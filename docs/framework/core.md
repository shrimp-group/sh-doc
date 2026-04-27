# Core 核心模块

Core 模块是 sh-framework 框架的核心基础组件，提供了应用程序开发所需的基础技术能力和通用架构组件。它封装了开发中常用的非业务性技术组件、基础实体、异常处理、响应封装等核心功能。

## 模块概述

### 核心价值
- **标准化**：统一技术实现标准，提升代码一致性
- **高效性**：减少重复代码编写，提高开发效率
- **可维护性**：集中管理基础组件，便于维护和升级
- **扩展性**：提供灵活的扩展机制，支持定制化需求

### 解决的问题
1. 基础实体重复定义问题
2. 响应格式不统一问题
3. 异常处理混乱问题
4. 用户上下文管理复杂问题
5. 代码描述信息缺失问题

## 核心功能特性

### 1. 基础实体类
- **DbColumnEntity**：数据库基础字段实体（ID、创建时间、更新时间等）
- **BaseEntity**：扩展基础实体（分页、查询、用户信息等辅助功能）
- **UserInfo**：用户基础信息实体（用户编码、用户名、租户编码等）

### 2. 统一响应封装
- **R<T>**：统一API响应格式（响应码、消息、数据、耗时等）
- **PageData<T>**：统一分页响应格式（分页信息和数据列表）

### 3. 异常处理体系
- **CommonException**：基础业务异常类
- **专用异常类**：ValidationException、UnauthorizedException、NotFoundException等
- **异常工厂方法**：支持字符串模板的静态工厂方法

### 4. 结果码枚举 (ResultCode)
完整的结果码体系，涵盖：
- 基础状态码（200、400、401、404、500）
- Token相关（10000系列）
- 应用/租户相关（10100系列）
- 用户认证相关（30000系列）
- 数据操作相关（40000系列）
- 订单相关（60000系列）

### 5. 注解系统
- **@FieldDesc**：字段描述注解（描述信息 + 是否非空）
- **@ApiDesc**：API描述注解
- **@Router**：路由注解
- **@Desc**：通用描述注解（已废弃）

### 6. 用户上下文管理
- **UserContext**：基于ThreadLocal的用户上下文工具类
- **UserNameProvider**：用户名提供者SPI接口

### 7. 其他功能
- **EnvType**：系统环境类型枚举（DEV、SIT、UAT、PROD）
- **MaskingPatternLayout**：日志脱敏处理布局

## 快速开始

### 1. 添加依赖
```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-core</artifactId>
</dependency>
```

### 2. 使用基础实体
```java
@Data
public class UserEntity extends BaseEntity {
    @FieldDesc("用户名")
    private String username;
    
    @FieldDesc("邮箱")
    private String email;
}
```

### 3. 使用统一响应
```java
@RestController
@RequestMapping("/api/user")
public class UserController {
    
    @GetMapping("/{id}")
    @ApiDesc("根据ID查询用户")
    public R<UserEntity> getUser(@PathVariable Long id) {
        UserEntity user = userService.getById(id);
        if (user == null) {
            return R.error(ResultCode.NOT_FOUND);
        }
        return R.ok(user);
    }
    
    @PostMapping
    @ApiDesc("创建用户")
    public R<UserEntity> createUser(@RequestBody @Valid UserEntity user) {
        UserEntity created = userService.create(user);
        return R.ok(created);
    }
}
```

### 4. 使用分页查询
```java
@Service
public class UserService {
    
    public R<PageData<UserEntity>> getUsers(BaseEntity query) {
        // 初始化分页参数
        query.init();
        
        // 查询数据
        List<UserEntity> userList = userMapper.selectUsers(query);
        Long total = userMapper.countUsers(query);
        
        // 返回分页结果
        PageData<UserEntity> pageData = PageData.of(userList, total, query.getCurrent(), query.getSize());
        return R.ok(pageData);
    }
}
```

### 5. 使用异常处理
```java
@Service
public class OrderService {
    
    public OrderEntity getOrder(Long orderId) {
        OrderEntity order = orderMapper.selectById(orderId);
        if (order == null) {
            // 使用预定义的结果码
            throw new NotFoundException(ResultCode.RECORD_NOT_EXIST);
        }
        
        if (order.getStatus() == OrderStatus.PAID) {
            // 使用自定义消息
            throw new CommonException("订单已支付，不能重复支付");
        }
        
        // 使用字符串模板
        if (order.isExpired()) {
            throw CommonException.of("订单 {} 已超时，请重新下单", orderId);
        }
        
        return order;
    }
}
```

### 6. 使用用户上下文
```java
@Component
public class AuthInterceptor implements HandlerInterceptor {
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 从请求中解析用户信息
        UserInfo userInfo = extractUserInfo(request);
        
        // 设置到用户上下文
        UserContext.setUserInfo(userInfo);
        
        return true;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // 请求完成后清除用户上下文
        UserContext.clear();
    }
}
```

```java
@Service
public class AuditService {
    
    public void saveAuditLog(String action, String resource) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setResource(resource);
        
        // 从用户上下文获取用户信息
        UserInfo userInfo = UserContext.getUserInfo();
        if (userInfo != null) {
            log.setUserCode(userInfo.getUserCode());
            log.setTenantCode(userInfo.getTenantCode());
            log.setUsername(userInfo.getUsername());
        }
        
        auditMapper.insert(log);
    }
}
```

### 7. 实现SPI扩展
```java
@Component
public class CustomUserNameProvider implements UserNameProvider {
    
    @Autowired
    private UserService userService;
    
    @Override
    public Map<String, String> getNamesByUserCodes(Set<String> userCodes) {
        if (userCodes == null || userCodes.isEmpty()) {
            return Collections.emptyMap();
        }
        
        // 查询用户信息
        List<UserEntity> users = userService.getByUserCodes(userCodes);
        
        // 构建映射关系
        return users.stream()
            .collect(Collectors.toMap(
                UserEntity::getUserCode,
                UserEntity::getUsername
            ));
    }
}
```

### 8. 使用日志脱敏
```xml
<!-- logback.xml配置 -->
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="ch.qos.logback.classic.encoder.PatternLayoutEncoder">
            <layout class="com.wkclz.core.log.MaskingPatternLayout">
                <!-- 添加脱敏规则 -->
                <maskPattern>(\d{3})\d{4}(\d{4})</maskPattern> <!-- 手机号 -->
                <maskPattern>(\w{3})\w+@(\w+\.\w+)</maskPattern> <!-- 邮箱 -->
                <maskPattern>"password":"([^"]+)"</maskPattern> <!-- 密码 -->
                <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </layout>
        </encoder>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

## 最佳实践指南

### 1. 实体设计规范
1. **统一继承BaseEntity**：所有数据库实体都应继承BaseEntity
2. **合理使用注解**：为重要字段添加FieldDesc注解
3. **版本控制**：使用version字段实现乐观锁
4. **分页参数初始化**：调用query.init()初始化分页参数

### 2. 响应设计规范
1. **统一响应格式**：所有API返回R<T>类型响应
2. **合理使用状态码**：根据业务场景选择ResultCode
3. **分页标准化**：分页查询使用PageData<T>封装
4. **错误信息友好**：提供清晰的错误提示信息

### 3. 异常处理规范
1. **异常分类明确**：根据异常类型选择合适异常类
2. **异常信息友好**：提供清晰的异常描述
3. **异常链完整**：保留原始异常信息
4. **统一异常处理**：使用@ControllerAdvice统一处理

### 4. 用户上下文规范
1. **及时设置清除**：在拦截器中设置，请求完成后清除
2. **避免内存泄漏**：确保ThreadLocal被正确清理
3. **上下文验证**：使用前验证用户上下文是否存在
4. **SPI扩展实现**：根据需求实现UserNameProvider

### 5. 日志安全规范
1. **敏感信息脱敏**：配置脱敏规则保护用户隐私
2. **日志级别合理**：根据重要性设置合适的日志级别
3. **日志格式统一**：使用统一的日志格式
4. **异常日志完整**：记录完整的异常堆栈信息

## 常见问题解答

### Q1: 为什么需要继承BaseEntity？
A: BaseEntity提供了数据库通用字段和分页查询辅助功能，避免在每个实体中重复定义这些字段，提高代码复用性和一致性。

### Q2: 如何自定义异常消息格式？
A: 可以使用字符串模板功能：`CommonException.of("用户 {} 不存在", userId)`，支持参数化消息。

### Q3: 用户上下文在多线程环境下是否安全？
A: UserContext基于ThreadLocal实现，每个线程有独立的副本，在多线程环境下是安全的。但需要注意在异步任务中手动传递用户上下文。

### Q4: 如何扩展结果码体系？
A: 可以在ResultCode枚举中添加新的结果码，建议按照功能模块分类（如10000系列为Token相关，30000系列为用户认证相关）。

### Q5: 日志脱敏支持哪些模式？
A: 支持正则表达式模式，可以配置手机号、邮箱、密码、身份证号等常见敏感信息的脱敏规则。

### Q6: SPI扩展如何生效？
A: 实现UserNameProvider接口并添加@Component注解，框架会自动发现并加载该实现。

## 贡献指南

### 1. 代码规范
- 遵循Java编码规范
- 使用Lombok减少样板代码
- 添加必要的单元测试
- 保持向后兼容性

### 2. 文档要求
- 为新增功能添加使用示例
- 更新API文档
- 添加必要的注释
- 提供迁移指南（如有破坏性变更）

### 3. 测试要求
- 单元测试覆盖率不低于80%
- 集成测试覆盖主要功能
- 性能测试验证关键路径
- 兼容性测试确保向后兼容

### 4. 发布流程
1. 功能开发完成
2. 编写测试用例
3. 更新文档
4. 代码审查
5. 合并到主分支
6. 版本发布

## 版本兼容性

### 当前版本：1.0.0
- 基础实体类稳定
- 异常体系完善
- 响应格式标准化
- 用户上下文管理

### 未来规划
- 增强国际化支持
- 优化性能表现
- 扩展SPI机制
- 增强监控能力

## 总结

Core模块作为sh-framework的技术基础，提供了完整的基础技术能力支持。通过合理使用Core模块的各项功能，开发者可以：

1. 大幅减少重复代码编写
2. 统一技术实现标准
3. 提高代码质量和可维护性
4. 快速构建稳定可靠的应用程序

建议新项目从一开始就集成Core模块，充分利用其提供的标准化组件，确保项目技术架构的一致性和可维护性。