# sh-dynamicdb

> 动态数据源模块 - 支持运行时数据源切换、多租户、读写分离

## 模块概述

`sh-dynamicdb` 是 `sh-framework` 的动态数据源管理模块，基于 Spring 的 `AbstractRoutingDataSource` 扩展实现。该模块提供了在运行时动态切换数据源的能力，支持多租户、读写分离、分库分表等复杂数据源管理场景。

### 核心价值

1. **动态切换**：运行时根据业务需求动态切换数据源
2. **线程安全**：基于 ThreadLocal 实现线程隔离的数据源上下文
3. **缓存优化**：数据源连接池缓存机制，避免频繁创建销毁
4. **自动清理**：AOP 切面自动清理 ThreadLocal，防止内存泄漏
5. **灵活扩展**：工厂模式设计，支持自定义数据源创建逻辑

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

### 2. 实现数据源工厂

要实现动态数据源功能，必须实现 `DynamicDataSourceFactory` 接口：

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

### 3. 配置数据源缓存

在 `application.yml` 中配置数据源缓存时间：

```yaml
# 动态数据源配置
sh:
  dynamicdb:
    cache-second: 60  # 数据源缓存时间（秒），默认60秒

# 默认数据源配置（必须配置）
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/default_db
    username: root
    password: 123456
    druid:
      initialSize: 5
      maxActive: 20
      minIdle: 5
      maxWait: 60000
```

## 核心组件

### 1. AbstractShrimpRoutingDataSource

扩展 Spring 的 `AbstractRoutingDataSource`，提供动态数据源路由基础。

**新增功能**：
- `addDataSource()`：动态添加数据源到集合
- `getDataSource()`：通过 key 获取数据源
- 支持 JNDI 数据源查找
- 支持数据源回退机制

### 2. DynamicDataSource

动态数据源的具体实现，重写 `determineCurrentLookupKey()` 方法实现数据源切换。

**核心特性**：
- **缓存机制**：数据源创建后缓存指定时间（默认60秒）
- **异步创建**：使用 `CompletableFuture` 异步创建数据源，避免死循环
- **连接池管理**：基于 Druid 连接池，支持连接池参数配置
- **资源清理**：提供 `destroyDataSource()` 方法销毁旧数据源

### 3. DynamicDataSourceHolder

基于 ThreadLocal 的数据源持有器，管理当前线程的数据源上下文。

**核心方法**：
- `set(String key)`：设置当前线程数据源 key
- `get()`：获取当前线程数据源 key
- `clear()`：清除当前线程数据源 key

### 4. DynamicDataSourceFactory

数据源工厂接口，用于根据 key 创建数据源信息。

**核心方法**：
- `createDataSource(String key)`：根据 key 创建数据源信息

### 5. DynamicDataSourceAop

AOP 切面，在 Mapper 方法执行后自动清理 ThreadLocal。

**作用**：
- 拦截所有 Mapper 方法
- 确保每次数据库操作后清理数据源上下文
- 防止数据源泄漏和内存泄漏

### 6. 配置类

#### DynamicDataSourceAutoConfig
动态数据源自动配置类：
- 条件配置：`@ConditionalOnBean({DynamicDataSourceFactory.class})`
- 设置默认数据源
- 初始化动态数据源 Map
- 标记为 `@Primary` 数据源

#### DynamicDataSourceConfig
动态数据源配置类：
- `sh.dynamicdb.cache-second`：数据源缓存时间配置

#### DefaultDataSourceConfig
默认数据源配置类：
- 从 `spring.datasource.*` 读取配置
- 支持 Druid 连接池参数配置

## 工作原理

### 数据源切换流程

1. 业务代码调用 `DynamicDataSourceHolder.set("dataSourceKey")`
2. 执行 Mapper 方法时，AOP 切面生效
3. `DynamicDataSource.determineCurrentLookupKey()` 被调用
4. 检查缓存中是否存在该数据源
5. 如果不存在，通过 `DynamicDataSourceFactory` 创建新数据源
6. 使用 Druid 连接池创建数据源并缓存
7. 执行数据库操作
8. AOP 切面清理 ThreadLocal

### 数据源创建流程

