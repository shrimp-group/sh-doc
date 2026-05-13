# ORM 持久框架 (sh-mybatis)

sh-mybatis 是 sh-framework 提供的基于 MyBatis 的 ORM（对象关系映射）持久化框架。它封装了 MyBatis 的核心功能，提供了统一的 CRUD 操作接口、自动 SQL 生成、数据拦截器、分页查询等高级特性。

## 模块概述

### 核心价值
- **零SQL编码**：通过泛型和注解自动生成 CRUD SQL
- **统一数据操作**：标准化的 BaseMapper 和 BaseService 接口
- **智能查询构建**：基于实体对象自动构建查询条件
- **安全防护**：内置 SQL 注入防护和参数校验
- **性能优化**：批量操作、连接池管理、查询优化

### 解决的问题
1. 重复的 CRUD SQL 编写问题
2. 分页查询代码复杂问题
3. SQL 注入安全问题
4. 数据库字段类型映射问题
5. 乐观锁和软删除实现问题

## 核心功能特性

### 1. 基础映射接口 (BaseMapper)
完整的单表 CRUD 操作接口：
- **插入**：insert、insertBatch
- **删除**：deleteById、deleteByIds
- **更新**：updateById、updateByIdSelective、updateBatch
- **查询**：selectById、selectByIds、selectAll、selectByEntity、selectOneByEntity、selectCountByEntity
- **分页**：selectByEntityWithLimit

### 2. 基础服务类 (BaseService)
服务层封装：
- 批量插入（自动分片，每次最多1000条）
- 分页查询封装
- 事务管理支持

### 3. SQL 提供者 (SQL Providers)
动态 SQL 生成器：
- InsertMapperProvider：插入 SQL 生成
- UpdateMapperProvider：更新 SQL 生成
- DeleteMapperProvider：删除 SQL 生成
- SelectMapperProvider：查询 SQL 生成

### 4. 实体属性管理 (DbEntityProperty)
实体类元数据管理：
- 表名映射（驼峰转下划线）
- 字段映射关系
- 字段类型识别
- 注解解析（@FieldDesc、@Blob）

### 5. MyBatis 拦截器
- **MyBatisQueryInterceptor**：查询参数拦截，空字符串转 null
- **MyBatisUpdateInterceptor**：更新操作拦截，自动设置时间戳

### 6. 分页查询助手 (PageQuery)
简化分页查询：
- 基于 PageHelper 的分页封装
- 统一分页响应格式

### 7. 注解系统
- **@Blob**：标识大字段，列表查询时自动排除
- **@FieldDesc**：字段描述注解

## 快速开始

### 1. 添加依赖
```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-mybatis</artifactId>
</dependency>
```

### 2. 配置数据源
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/your_database
    username: your_username
    password: your_password
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.example.entity
  configuration:
    map-underscore-to-camel-case: true

pagehelper:
  helper-dialect: mysql
  reasonable: true
```

### 3. 创建实体类
```java
@Data
@EqualsAndHashCode(callSuper = true)
public class User extends BaseEntity {
    
    @FieldDesc("用户名")
    private String username;
    
    @FieldDesc("邮箱")
    private String email;
    
    @FieldDesc("个人简介")
    @Blob  // 大字段，列表查询时不包含
    private String bio;
    
    @FieldDesc("用户状态：0-禁用，1-启用")
    private Integer status;
}
```

### 4. 创建 Mapper 接口
```java
@Mapper
public interface UserMapper extends BaseMapper<User> {
    // 可以添加自定义的查询方法
}
```

### 5. 创建 Service 类
```java
@Service
public class UserService extends BaseService<User, UserMapper> {
    
    public User getByUsername(String username) {
        User query = new User();
        query.setUsername(username);
        return selectOneByEntity(query);
    }
    
    public boolean isUsernameExists(String username) {
        User query = new User();
        query.setUsername(username);
        return selectCountByEntity(query) > 0;
    }
}
```

### 6. 创建 Controller
```java
@RestController
@RequestMapping("/api/user")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping("/{id}")
    public R<User> getById(@PathVariable Long id) {
        User user = userService.selectById(id);
        return R.ok(user);
    }
    
    @PostMapping
    public R<User> create(@RequestBody User user) {
        if (userService.isUsernameExists(user.getUsername())) {
            return R.error("用户名已存在");
        }
        
        int result = userService.insert(user);
        if (result > 0) {
            return R.ok(user);
        }
        return R.error("创建用户失败");
    }
    
    @GetMapping("/page")
    public R<PageData<User>> page(User query) {
        PageData<User> pageData = userService.selectPage(query);
        return R.ok(pageData);
    }
}
```

## 高级用法

### 1. 批量操作
```java
@Service
public class UserService extends BaseService<User, UserMapper> {
    
