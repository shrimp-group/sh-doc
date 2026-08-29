# sh-dynamicdb

> 动态数据源模块 - 支持运行时数据源切换、多租户、读写分离

## 模块概述

`sh-dynamicdb` 是 `sh-framework` 的动态数据源管理模块，在 Spring 的 `AbstractRoutingDataSource` 基础上整体复制重写扩展。该模块提供运行时动态切换数据源的能力，支持多租户、读写分离、分库分表等复杂数据源管理场景。

### 核心价值

1. **动态切换**：运行时根据业务需求动态切换数据源
2. **线程安全**：基于 ThreadLocal 实现线程隔离的数据源上下文，AOP 切面自动清理
3. **缓存优化**：数据源连接池缓存机制（默认 60 秒），避免频繁创建销毁
4. **异步创建**：数据源创建在专用线程池中异步完成，同 key 并发请求共享同一创建任务
5. **自动清理**：定时任务自动清理缓存过期的数据源，主动销毁接口支持数据源变更场景
6. **灵活扩展**：工厂模式设计，支持自定义数据源创建逻辑

### 模块依赖

| 依赖 | 用途 |
| --- | --- |
| sh-mybatis | 提供 `DataSourceInfo` 数据源信息载体（传递引入 Druid 连接池） |
| sh-spring | 提供 `SpringContextHolder`，运行时获取容器内 Bean |
| spring-boot-starter-aop | 提供 AOP 切面能力 |
| lombok | 编译期代码生成 |

### 自动装配

通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 注册自动配置类 `com.wkclz.dynamicdb.ShDynamicdbAutoConfig`（`@AutoConfiguration` + 扫描 `com.wkclz.dynamicdb` 包），引入依赖后无需额外配置即可生效。

## 快速开始

### 1. 添加依赖

在项目的 `pom.xml` 文件中添加 `sh-dynamicdb` 依赖：

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-dynamicdb</artifactId>
    <version>${sh-framework.version}</version>
</dependency>
```

### 2. 实现数据源工厂（必须）

动态数据源仅在容器中存在 `DynamicDataSourceFactory` 实现 Bean 时才装配（`@ConditionalOnBean`）。因此必须实现该接口并注册为 Spring Bean：

```java
import com.wkclz.dynamicdb.DynamicDataSourceFactory;
import com.wkclz.mybatis.bean.DataSourceInfo;
import org.springframework.stereotype.Component;

@Component
public class MyDynamicDataSourceFactory implements DynamicDataSourceFactory {

    @Override
    public DataSourceInfo createDataSource(String key) {
        // 根据 key 创建数据源信息
        DataSourceInfo info = new DataSourceInfo();

        // 示例：根据租户ID切换数据库
        if ("tenant1".equals(key)) {
            info.setUrl("jdbc:mysql://localhost:3306/tenant1_db");
            info.setUsername("root");
            info.setPassword("password123");
        } else if ("tenant2".equals(key)) {
            info.setUrl("jdbc:mysql://localhost:3306/tenant2_db");
            info.setUsername("root");
            info.setPassword("password456");
        } else if ("readonly".equals(key)) {
            // 读写分离：只读从库
            info.setUrl("jdbc:mysql://slave1:3306/main_db");
            info.setUsername("readonly_user");
            info.setPassword("readonly_pass");
        }

        return info;
    }
}
```

> **DataSourceInfo 说明**：`DataSourceInfo` 提供 `url`、`driverClassName`（默认 `com.mysql.cj.jdbc.Driver`）、`username`、`password` 四个字段。动态数据源创建时仅使用其中的 `url`、`username`、`password`；`driverClassName` 取自 `spring.datasource.driverClassName` 配置（默认空，由 Druid 根据 url 自动识别）。

### 3. 配置动态数据源

在 `application.yml` 中配置：

```yaml
# 动态数据源配置
sh:
  dynamicdb:
    cache-second: 60              # 数据源缓存有效期（秒），默认 60
    cleanup-interval-second: 120  # 缓存过期清理定时扫描间隔（秒），默认 120

# 默认数据源配置（应用主数据源，必须配置）
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/default_db
    username: root
    password: '123456'
    driverClassName: com.mysql.cj.jdbc.Driver  # 可选，留空时 Druid 按 url 自动识别
    druid:
      initialSize: 0       # 默认 0
      maxActive: 8         # 默认 8
      minIdle: 0           # 默认 0
      maxWait: -1          # 默认 -1（不限等待）
      filters: stat,wall,slf4j  # 默认 stat,wall,slf4j
