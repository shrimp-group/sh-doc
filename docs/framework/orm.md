# ORM 持久框架 (sh-mybatis)

sh-mybatis 是 sh-framework 提供的基于 MyBatis 的 ORM（对象关系映射）持久化框架。它封装了 MyBatis 的核心功能，提供了统一的 CRUD 操作接口、自动 SQL 生成、数据拦截器、分页查询等高级特性。

## 模块概述

### 核心价值
- **零SQL编码**：通过泛型和注解自动生成 CRUD SQL
- **统一数据操作**：标准化的 BaseMapper 和 BaseService 接口
- **智能查询构建**：基于实体对象自动构建查询条件
- **安全防护**：内置 SQL 注入防护（ORDER BY 白名单校验）和参数校验
- **性能优化**：批量操作分片、连接池管理（Druid）

### 解决的问题
1. 重复的 CRUD SQL 编写问题
2. 分页查询代码复杂问题
3. SQL 注入安全问题
4. 数据库字段类型映射问题
5. 乐观锁和软删除实现问题

## 核心功能特性

### 1. 基础映射接口 (BaseMapper)

`BaseMapper<T extends BaseEntity>` 提供完整的单表 CRUD 操作，共 16 个方法：

| 分类 | 方法签名 | 行为说明 |
| --- | --- | --- |
| 插入 | `int insert(T entity)` | 插入单条，跳过空字段；主键自增回填实体 id |
| 插入 | `int insertBatch(List<T> entities)` | 批量插入，全列插入（空值也插入） |
| 删除 | `int deleteById(Long id)` | 逻辑删除单条 |
| 删除 | `int deleteByIdEntity(T entity)` | 逻辑删除单条，实体携带 id |
| 删除 | `int deleteByIds(List<Long> ids)` | 逻辑删除多条（id IN） |
| 删除 | `int deleteByIdsEntity(T entity)` | 逻辑删除多条，实体 ids 字段指定范围 |
| 更新 | `int updateById(T entity)` | 全字段更新（含 null），带乐观锁 |
| 更新 | `int updateByIdSelective(T entity)` | 只更新非空字段，带乐观锁 |
| 更新 | `int updateBatch(T entity)` | 按实体 ids 字段做一次批量 UPDATE（非空字段）；version 自动 +1，但不校验原版本号 |
| 查询 | `T selectById(Long id)` | 单条查询，包含 Blob 字段 |
| 查询 | `List<T> selectByIds(List<Long> ids)` | 多条查询，不含 Blob 字段 |
| 查询 | `List<T> selectAll()` | 全量查询，不含 Blob 字段，按 id 倒序 |
| 查询 | `List<T> selectByEntity(T entity)` | 条件查询，不含 Blob 字段 |
| 查询 | `List<T> selectByEntityWithLimit(T entity)` | 条件分页查询（`LIMIT offset, size`），不含 Blob 字段 |
| 查询 | `long selectCountByEntity(T entity)` | 条件计数 |
| 查询 | `T selectOneByEntity(T entity)` | 条件查询单条（`LIMIT 1`），包含 Blob 字段 |

### 2. 基础服务类 (BaseService)

`BaseService<T extends BaseEntity, M extends BaseMapper<T>>` 是服务层封装，标注 `@Service` 与 `@Transactional`（类级事务），通过 `@Autowired protected M mapper` 注入 Mapper。共 18 个方法：

- **插入**：`insert(T)`、`insertBatch(List<T>)`（自动分片，每次最多 1000 条）
- **删除**：`deleteById(Long)`、`deleteById(T)`、`deleteByIdEntity(T)`、`deleteByIds(List<Long>)`、`deleteByIds(T)`、`deleteByIdsEntity(T)`
- **更新**：`updateById(T)`、`updateByIdSelective(T)`、`updateBatch(T)`
- **查询**：`selectById(Long)`、`selectByIds(List<Long>)`、`selectAll()`、`selectByEntity(T)`、`selectOneByEntity(T)`、`selectCountByEntity(T)`
- **分页**：`selectPage(T entity)`，返回 `PageData<T>`