    public int importUsers(List<User> users) {
        // 自动分片处理，每次最多1000条
        return insertBatch(users);
    }
    
    public int batchUpdateStatus(List<Long> userIds, Integer status) {
        User update = new User();
        update.setIds(userIds);
        update.setStatus(status);
        return updateBatch(update);
    }
}
```

### 2. 复杂查询
```java
@Service
public class UserService extends BaseService<User, UserMapper> {
    
    public List<User> searchUsers(String keyword, Integer status, 
                                 LocalDateTime startTime, LocalDateTime endTime) {
        User query = new User();
        
        if (StringUtils.isNotBlank(keyword)) {
            query.setKeyword(keyword);
        }
        
        if (status != null) {
            query.setStatus(status);
        }
        
        if (startTime != null) query.setTimeFrom(startTime);
        if (endTime != null) query.setTimeTo(endTime);
        
        query.setOrderBy("create_time DESC");
        
        return selectByEntity(query);
    }
}
```

### 3. 自定义 SQL 查询
```java
@Mapper
public interface UserMapper extends BaseMapper<User> {
    
    // 需要在 XML 文件中实现
    List<User> selectByRoleId(@Param("roleId") Long roleId);
    
    List<Map<String, Object>> selectUserActivity(@Param("startDate") String startDate, 
                                                 @Param("endDate") String endDate);
}
```

```xml
<!-- UserMapper.xml -->
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectByRoleId" resultType="com.example.entity.User">
        SELECT u.* FROM user u
        INNER JOIN user_role ur ON u.id = ur.user_id
        WHERE ur.role_id = #{roleId} AND u.deleted = 0
        ORDER BY u.create_time DESC
    </select>
</mapper>
```

### 4. 事务管理
```java
@Service
@Transactional
public class UserService extends BaseService<User, UserMapper> {
    
    @Autowired
    private UserRoleService userRoleService;
    
    @Transactional(rollbackFor = Exception.class)
    public R<User> createUserWithRole(User user, List<Long> roleIds) {
        // 1. 创建用户
        int userResult = insert(user);
        if (userResult <= 0) {
            throw new MyBatisException("创建用户失败");
        }
        
        // 2. 分配角色
        for (Long roleId : roleIds) {
            UserRole userRole = new UserRole();
            userRole.setUserId(user.getId());
            userRole.setRoleId(roleId);
            userRoleService.insert(userRole);
        }
        
        return R.ok(user);
    }
}
```

## 最佳实践指南

### 1. 实体设计规范
1. **统一继承BaseEntity**：所有数据库实体都应继承 BaseEntity
2. **合理使用注解**：为重要字段添加 @FieldDesc 注解，大字段添加 @Blob 注解
3. **字段命名规范**：使用驼峰命名法，框架会自动转换为下划线
4. **版本控制**：使用 version 字段实现乐观锁

### 2. Mapper 设计规范
1. **保持简洁**：BaseMapper 已提供大部分 CRUD 操作，避免重复定义
2. **自定义SQL分离**：复杂查询在 XML 文件中实现，保持接口简洁
3. **参数命名规范**：使用 @Param 注解明确参数名称
4. **返回类型明确**：明确指定查询的返回类型

### 3. Service 设计规范
1. **业务逻辑封装**：在 Service 层封装业务逻辑，保持 Controller 简洁
2. **事务管理**：在 Service 方法上使用 @Transactional 注解
3. **异常处理**：合理抛出和捕获 MyBatisException
4. **批量操作优化**：使用 insertBatch 和 updateBatch 进行批量操作

### 4. 查询优化建议
1. **避免全表查询**：总是添加查询条件
2. **合理使用索引**：为常用查询字段添加索引
3. **分页查询**：大数据量时使用分页查询
4. **字段选择**：使用 @Blob 排除大字段，提高列表查询性能

### 5. 性能优化
1. **批量操作**：使用批量插入和更新减少数据库连接次数
2. **连接池配置**：合理配置 Druid 连接池参数
3. **SQL 监控**：开启慢查询日志，定期优化 SQL
4. **缓存策略**：合理使用 Redis 缓存查询结果

## 配置说明

### 1. 数据源配置
```yaml
spring:
  datasource:
    # 基本配置
    url: jdbc:mysql://localhost:3306/database
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver
    
    # Druid 连接池配置
    type: com.alibaba.druid.pool.DruidDataSource
    druid:
      initial-size: 5
      min-idle: 5
      max-active: 20
      max-wait: 60000
      time-between-eviction-runs-millis: 60000
      min-evictable-idle-time-millis: 300000
      validation-query: SELECT 1
      test-while-idle: true
      test-on-borrow: false
      test-on-return: false
      pool-prepared-statements: true
      max-pool-prepared-statement-per-connection-size: 20
      filters: stat,wall,log4j