```

> 默认数据源即 Spring 容器中的主数据源（由 `spring.datasource.*` 配置产生），key 为空或未找到对应数据源时路由回默认数据源。

## 核心组件

### 1. AbstractShrimpRoutingDataSource

对 Spring `AbstractRoutingDataSource` 的整体复制重写，在全部重写父类之外新增了数据源集合的运行时操作方法：

**新增功能**：
- `addDataSource(Object lookupKey, DataSource dataSource)`：向数据源集合中添加数据源
- `getDataSource(Object lookupKey)`：通过 lookupKey 获取数据源
- `removeDataSource(Object lookupKey)`：从集合中移除数据源

**重写行为**：
- `afterPropertiesSet()`：解析 `targetDataSources` 与默认数据源，`resolvedDataSources` 为 `ConcurrentHashMap`
- `determineTargetDataSource()`：lookupKey 未命中且 `lenientFallback` 开启（默认 `true`）或 lookupKey 为 null 时，回退到默认数据源
- `getResolvedDataSources()`：返回数据源集合的只读视图
- `resolveSpecifiedLookupKey()`：直接返回 lookupKey，不做 JNDI 前缀解析

### 2. DynamicDataSource

动态数据源的具体实现，重写 `determineCurrentLookupKey()` 方法实现数据源切换，并实现 `DisposableBean`。

**核心特性**：
- **缓存机制**：数据源创建后缓存 `sh.dynamicdb.cache-second`（默认 60）秒，有效期内直接复用
- **key 级锁 + 异步创建**：`creatingDataSources.computeIfAbsent(key, ...)` 实现同 key 并发共享同一 `CompletableFuture`，创建在专用线程池中异步执行
- **专用线程池**：`dataSourceExecutor`（core=2、max=4、队列容量 64、KeepAlive 60s、`CallerRunsPolicy` 拒绝策略、守护线程 `dynamic-ds-creator-*`）
- **创建失败可重试**：创建异常时从 `creatingDataSources` 移除 Future，后续请求可重新发起创建
- **过期重建**：缓存过期后重建数据源前，先关闭旧 Druid 连接池
- **连接池管理**：基于 Druid 连接池，连接池参数由 `spring.datasource.druid.*` 配置决定
- **定时清理**：`startCleanupTask(scheduler, config)` 按 `cleanup-interval-second` 周期扫描并清理缓存过期的数据源；`stopCleanupTask()` 停止该任务
- **主动销毁**：`destroyDataSource(String key)` 取消进行中的创建任务、移除数据源并关闭连接池
- **优雅关闭**：`destroy()`（DisposableBean）停止清理任务 → 关闭专用线程池 → 关闭全部动态数据源

### 3. DynamicDataSourceHolder

基于 ThreadLocal 的数据源持有器，管理当前线程的数据源上下文。

**核心方法**（均为静态方法）：
- `set(String key)`：设置当前线程数据源 key
- `get()`：获取当前线程数据源 key
- `clear()`：清除当前线程数据源 key

### 4. DynamicDataSourceFactory

数据源工厂接口，由业务方实现并注册为 Bean，用于根据 key 创建数据源信息。

**核心方法**：
- `DataSourceInfo createDataSource(String key)`：根据 key 创建数据源信息，返回 null 时抛出 `SystemException`

### 5. DynamicDataSourceAop

AOP 切面，拦截所有标注 `@org.apache.ibatis.annotations.Mapper` 的类（`@within` 切点）。

**作用**：
- 环绕通知包装 Mapper 方法执行
- `finally` 中调用 `DynamicDataSourceHolder.clear()`，确保每次数据库操作后清理数据源上下文
- 防止数据源泄漏和内存泄漏

### 6. 配置类

#### ShDynamicdbAutoConfig

模块入口自动配置类：
- `@AutoConfiguration` 注解，经 `AutoConfiguration.imports` 文件注册
- `@ComponentScan(basePackages = "com.wkclz.dynamicdb")` 扫描模块内所有组件

#### DynamicDataSourceAutoConfig

动态数据源自动配置类：
- **启用条件**：`@ConditionalOnBean({DynamicDataSourceFactory.class})`，容器中不存在工厂实现时整个配置不生效
- 注入容器主数据源（`DataSource`）作为默认数据源，`targetDataSources` 初始化为空 `ConcurrentHashMap`
- 注册 `dynamicDataSource` Bean 并标记为 `@Primary`，注册后立即 `afterPropertiesSet()` 并启动定时清理任务
- 注册 `dynamicDsCleanupScheduler` Bean（单线程调度器，守护线程 `dynamic-ds-cleanup`）
- `@PreDestroy` 时关闭清理调度器

#### DynamicDataSourceConfig

动态数据源配置类：
- `sh.dynamicdb.cache-second`：数据源缓存有效期（秒），默认 `60`
- `sh.dynamicdb.cleanup-interval-second`：过期数据源定时清理扫描间隔（秒），默认 `120`

#### DefaultDataSourceConfig

默认数据源配置类，提供创建动态数据源时的基础连接池参数：
- `spring.datasource.name`：默认 `default`
- `spring.datasource.username` / `spring.datasource.password` / `spring.datasource.url` / `spring.datasource.driverClassName`：默认空
- `spring.datasource.druid.initialSize`：默认 `0`
- `spring.datasource.druid.maxActive`：默认 `8`
- `spring.datasource.druid.minIdle`：默认 `0`
- `spring.datasource.druid.maxWait`：默认 `-1`
- `spring.datasource.druid.filters`：默认 `stat,wall,slf4j`

## 工作原理

### 数据源切换流程

1. 业务代码调用 `DynamicDataSourceHolder.set("dataSourceKey")`
2. 执行 Mapper 方法时，`DynamicDataSourceAop` 环绕通知生效
3. `DynamicDataSource.determineCurrentLookupKey()` 被调用：
   - key 为 null → 返回 null，路由到默认数据源
   - 数据源已在缓存有效期内 → 直接返回 key 完成路由
   - key 不存在或缓存已过期 → 触发异步创建流程（见下）
4. 路由到目标数据源执行数据库操作
5. AOP 切面在 `finally` 中清理 ThreadLocal

### 数据源创建流程

1. `creatingDataSources.computeIfAbsent(key, ...)` 建立 key 级锁，同 key 并发请求共享同一个创建 Future
2. 若存在缓存过期的旧数据源，先关闭其 Druid 连接池
3. 在专用线程池 `dataSourceExecutor` 中异步执行：
   - 通过 `SpringContextHolder.getBean(DynamicDataSourceFactory.class)` 获取工厂
   - 调用 `createDataSource(key)` 获取 `DataSourceInfo`，为 null 则抛出 `SystemException`
   - 使用 `DefaultDataSourceConfig` 作为基础配置（`url`、`username`、`password` 替换为 `DataSourceInfo` 的值）
   - `MapUtil.obj2Map(config)` 转为参数 Map，经 `DruidDataSourceFactory.createDataSource(map)` 创建 Druid 连接池
   - `addDataSource(key, dataSource)` 加入路由集合，并记录创建时间用于缓存管理
4. 创建失败时移除 Future（允许后续重试），`whenComplete` 记录错误日志
5. 调用方 `future.get()` 阻塞等待创建结果

### 缓存过期自动清理

- 定时任务由 `startCleanupTask` 启动，按 `cleanup-interval-second`（默认 120 秒）周期扫描
- 扫描跳过仍在创建中的数据源 key
- 缓存超过 `cache-second` 的数据源：`removeDataSource(key)` 移除 → 关闭 Druid 连接池 → 删除缓存记录

### 数据源主动销毁

- `destroyDataSource(String key)`：取消该 key 进行中的创建 Future（若存在）→ 移除数据源 → 关闭 Druid 连接池 → 删除缓存记录。适用于数据源信息变更后主动销毁旧连接池
- `destroy()`：应用关闭时由 Spring 调用，停止清理任务 → 优雅关闭专用线程池 → 关闭全部动态数据源

## 使用示例

### 1. 多租户场景

```java
@Service
public class TenantService {

