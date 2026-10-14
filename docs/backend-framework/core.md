# Core 核心模块

Core 模块是 sh-framework 框架的核心基础组件，提供应用程序开发所需的基础技术能力和通用架构组件。它封装了开发中常用的非业务性技术组件、基础实体、异常处理、响应封装、身份上下文等核心功能。

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
4. 用户身份上下文管理复杂问题
5. 接口/字段描述信息缺失问题

## 核心功能特性

### 1. 基础实体类
- **DbColumnEntity**：数据库规范字段实体（主键、排序、创建/更新时间与操作人、备注、版本）
- **BaseEntity**：扩展基础实体（分页、查询、用户与租户编码等辅助字段），实现分页接口 `Pageable`
- **UserIdentity**：用户身份实体（用户编码、用户名、昵称、头像、扩展属性）

### 2. 统一响应封装
- **R&lt;T&gt;**：统一 API 响应格式（响应码、消息、数据、请求/响应时间、耗时）
- **PageData&lt;T&gt;**：统一分页响应格式（分页信息 + 数据列表）
- **CursorPageData&lt;T&gt;**：游标分页响应格式（不统计总数，用于 C 端列表）

### 3. 异常处理体系
- **CommonException**：业务异常基类（持有 `int code`）
- **7 个专用异常类**：`ApiException`、`ApplicationException`、`NotFoundException`、`SystemException`、`UnauthorizedException`、`UserException`、`ValidationException`
- **异常工厂方法**：支持字符串模板与结果码的静态工厂方法 `of(...)`

### 4. 结果码枚举 (ResultCode)
完整的结果码体系，按功能分段：
- 标准状态码（200、400、401、403、404、500）
- 10000 系列：Token / 应用 / 租户（10001–10102）
- 20000 系列：客户端 / 路由 / CORS（20001–20004）
- 30000 系列：登录 / 验证码（30001–30005）
- 40000 系列：数据 / 参数（40001–40006）
- 50000 系列：网络 / RPC（50001–50003）
- 60000 系列：订单（60001–60003）

### 5. 注解系统
- **@Router**：路由注解（类级别），声明模块与前缀
- **@Schema**（Swagger 注解）：接口/字段描述，由 sh-core 直接引入依赖

### 6. 用户身份上下文管理
- **IdentityContext**：基于 ThreadLocal 的身份上下文工具类（全部静态方法，线程隔离）
- **UserNameProvider**：按用户编码批量获取姓名的 SPI 接口

### 7. 其他功能
- **EnvType**：系统环境类型枚举（DEV、SIT、UAT、PROD，含中文描述）
- **MaskingPatternLayout**：logback 日志脱敏 Layout

## 快速开始

### 1. 添加依赖
```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-core</artifactId>
</dependency>
```
引入 sh-core 即自动传递依赖 sh-tool 与 swagger-annotations（`@Schema`）。

### 2. 使用基础实体
```java
@Data
public class UserEntity extends BaseEntity {
    @Schema(description = "用户名")
    private String username;

    @Schema(description = "邮箱")
    private String email;
}
```

**DbColumnEntity 字段**：`id`（主键）、`sort`（排序号，越大越往后）、`createTime`、`createBy`（创建人 code）、`updateTime`、`updateBy`（更新人 code）、`remark`、`version`（数据版本）。

**BaseEntity 在 DbColumnEntity 之上扩展的字段**：

| 分组 | 字段 | 说明 |
| --- | --- | --- |
| 姓名回填 | `createByName` / `updateByName` | 创建人/更新人姓名 |
| 上下文 | `userCode` / `tenantCode` | 用户编码 / 租户编码 |
| 查询辅助 | `orderBy` / `ids` / `keyword` / `timeFrom` / `timeTo` | 排序规则 / 主键数组 / 模糊关键字 / 时间范围 |
| 分页辅助 | `current` / `size` / `offset` / `total` / `count` | 页码 / 大小 / 偏移 / 总数 / 统计数 |
| 调试 | `debug` | debug 模式参数 |