```

### 2. MyBatis 配置
```yaml
mybatis:
  # 映射文件位置
  mapper-locations: classpath:mapper/*.xml
  # 实体类包路径
  type-aliases-package: com.example.entity
  configuration:
    # 开启驼峰命名转换
    map-underscore-to-camel-case: true
    # 开启缓存
    cache-enabled: true
    # 懒加载
    lazy-loading-enabled: true
    # 日志实现
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

### 3. PageHelper 配置
```yaml
pagehelper:
  # 数据库方言
  helper-dialect: mysql
  # 分页合理化
  reasonable: true
  # 支持通过 Mapper 接口参数来传递分页参数
  support-methods-arguments: true
  # 配置参数映射
  params: count=countSql
  # 默认页码参数名
  page-size-zero: true
  # 分页插件会从查询方法的参数值中自动识别分页参数
  auto-runtime-dialect: true
```

### 4. 框架配置
```yaml
# sh-mybatis 配置
sh:
  mybatis:
    # 数据长度检查：0-不检查，1-检查
    data-length-check: 1
```

## 常见问题解答

### Q1: 如何实现软删除？
A: BaseEntity 中已经包含 deleted 字段（逻辑删除标记），框架会自动在查询条件中添加 `deleted = 0`。删除操作实际上是更新 deleted 字段为 1。

### Q2: 如何实现乐观锁？
A: BaseEntity 中已经包含 version 字段。在更新操作时，框架会自动检查 version 字段，如果版本不匹配会抛出异常。

### Q3: 如何处理大字段（如 TEXT、BLOB）？
A: 使用 @Blob 注解标记大字段，框架在列表查询时会自动排除这些字段，提高查询性能。在单条记录查询时仍然会包含这些字段。

### Q4: 如何自定义查询条件？
A: 可以通过实体类的字段设置查询条件，框架会自动构建 WHERE 子句。支持字符串、数字、列表、时间范围等多种条件类型。

### Q5: 如何防止 SQL 注入？
A: 框架使用 MyBatis 的参数化查询，所有参数都会进行预处理。同时，ORDER BY 子句会进行字段名白名单校验，防止 SQL 注入。

### Q6: 如何实现动态表名？
A: 目前框架不支持动态表名。如果需要分表，建议在应用层实现分表逻辑，或者使用数据库中间件。

### Q7: 如何集成多数据源？
A: 框架基于 Spring Boot 的自动配置，可以配合多数据源配置使用。需要手动配置多个数据源和对应的 MyBatis 配置。

## 性能调优

### 1. 连接池优化
```yaml
spring:
  datasource:
    druid:
      # 根据应用负载调整
      initial-size: 10
      min-idle: 10
      max-active: 50
      max-wait: 10000
      # 连接有效性检查
      validation-query: SELECT 1
      test-while-idle: true
      test-on-borrow: false
      test-on-return: false
```

### 2. 批量操作优化
- 使用 insertBatch 代替多次 insert
- 批量大小控制在 100-1000 条之间
- 开启批处理模式：`rewriteBatchedStatements=true`

### 3. 查询优化
- 为常用查询字段添加索引
- 避免 SELECT *，只查询需要的字段
- 使用分页查询处理大数据量
- 合理使用缓存

### 4. 事务优化
- 保持事务尽量短小
- 避免在事务中进行远程调用
- 合理设置事务隔离级别

## 监控与调试

### 1. SQL 日志监控
```yaml
mybatis:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

### 2. 慢查询监控
```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

### 3. 连接池监控
```java
// 获取 Druid 数据源监控信息
@Autowired
private DataSource dataSource;

public void monitorConnectionPool() {
    DruidDataSource druidDataSource = (DruidDataSource) dataSource;
    log.info("活跃连接数: {}", druidDataSource.getActiveCount());
    log.info("空闲连接数: {}", druidDataSource.getPoolingCount());
    log.info("最大连接数: {}", druidDataSource.getMaxActive());
}
```

## 版本兼容性

### 当前版本特性
- 基于 MyBatis 3.x
- 支持 Spring Boot 3.x
- 支持 MySQL 8.x
- 支持 Java 17+

### 升级注意事项
1. 从旧版本升级时，注意实体类注解的变化
2. 配置项名称可能有变化
3. 部分 API 可能已废弃，请查看更新日志

## 总结

sh-mybatis 提供了强大而灵活的 ORM 解决方案，通过以下方式提升开发效率：

1. **减少重复代码**：自动生成 CRUD SQL，减少 80% 的数据访问层代码
2. **统一开发规范**：标准化的接口和注解，确保代码一致性
3. **提升代码质量**：内置安全防护和性能优化
4. **简化复杂操作**：批量操作、分页查询、事务管理等复杂功能一键使用
5. **易于维护**：清晰的代码结构和完整的文档支持

通过合理使用 sh-mybatis 的各项功能，可以显著提升项目的开发效率、代码质量和系统性能。