    @Autowired
    private UserMapper userMapper;

    public List<User> getUsersByTenant(String tenantId) {
        // 设置当前线程数据源为租户对应的数据库
        DynamicDataSourceHolder.set(tenantId);

        try {
            // 执行数据库操作，会自动切换到租户数据库
            return userMapper.selectAll();
        } finally {
            // 建议手动清理，AOP也会自动清理
            DynamicDataSourceHolder.clear();
        }
    }

    public User createUser(String tenantId, User user) {
        // 设置租户数据源
        DynamicDataSourceHolder.set(tenantId);

        try {
            // 插入用户数据到租户数据库
            userMapper.insert(user);
            return user;
        } finally {
            DynamicDataSourceHolder.clear();
        }
    }
}
```

### 2. 读写分离场景

```java
@Service
public class ReadWriteService {

    @Autowired
    private OrderMapper orderMapper;

    // 写操作使用主库（默认数据源，不设置 key）
    public Order createOrder(Order order) {
        orderMapper.insert(order);
        return order;
    }

    // 读操作使用从库
    public Order getOrder(Long orderId) {
        // 设置只读数据源
        DynamicDataSourceHolder.set("readonly");

        try {
            return orderMapper.selectById(orderId);
        } finally {
            DynamicDataSourceHolder.clear();
        }
    }
}
```

### 3. 分库分表场景

```java
@Service
public class ShardingService {