1. 通过 `DynamicDataSourceFactory.createDataSource(key)` 获取数据源信息
2. 使用 `DefaultDataSourceConfig` 配置 Druid 连接池参数
3. 创建 `DruidDataSource` 实例
4. 添加到 `AbstractShrimpRoutingDataSource` 的数据源 Map 中
5. 记录创建时间用于缓存管理

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
    
    // 写操作使用主库
    public Order createOrder(Order order) {
        // 默认使用主库（不设置数据源）
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
            info.setDriverClassName(config.getDriverClassName());
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

### 1. 自定义数据源缓存时间

```yaml
sh:
  dynamicdb:
    cache-second: 300  # 缓存5分钟，适合数据源不经常变化的场景
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
      # 连接有效性检查SQL
      validationQuery: SELECT 1
      # 空闲时检查连接有效性
      testWhileIdle: true
      # 配置间隔多久进行一次检测（毫秒）
      timeBetweenEvictionRunsMillis: 60000
      # 配置监控统计拦截的filters
      filters: stat,wall,slf4j
```

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

- **及时清理**：使用 try-finally 确保 ThreadLocal 被清理
- **避免嵌套**：不要在同一个方法中多次切换数据源
- **明确作用域**：数据源切换应尽量在最小作用域内完成
- **统一管理**：在 Service 层统一管理数据源切换逻辑

### 2. 连接池管理

- **合理配置**：根据业务量配置连接池参数
- **监控告警**：监控连接池使用情况，设置告警阈值
- **定期检查**：定期检查闲置连接，及时释放资源
- **连接预热**：对常用数据源进行连接预热

### 3. 性能优化

- **缓存策略**：根据数据源变化频率调整缓存时间
- **连接复用**：合理设置连接池参数，提高连接复用率
- **异步创建**：利用异步机制创建数据源，避免阻塞
- **懒加载**：数据源按需创建，减少启动时间

### 4. 错误处理

- **降级策略**：数据源创建失败时提供降级方案
- **重试机制**：网络波动时实现数据源创建重试
- **日志记录**：详细记录数据源创建和销毁日志
- **监控告警**：设置数据源健康状态监控和告警

## 常见问题解答

### Q1: 数据源切换不生效怎么办？

**A**: 检查以下问题：
1. 确保 `DynamicDataSourceFactory` 实现类已添加 `@Component` 注解
2. 确认 `DynamicDataSourceHolder.set()` 在 Mapper 方法调用之前执行
3. 检查数据源 key 是否在工厂中有对应的实现
4. 查看日志确认数据源创建过程
5. 确认 `sh-dynamicdb` 依赖已正确添加

### Q2: 如何监控数据源使用情况？

**A**: 可以通过以下方式监控：
1. **Druid 监控**：启用 Druid 监控统计功能，访问 `/druid` 查看
2. **自定义监控**：扩展 `AbstractShrimpRoutingDataSource` 添加监控逻辑
3. **日志分析**：通过日志分析数据源创建和销毁情况
4. **JMX 监控**：通过 JMX 监控连接池状态
5. **Spring Boot Actuator**：集成 Actuator 监控端点

### Q3: 数据源缓存时间设置多长合适？

**A**: 缓存时间设置建议：
1. **开发环境**：30-60秒，便于调试和快速响应配置变化
2. **测试环境**：60-120秒，平衡性能和稳定性
3. **生产环境**：300-600秒，提高性能，减少连接创建开销
4. **动态环境**：如果数据源配置经常变化，可设置为30秒以下
5. **稳定环境**：数据源配置基本不变，可设置为10分钟以上

### Q4: 如何实现数据源健康检查？

**A**: 实现数据源健康检查的几种方式：
1. **定时任务检查**：定时检查所有数据源连接是否正常
2. **首次使用检查**：在数据源首次使用时进行检查
3. **连接池配置**：配置 Druid 的 `testWhileIdle` 和 `validationQuery`
4. **自定义健康端点**：实现 Spring Boot Actuator 健康端点
5. **心跳检测**：定期执行简单查询检测数据源可用性

### Q5: 如何处理数据源连接泄漏？

**A**: 防止连接泄漏的措施：
1. **AOP 保证清理**：依赖 `DynamicDataSourceAop` 自动清理 ThreadLocal
2. **try-finally 块**：在业务代码中使用 try-finally 手动清理
3. **连接池监控**：启用 Druid 的连接泄漏检测（`removeAbandoned`）
4. **定期检查**：定期检查 ThreadLocal 是否被正确清理
5. **资源监控**：监控数据库连接数，及时发现异常

### Q6: 支持哪些数据库类型？

**A**: `sh-dynamicdb` 支持所有 JDBC 兼容的数据库：
1. **MySQL**：默认支持，使用 `com.mysql.cj.jdbc.Driver`
2. **PostgreSQL**：需要添加相应驱动依赖
3. **Oracle**：需要添加相应驱动依赖
4. **SQL Server**：需要添加相应驱动依赖
5. **其他数据库**：只要提供正确的 JDBC 驱动和 URL 即可

## 扩展开发

### 1. 自定义数据源选择策略

```java
public class CustomDynamicDataSource extends DynamicDataSource {
    
    @Override
    protected Object determineCurrentLookupKey() {
        // 自定义数据源选择逻辑
        String key = DynamicDataSourceHolder.get();
        
        if (key == null) {
            // 根据当前操作类型自动选择数据源
            if (isReadOperation()) {
                return "read_slave1"; // 自动选择读库
            } else {
                return null; // 使用默认数据源（主库）
            }
        }
        
        // 调用父类逻辑
        return super.determineCurrentLookupKey();
    }
    
    private boolean isReadOperation() {
        // 判断当前是否为读操作
        // 可以通过解析当前执行的SQL或方法名来判断
        // 例如：方法名包含"get"、"find"、"select"、"query"等
        StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
        for (StackTraceElement element : stackTrace) {
            String methodName = element.getMethodName().toLowerCase();
            if (methodName.contains("get") || methodName.contains("find") || 
                methodName.contains("select") || methodName.contains("query")) {
                return true;
            }
        }
        return false;
    }
}
```

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
                    (int)((double)activeCount / maxActive * 100));
                
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

### 3. 动态数据源配置管理

```java
@Service
public class DynamicDataSourceManager {
    
    @Autowired
    private DynamicDataSource dynamicDataSource;
    
    /**
     * 动态添加数据源
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
     * 动态移除数据源
     */
    public void removeDataSource(String key) {
        dynamicDataSource.destroyDataSource(key);
        log.info("动态移除数据源成功: {}", key);
    }
}
```

## 总结

`sh-dynamicdb` 模块为 `sh-framework` 提供了强大的动态数据源管理能力，具有以下特点：

1. **灵活的数据源切换**：支持运行时动态切换数据源
2. **完善的线程安全**：基于 ThreadLocal 和 AOP 保证线程安全
3. **优化的性能表现**：数据源缓存和异步创建机制
4. **强大的扩展能力**：工厂模式设计，支持自定义扩展
5. **丰富的应用场景**：支持多租户、读写分离、分库分表等复杂场景

通过合理使用 `sh-dynamicdb`，开发者可以轻松构建支持复杂数据源管理需求的企业级应用，提高系统的可扩展性和可维护性。