`selectPage` 内部流程（结果状态）：
1. 初始化分页参数 `entity.init()`（current 默认 1、size 默认 10，并计算 offset）
2. 调用 `selectCountByEntity` 统计总数
3. 总数为 0 时返回空列表，否则调用 `selectByEntityWithLimit` 查询当前页数据
4. 将总数写入实体（count/total），通过 `PageData.fromEntity(entity, records)` 封装返回

### 3. SQL 提供者 (SQL Providers)

SQL 由 MyBatis Provider 动态生成。`BaseMapperProvider` 提供公共能力（实体元数据缓存、字段值读取、IN 子句构建、WHERE 条件构建、ORDER BY 白名单校验），具体 SQL 由以下 16 个 Provider 生成：

- 插入：`InsertMapperProvider`、`InsertBatchMapperProvider`
- 删除：`DeleteByIdMapperProvider`、`DeleteByIdEntityMapperProvider`、`DeleteByIdsMapperProvider`、`DeleteByIdsEntityMapperProvider`
- 更新：`UpdateByIdMapperProvider`、`UpdateByIdSelectiveMapperProvider`、`UpdateBatchMapperProvider`
- 查询：`SelectByIdMapperProvider`、`SelectByIdsMapperProvider`、`SelectAllMapperProvider`、`SelectByEntityMapperProvider`、`SelectByEntityWithLimitMapperProvider`、`SelectCountByEntityMapperProvider`、`SelectOneByEntityMapperProvider`

### 4. 实体属性管理 (DbEntityProperty)

实体类元数据管理，静态缓存按实体类复用：
- 表名映射：实体类名驼峰转下划线（如 `UserInfo` → `user_info`）
- 字段映射：字段名驼峰转下划线（如 `createTime` → `create_time`）
- 忽略字段规则：
  - 插入忽略：`id`、`createTime`、`updateTime`、`version`
  - 更新忽略：`id`、`createBy`、`createTime`、`updateTime`、`version`
  - 条件构建忽略：`ids`（仅用于 IN 范围）
- 注解解析：`@Blob` 标注的字段不参与列表查询字段与查询条件

### 5. MyBatis 拦截器

- **MyBatisQueryInterceptor**：拦截查询操作，将查询参数中的空字符串递归替换为 null，避免空串参与条件匹配
- **MyBatisUpdateInterceptor**：拦截 INSERT/UPDATE 操作，自动填充审计字段：
  - 操作人取自 `IdentityContext.getUserCode()`，无用户信息时使用默认值 `nobody`
  - INSERT：设置 `createBy`、`updateBy`；非 INSERT：仅设置 `updateBy`，`createBy` 置空
  - 清空 `createTime`、`updateTime`，交由数据库自动填充
- **MyBatisBoundSqlInterceptor**：为 `deleteById`/`deleteByIds` 等非实体参数场景，将 `#{updateBy}` 占位符以附加参数注入（值同样来自 `IdentityContext.getUserCode()`，无则 `nobody`）

### 6. 分页查询助手 (PageQuery)

基于 PageHelper 的分页查询工具类，三个静态 `page()` 重载，均以 `finally PageHelper.clearPage()` 保证分页上下文清理：

| 重载 | 说明 |
| --- | --- |
| `page(T param extends BaseEntity, Function<T, List<T>>)` | 分页参数内置于实体，`param.init()` 后分页 |
| `page(Pageable pageable, P param, Function<P, List<T>>)` | 分页参数与查询参数分离 |
| `page(P param extends Pageable, Function<P, List<T>>)` | 查询参数本身实现 Pageable，分页参数合一 |

返回统一封装的 `PageData<T>`（含 current、size、offset、total、count、records）。

### 7. 注解系统

- **@Blob**：标识大字段。被标注的字段不出现在列表查询（selectByIds、selectAll、selectByEntity、selectByEntityWithLimit）的 SELECT 列与查询条件中；单对象查询（selectById、selectOneByEntity）仍包含该字段

### 8. 元数据查询 (TableInfoService)