    @Autowired
    private ProductMapper productMapper;

    // 根据产品类型选择不同的数据库
    public Product getProductByType(String productType, Long productId) {
        // 根据产品类型确定数据源
        String dataSourceKey = getDataSourceKeyByProductType(productType);
        DynamicDataSourceHolder.set(dataSourceKey);

        try {
            return productMapper.selectById(productId);
        } finally {
            DynamicDataSourceHolder.clear();
        }
    }

    private String getDataSourceKeyByProductType(String productType) {
        // 根据业务规则确定数据源
        switch (productType) {
            case "electronics":
                return "db_electronics";
            case "clothing":
                return "db_clothing";
            case "books":
                return "db_books";
            default:
                return "default";
        }
    }
}
```

### 4. 动态数据源工厂高级实现

```java
@Component
public class AdvancedDynamicDataSourceFactory implements DynamicDataSourceFactory {

    @Autowired
    private TenantConfigService tenantConfigService;

    @Override
    public DataSourceInfo createDataSource(String key) {
        DataSourceInfo info = new DataSourceInfo();

        // 多租户场景：从配置中心获取租户数据库信息
        if (key.startsWith("tenant_")) {
            String tenantId = key.substring(7);
            TenantDatabaseConfig config = tenantConfigService.getDatabaseConfig(tenantId);

            info.setUrl(config.getUrl());
            info.setUsername(config.getUsername());
            info.setPassword(config.getPassword());
        }
        // 读写分离场景：从负载均衡器获取从库地址
        else if (key.startsWith("read_")) {
            String slaveKey = key.substring(5);
            SlaveDatabase slave = loadBalancer.getSlaveDatabase(slaveKey);

            info.setUrl(slave.getUrl());
            info.setUsername(slave.getUsername());
            info.setPassword(slave.getPassword());
        }
        // 默认数据源
        else {
            throw new IllegalArgumentException("Unknown data source key: " + key);
        }

        return info;
    }
}
```

## 高级配置

### 1. 自定义数据源缓存与清理周期

```yaml
sh:
  dynamicdb:
    cache-second: 300              # 缓存5分钟，适合数据源不经常变化的场景
    cleanup-interval-second: 120   # 每120秒扫描一次过期数据源并清理
```

### 2. 连接池参数优化

```yaml
spring:
  datasource:
    druid:
      # 初始连接数
      initialSize: 5
      # 最大活跃连接数
      maxActive: 20
      # 最小空闲连接数
      minIdle: 5
      # 获取连接最大等待时间（毫秒）
      maxWait: 60000
      # 配置监控统计拦截的filters
      filters: stat,wall,slf4j
```

> 动态数据源连接池仅消费以上 `initialSize` / `maxActive` / `minIdle` / `maxWait` / `filters` 五个参数；Druid 其余连接池参数（如 `validationQuery`、`testWhileIdle` 等）作用于应用主数据源，动态数据源不继承。

### 3. 多环境配置

```yaml
# application-dev.yml
sh:
  dynamicdb:
    cache-second: 30  # 开发环境缓存时间短，便于调试

# application-prod.yml
sh:
  dynamicdb:
    cache-second: 300  # 生产环境缓存时间长，提高性能