静态工具方法：
- `copy(source, target)`：全量属性复制；`target` 为 null 时基于 `source` 类型自动创建
- `copyIfNotNull(source, target)`：仅复制非 null 属性

### 3. 使用统一响应

**R&lt;T&gt; 字段**：`code`、`msg`、`data`、`requestTime`、`responseTime`、`costTime`。

**静态工厂方法**：

| 方法 | 说明 |
| --- | --- |
| `R.ok()` / `R.ok(data)` | 成功（200） |
| `R.warn()` / `R.warn(msg)` / `R.warn(tpl, args)` | 校验警告（400，消息支持模板） |
| `R.error()` / `R.error(msg)` / `R.error(tpl, args)` | 内部错误（500） |
| `R.error(CommonException)` | 按异常携带的 code/msg 返回 |
| `R.error(code, msg)` | 自定义 code 与消息 |

```java
@RestController
@Router(module = "user", prefix = "/api/user")
public class UserController {

    @GetMapping("/{id}")
    public R<UserEntity> getUser(@PathVariable Long id) {
        UserEntity user = userService.getById(id);
        if (user == null) {
            throw new NotFoundException(ResultCode.RECORD_NOT_EXIST);
        }
        return R.ok(user);
    }

    @PostMapping
    public R<UserEntity> createUser(@RequestBody @Valid UserEntity user) {
        UserEntity created = userService.create(user);
        return R.ok(created);
    }
}
```

### 4. 使用分页查询

分页参数由 `Pageable` 接口提供，`BaseEntity` 已实现。调用 `init()` 后：`current`/`size` 为空或小于 1 时取默认值（`DEFAULT_CURRENT=1`、`DEFAULT_SIZE=10`），并自动计算 `offset=(current-1)*size`。

```java
@Service
public class UserService {

    public R<PageData<UserEntity>> getUsers(UserQuery query) {
        query.init(); // 初始化分页参数：current / size / offset

        List<UserEntity> userList = userMapper.selectUsers(query);
        Long total = userMapper.countUsers(query);

        return R.ok(PageData.fromEntity(query, userList));
    }
}
```

**PageData&lt;T&gt; 字段**：`current`、`size`、`offset`、`total`、`count`、`records`。

**工厂方法**：
- `PageData.of(records, total)`：默认页码 1、每页大小 10
- `PageData.of(records, total, current, size)`：完整分页信息
- `PageData.of(records, current, size)`：不传总数时自动以列表长度作为 total
- `PageData.empty()` / `PageData.empty(current, size)`：空分页结果
- `PageData.fromEntity(entity, records)`：从 BaseEntity 复制分页信息
- `PageData.convert(source, newRecords)` / `convert(source, newRecords, targetClass)`：保持分页信息转换数据类型
- `pageData.convert(targetClass)`：实例方法，转换 records 元素类型（基于 BeanUtil）

### 5. 使用游标分页

**CursorPageData&lt;T&gt; 字段**：`records`（id 倒序）、`hasMore`（是否还有下一页）、`nextCursor`（下一页游标，无更多时为 null）。

- `CursorPageData.of(records, hasMore, nextCursor)`：快速创建（records 需调用方按 size 截断）
- `CursorPageData.empty()`：空游标分页结果

```java
public R<CursorPageData<UserEntity>> listByCursor(UserQuery query) {
    // 游标分页不统计总数
    List<UserEntity> records = userMapper.selectByCursor(query);
    Long nextCursor = records.isEmpty() ? null : records.get(records.size() - 1).getId();
    return R.ok(CursorPageData.of(records, 1, nextCursor));
}
```

### 6. 使用异常处理