基于 `information_schema` 的数据库元数据查询，`TableInfoService` 提供：
- `getTables(TableInfo)`：表信息（表名、注释、引擎、字符集）
- `getColumns(TableInfo)`：列信息（类型、长度、是否自增、是否非空、默认值、注释）
- `getIndexs(TableInfo)`：索引信息
- `getColumnInfos4Options(ColumnQuery)`：字段选项信息（字段名、类型、注释及出现次数）

未显式指定 `tableSchema` 时，自动从 `spring.datasource.url` 解析数据库名作为默认 schema。

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

sh:
  mybatis:
    # 数据长度检查：0-不检查，1-检查（预留配置项，默认 1）
    data-length-check: 1
```

> 说明：分页由 PageQuery/selectPage 内部基于 PageHelper 自动完成，无需额外配置 pagehelper 相关参数。

### 3. 创建实体类
```java
@Data
@EqualsAndHashCode(callSuper = true)
public class User extends BaseEntity {

    /** 用户名 */
    private String username;

    /** 邮箱 */
    private String email;

    /** 个人简介（大字段，列表查询时不包含） */
    @Blob
    private String bio;

    /** 用户状态：0-禁用，1-启用 */
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
        // updateBatch 按实体的 ids 字段做一次批量 UPDATE（只更新非空字段）
        User update = new User();
        update.setIds(userIds);
        update.setStatus(status);
        return updateBatch(update);
    }
}
```

### 2. 条件查询
`selectByEntity` 支持按实体非空字段精确匹配、List 字段 IN 查询、创建时间范围（timeFrom/timeTo）与排序：

```java
@Service
public class UserService extends BaseService<User, UserMapper> {