```

## 最佳实践

### 1. 数据源切换建议

- **及时清理**：使用 try-finally 确保 ThreadLocal 被清理（AOP 切面兜底）
- **避免嵌套**：不要在同一个方法中多次切换数据源
- **明确作用域**：数据源切换应尽量在最小作用域内完成
- **统一管理**：在 Service 层统一管理数据源切换逻辑

### 2. 连接池管理

- **合理配置**：根据业务量配置连接池参数（`maxActive`、`maxWait` 等）
- **监控告警**：监控连接池使用情况，设置告警阈值
- **缓存周期**：根据数据源信息变化频率调整 `cache-second`，避免长时间持有已变更的连接池
- **主动销毁**：数据源信息变更后调用 `destroyDataSource(key)` 立即释放旧连接池，无需等待缓存过期

### 3. 性能优化

- **缓存策略**：根据数据源变化频率调整缓存时间
- **连接复用**：合理设置连接池参数，提高连接复用率
- **异步创建**：数据源创建在专用线程池中异步完成，不阻塞业务调用线程
- **懒加载**：数据源按需创建，减少启动时间

### 4. 错误处理

- **降级策略**：数据源创建失败时回退到默认数据源（`lenientFallback` 默认开启）
- **重试机制**：创建失败后 Future 会被移除，后续请求自动重新创建
- **日志记录**：数据源创建、清理、销毁均记录日志，异常路径记录 error 日志
- **监控告警**：设置数据源健康状态监控和告警

## 常见问题解答

### Q1: 数据源切换不生效怎么办？

**A**: 检查以下问题：
1. 确保 `DynamicDataSourceFactory` 实现类已添加 `@Component` 注解（缺少时 `DynamicDataSourceAutoConfig` 因 `@ConditionalOnBean` 不装配）
2. 确认 `DynamicDataSourceHolder.set()` 在 Mapper 方法调用之前执行
3. 检查数据源 key 是否在工厂中有对应的实现
4. 查看日志确认数据源创建过程（成功/失败均有日志）
5. 确认 `sh-dynamicdb` 依赖已正确添加

### Q2: 如何监控数据源使用情况？

**A**: 可以通过以下方式监控：
1. **Druid 监控**：启用 Druid 监控统计功能，访问 `/druid` 查看
2. **自定义监控**：注入 `DynamicDataSource`，遍历 `getResolvedDataSources()` 查看当前数据源集合
3. **日志分析**：通过日志分析数据源创建、清理和销毁情况
4. **Spring Boot Actuator**：集成 Actuator 监控端点

### Q3: 数据源缓存时间设置多长合适？

**A**: 缓存时间设置建议：
1. **开发环境**：30-60秒，便于调试和快速响应配置变化
2. **测试环境**：60-120秒，平衡性能和稳定性
3. **生产环境**：300-600秒，提高性能，减少连接创建开销
4. **动态环境**：如果数据源配置经常变化，可设置为30秒以下，并配合 `destroyDataSource(key)` 主动销毁

### Q4: 如何实现数据源健康检查？

**A**: 实现数据源健康检查的几种方式：
1. **定时任务检查**：注入 `DynamicDataSource`，定时遍历数据源检查连接是否正常
2. **首次使用检查**：在数据源首次使用时进行检查（创建失败会记录 error 日志）
3. **连接池配置**：为应用主数据源配置 Druid 的 `validationQuery` 等参数
4. **自定义健康端点**：实现 Spring Boot Actuator 健康端点

### Q5: 如何处理数据源连接泄漏？

**A**: 防止连接泄漏的措施：
1. **AOP 保证清理**：依赖 `DynamicDataSourceAop` 在 Mapper 方法执行后自动清理 ThreadLocal
2. **try-finally 块**：在业务代码中使用 try-finally 手动清理
3. **定时清理**：`cleanup-interval-second` 定时任务自动清理过期数据源连接池
4. **定期检查**：定期检查 ThreadLocal 是否被正确清理

### Q6: 支持哪些数据库类型？

**A**: `sh-dynamicdb` 支持所有 JDBC 兼容的数据库：
1. **MySQL**：默认支持（`DataSourceInfo.driverClassName` 默认 `com.mysql.cj.jdbc.Driver`）
2. **PostgreSQL**：通过 `spring.datasource.driverClassName` 配置相应驱动
3. **Oracle**：通过 `spring.datasource.driverClassName` 配置相应驱动
4. **SQL Server**：通过 `spring.datasource.driverClassName` 配置相应驱动
5. **其他数据库**：只要提供正确的 JDBC 驱动和 URL 即可

## 扩展开发

### 1. 自定义数据源选择策略

可继承 `DynamicDataSource` 重写 `determineCurrentLookupKey()`，在路由前增加自定义选择逻辑：

```java
public class CustomDynamicDataSource extends DynamicDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        // 已显式设置的数据源 key，直接交给父类逻辑处理
        String key = DynamicDataSourceHolder.get();
        if (key != null) {
            return super.determineCurrentLookupKey();
        }
        // 未显式设置时，根据当前操作类型自动选择
        return isReadOperation() ? "read_slave1" : null;
    }

    private boolean isReadOperation() {
        // 通过当前线程栈中的方法名等判断是否为读操作
        StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
        for (StackTraceElement element : stackTrace) {
            String methodName = element.getMethodName().toLowerCase();
            if (methodName.contains("get") || methodName.contains("find")
                || methodName.contains("select") || methodName.contains("query")) {
                return true;
            }
        }
        return false;
    }
}
```

> 自定义实现需自行注册为 Bean 并保证容器中仅有一个 `DataSource` 主数据源（或替换 `DynamicDataSourceAutoConfig` 中 `@Primary` 的 `dynamicDataSource` Bean）。

### 2. 数据源监控扩展

```java
@Component
public class DataSourceMonitor {