`CommonException extends RuntimeException`，持有 `int code`。7 个子类（`ApiException`、`ApplicationException`、`NotFoundException`、`SystemException`、`UnauthorizedException`、`UserException`、`ValidationException`）均提供 6 个构造器：`(String)`、`(ResultCode)`、`(int, String)`、`(String, Throwable)`、`(ResultCode, Throwable)`、`(int, String, Throwable)`，以及 3 个静态工厂：`of(String, Object...)`、`of(ResultCode)`、`of(int, String, Object...)`。

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
            throw new ApplicationException("订单已支付，不能重复支付");
        }

        if (order.isExpired()) {
            // 使用字符串模板
            throw CommonException.of("订单 {} 已超时，请重新下单", orderId);
        }

        return order;
    }
}
```

### 7. 使用用户身份上下文

`IdentityContext` 为 ThreadLocal 实现、全部静态方法，线程隔离；**不负责自动清理**，由上层 Filter/Interceptor 在 `finally` 中调用 `clear()`。

| 方法 | 说明 |
| --- | --- |
| `set(UserIdentity, String token)` | 设置当前线程身份与 Token（两者均不可为 null） |
| `get()` | 获取 UserIdentity |
| `getToken()` | 获取认证 Token |
| `getUserCode()` / `getUsername()` / `getNickname()` / `getAvatar()` | 获取用户编码 / 用户名 / 昵称 / 头像 |
| `getAttribute(String key)` | 获取扩展属性 |
| `setAppCode(String)` / `getAppCode()` | 应用编码 |
| `setTenantCode(String)` / `getTenantCode()` | 租户编码（未设置时返回 `"default"`） |
| `clear()` | 清理当前线程身份信息 |

`UserIdentity` 字段：`userCode`、`username`、`nickname`、`avatar`、`attributes`（扩展属性 Map），并提供 `addAttribute(key, value)` 便捷添加单个扩展属性。

```java
// 认证过滤器：设置身份
UserIdentity identity = new UserIdentity();
identity.setUserCode("u10001");
identity.setUsername("zhangsan");
identity.addAttribute("openid", "wx-openid-xxx");
IdentityContext.set(identity, "token-xxx");
```

```java
// 业务代码：读取身份
String userCode = IdentityContext.getUserCode();
String tenantCode = IdentityContext.getTenantCode();
String openid = IdentityContext.getAttribute("openid");
```

```java
// 请求结束：清理（Filter finally 块）
IdentityContext.clear();
```

### 8. 实现 SPI 扩展

`UserNameProvider` 接口提供默认实现 `getNamesByUserCodes(Set<String>)`（返回 `Map<String,String>`，默认空 Map）。需要按用户编码批量获取姓名时，实现并注册为 Spring Bean 即可。

```java
@Component
public class CustomUserNameProvider implements UserNameProvider {

    @Override
    public Map<String, String> getNamesByUserCodes(Set<String> userCodes) {
        if (userCodes == null || userCodes.isEmpty()) {
            return Collections.emptyMap();
        }
        return userService.getByUserCodes(userCodes).stream()
            .collect(Collectors.toMap(
                UserEntity::getUserCode,
                UserEntity::getUsername
            ));
    }
}
```

### 9. 使用日志脱敏

`MaskingPatternLayout` 继承 logback `PatternLayout`，通过 `addMaskPattern(String)` 注册正则脱敏规则，日志输出时将匹配的捕获组内容替换为 `*`。

```xml
<!-- logback.xml 配置 -->
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="com.wkclz.core.log.MaskingPatternLayout">
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            <maskPattern>(\d{3})\d{4}(\d{4})</maskPattern> <!-- 手机号 -->
            <maskPattern>(\w{3})\w+@(\w+\.\w+)</maskPattern> <!-- 邮箱 -->
            <maskPattern>"password":"([^"]+)"</maskPattern> <!-- 密码 -->
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

### 10. 系统环境类型

`EnvType` 枚举：`DEV`（开发环境）、`SIT`（集成测试环境）、`UAT`（验收测试环境）、`PROD`（生产环境），通过 `getDesc()` 获取中文描述。