    public List<User> searchUsers(String username, Integer status,
                                 LocalDateTime startTime, LocalDateTime endTime) {
        User query = new User();

        if (StringUtils.isNotBlank(username)) {
            query.setUsername(username);
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

> 说明：`orderBy` 支持逗号分隔的多个排序项（如 `"name ASC, id DESC"`），框架会进行字段名白名单校验，非法字段自动忽略，默认按 `id DESC` 排序。`timeFrom`/`timeTo` 分别对应 `create_time >= ?` 与 `create_time <= ?`。

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
1. **统一继承BaseEntity**：所有数据库实体都应继承 BaseEntity（其继承自 DbColumnEntity，提供 id、createBy、createTime、updateBy、updateTime、remark、version 等规范字段）
2. **合理使用注解**：大字段添加 @Blob 注解，列表查询自动排除
3. **字段命名规范**：使用驼峰命名法，框架会自动转换为下划线
4. **版本控制**：使用 version 字段实现乐观锁
5. **逻辑删除**：表需包含 deleted 字段（0-未删除，删除时写入删除时间戳），框架自动维护

### 2. Mapper 设计规范
1. **保持简洁**：BaseMapper 已提供大部分 CRUD 操作，避免重复定义
2. **自定义SQL分离**：复杂查询在 XML 文件中实现，保持接口简洁
3. **参数命名规范**：使用 @Param 注解明确参数名称
4. **返回类型明确**：明确指定查询的返回类型

### 3. Service 设计规范
1. **业务逻辑封装**：在 Service 层封装业务逻辑，保持 Controller 简洁
2. **事务管理**：BaseService 类级已带 @Transactional，方法内可覆盖细化
3. **异常处理**：合理抛出和捕获 MyBatisException
4. **批量操作优化**：使用 insertBatch 和 updateBatch 进行批量操作

### 4. 查询优化建议
1. **避免全表查询**：总是添加查询条件
2. **合理使用索引**：为常用查询字段添加索引
3. **分页查询**：大数据量时使用分页查询
4. **字段选择**：使用 @Blob 排除大字段，提高列表查询性能

### 5. 性能优化
1. **批量操作**：使用批量插入和更新减少数据库连接次数
2. **连接池配置**：合理配置 Druid 连接池参数（druid-spring-boot-4-starter）
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
```

### 2. MyBatis 配置
```yaml
mybatis:
  # 映射文件位置（框架内置 TableInfoMapper.xml 位于 classpath:mapper/ 下）
  mapper-locations: classpath:mapper/*.xml
  # 实体类包路径
  type-aliases-package: com.example.entity
  configuration:
    # 开启驼峰命名转换
    map-underscore-to-camel-case: true
    # 日志实现
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

### 3. 框架配置
```yaml
# sh-mybatis 配置
sh:
  mybatis:
    # 数据长度检查：0-不检查，1-检查（预留配置项，默认 1）
    data-length-check: 1
```

框架自动从 `spring.datasource.url` 解析数据库名，作为 TableInfoService 元数据查询的默认 `tableSchema`。

## 常见问题解答

### Q1: 如何实现软删除？
A: 表结构需包含 `deleted` 字段（0-未删除）。删除操作（deleteById/deleteByIds 等）实际执行 UPDATE，将 `deleted` 置为删除时刻的时间戳，同时 `version` 自增。所有查询（selectById/selectByIds/selectAll/selectByEntity 等）自动携带 `deleted = 0` 条件。

### Q2: 如何实现乐观锁？
A: `updateById`/`updateByIdSelective` 会自动生成 `version = version + 1`；当实体携带非空 version 值时，额外追加 `AND version = #{version}` 条件。版本不匹配时更新影响行数为 0（不抛异常），由业务代码根据返回值自行判断是否冲突。

### Q3: 如何处理大字段（如 TEXT、BLOB）？
A: 使用 @Blob 注解标记大字段，框架在列表查询（selectByIds/selectAll/selectByEntity/selectByEntityWithLimit）时会自动排除这些字段，提高查询性能；单条记录查询（selectById/selectOneByEntity）仍包含这些字段。

### Q4: 如何自定义查询条件？
A: 通过实体类字段设置查询条件，框架自动构建 WHERE 子句：非空字符串/数字字段使用等值匹配，List 字段使用 IN 查询，`timeFrom`/`timeTo` 对应 `create_time` 范围查询，`orderBy` 支持白名单校验后的排序。

### Q5: 如何防止 SQL 注入？
A: 框架使用 MyBatis 的参数化查询，所有参数值都会预处理绑定。同时 ORDER BY 子句会进行字段名白名单校验（仅允许实体字段名及 ASC/DESC 关键字），非法排序字段自动忽略，防止 SQL 注入。

### Q6: 如何实现动态表名？
A: 目前框架不支持动态表名。如果需要分表，建议在应用层实现分表逻辑，或者使用数据库中间件。

### Q7: 如何集成多数据源？
A: 框架基于 Spring Boot 的自动配置（ShMyBatisAutoConfig 自动扫描 com.wkclz.mybatis 包），可以配合多数据源配置使用，需要手动配置多个数据源和对应的 MyBatis 配置。

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
- 使用 insertBatch 代替多次 insert（框架自动按 1000 条分片）
- 批量大小控制在 100-1000 条之间
- 开启 JDBC 批处理：`rewriteBatchedStatements=true`

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

### 2. 连接池监控
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
- 基于 MyBatis 3.x（mybatis-spring-boot-starter）
- 支持 Spring Boot 4.x
- 支持 MySQL 8.x
- 基于 Java 25 构建（JDK 17+ 可用）
- 连接池：druid-spring-boot-4-starter

### 升级注意事项
1. 从旧版本升级时，注意实体类注解的变化
2. 配置项名称可能有变化
3. 部分 API 可能已废弃，请查看更新日志

## 总结

sh-mybatis 提供了强大而灵活的 ORM 解决方案，通过以下方式提升开发效率：

1. **减少重复代码**：自动生成 CRUD SQL，减少 80% 的数据访问层代码
2. **统一开发规范**：标准化的接口和注解，确保代码一致性
3. **提升代码质量**：内置安全防护（逻辑删除、乐观锁、ORDER BY 白名单）和性能优化
4. **简化复杂操作**：批量操作、分页查询、事务管理等复杂功能一键使用
5. **易于维护**：清晰的代码结构和完整的文档支持

通过合理使用 sh-mybatis 的各项功能，可以显著提升项目的开发效率、代码质量和系统性能。