    @Autowired
    private DynamicDataSource dynamicDataSource;

    @Scheduled(fixedDelay = 60000) // 每分钟执行一次
    public void monitorDataSources() {
        Map<Object, DataSource> dataSources = dynamicDataSource.getResolvedDataSources();

        dataSources.forEach((key, dataSource) -> {
            if (dataSource instanceof DruidDataSource dds) {
                // 监控连接池状态
                int activeCount = dds.getActiveCount();
                int maxActive = dds.getMaxActive();

                // 记录监控指标
                log.info("数据源 {} 状态: 活跃连接={}, 最大连接={}, 使用率={}%",
                    key, activeCount, maxActive,
                    (int) ((double) activeCount / maxActive * 100));

                // 告警逻辑
                if (activeCount > maxActive * 0.8) {
                    log.warn("数据源 {} 活跃连接数过高: {}/{}",
                        key, activeCount, maxActive);
                }
            }
        });
    }
}
```

> `getResolvedDataSources()` 返回只读视图，仅可用于监控，不能直接增删数据源。

### 3. 动态数据源配置管理

数据源信息变更时，可主动销毁旧连接池（无需等待缓存过期）：

```java
import com.alibaba.druid.pool.DruidDataSourceFactory;
import com.wkclz.dynamicdb.DynamicDataSource;
import com.wkclz.dynamicdb.bean.DefaultDataSourceConfig;
import com.wkclz.mybatis.bean.DataSourceInfo;
import com.wkclz.tool.utils.MapUtil;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.Map;

@Service
public class DynamicDataSourceManager {

    @Autowired
    private DynamicDataSource dynamicDataSource;

    /**
     * 动态添加数据源（或刷新已存在的数据源）
     */
    public void addDataSource(String key, DataSourceInfo info) {
        // 创建配置
        DefaultDataSourceConfig config = new DefaultDataSourceConfig();
        config.setUrl(info.getUrl());
        config.setUsername(info.getUsername());
        config.setPassword(info.getPassword());

        // 创建数据源
        Map<String, Object> map = MapUtil.obj2Map(config);
        DataSource dataSource = DruidDataSourceFactory.createDataSource(map);

        // 添加到动态数据源
        dynamicDataSource.addDataSource(key, dataSource);

        log.info("动态添加数据源成功: {}", key);
    }

    /**
     * 动态移除数据源（取消进行中的创建任务并关闭连接池）
     */
    public void removeDataSource(String key) {
        dynamicDataSource.destroyDataSource(key);
        log.info("动态移除数据源成功: {}", key);
    }
}
```

> 注意：`dynamicDataSource.addDataSource(key, dataSource)` 添加的数据源**不经过缓存管理**（不写入创建时间），不会被定时清理任务回收，需通过 `destroyDataSource(key)` 手动释放。

## 总结

`sh-dynamicdb` 模块为 `sh-framework` 提供了强大的动态数据源管理能力，具有以下特点：

1. **灵活的数据源切换**：支持运行时动态切换数据源，支持多租户、读写分离、分库分表等场景
2. **完善的线程安全**：基于 ThreadLocal 和 AOP 保证线程安全
3. **优化的性能表现**：数据源缓存、key 级锁与专用线程池异步创建机制
4. **自动化的资源管理**：定时清理过期数据源，应用关闭时优雅释放全部连接池
5. **强大的扩展能力**：工厂模式设计，支持自定义扩展

通过合理使用 `sh-dynamicdb`，开发者可以轻松构建支持复杂数据源管理需求的企业级应用，提高系统的可扩展性和可维护性。