## 最佳实践指南

### 1. 实体设计规范
1. **统一继承 BaseEntity**：所有数据库实体都应继承 BaseEntity
2. **合理使用注解**：为重要字段添加 `@Schema(description = "...")` 描述
3. **版本控制**：使用 `version` 字段实现乐观锁
4. **分页参数初始化**：查询前调用 `query.init()` 初始化分页参数

### 2. 响应设计规范
1. **统一响应格式**：所有 API 返回 `R&lt;T&gt;` 类型响应
2. **合理使用状态码**：根据业务场景选择 ResultCode
3. **分页标准化**：分页查询使用 `PageData&lt;T&gt;` 封装，C 端游标列表使用 `CursorPageData&lt;T&gt;`
4. **错误信息友好**：提供清晰的错误提示信息

### 3. 异常处理规范
1. **异常分类明确**：根据异常类型选择合适异常类
2. **异常信息友好**：提供清晰的异常描述
3. **异常链完整**：保留原始异常信息
4. **统一异常处理**：使用 `@ControllerAdvice` 统一处理，并通过 `R.error(CommonException)` 返回

### 4. 身份上下文规范
1. **及时设置清除**：在认证过滤器中设置，请求完成后（finally）清除
2. **避免内存泄漏**：确保 ThreadLocal 被正确清理
3. **上下文验证**：使用前判断身份是否存在（`get()` 返回 null 表示未登录）
4. **SPI 扩展实现**：根据需求实现 UserNameProvider

### 5. 日志安全规范
1. **敏感信息脱敏**：配置脱敏规则保护用户隐私
2. **日志级别合理**：根据重要性设置合适的日志级别
3. **日志格式统一**：使用统一的日志格式
4. **异常日志完整**：记录完整的异常堆栈信息

## 常见问题解答

### Q1: 为什么需要继承 BaseEntity？
A: BaseEntity 提供了数据库通用字段、用户/租户上下文字段和分页查询辅助功能，避免在每个实体中重复定义这些字段，提高代码复用性和一致性。

### Q2: 如何自定义异常消息格式？
A: 可以使用字符串模板功能：`CommonException.of("用户 {} 不存在", userId)`，支持参数化消息。

### Q3: 身份上下文在多线程环境下是否安全？
A: IdentityContext 基于 ThreadLocal 实现，每个线程有独立的副本，在多线程环境下是安全的。但需要注意在异步任务中手动传递身份上下文。

### Q4: 如何扩展结果码体系？
A: 可以在 ResultCode 枚举中添加新的结果码，建议按照功能模块分类（如 10000 系列为 Token 相关，30000 系列为用户认证相关）。

### Q5: 日志脱敏支持哪些模式？
A: 支持正则表达式模式，可以配置手机号、邮箱、密码、身份证号等常见敏感信息的脱敏规则。

### Q6: SPI 扩展如何生效？
A: 实现 UserNameProvider 接口并注册为 Spring Bean（如 `@Component`），即可在需要按用户编码批量获取姓名的场景中使用。

## 贡献指南

### 1. 代码规范
- 遵循 Java 编码规范
- 使用 Lombok 减少样板代码
- 添加必要的单元测试
- 保持向后兼容性

### 2. 文档要求
- 为新增功能添加使用示例
- 更新 API 文档
- 添加必要的注释
- 提供迁移指南（如有破坏性变更）

### 3. 测试要求
- 单元测试覆盖率不低于 80%
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

## 总结

Core 模块作为 sh-framework 的技术基础，提供了完整的基础技术能力支持。通过合理使用 Core 模块的各项功能，开发者可以：

1. 大幅减少重复代码编写
2. 统一技术实现标准
3. 提高代码质量和可维护性
4. 快速构建稳定可靠的应用程序

建议新项目从一开始就集成 Core 模块，充分利用其提供的标准化组件，确保项目技术架构的一致性和可维护性。
