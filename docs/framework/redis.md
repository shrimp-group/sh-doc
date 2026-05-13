# sh-redis

基于 Spring Boot Data Redis 的 Redis 集成模块，提供完整的 Redis 操作工具类、分布式锁、分布式ID生成器、消息队列系统等高级功能。

## 🚀 核心价值

- **开箱即用**：基于 Spring Boot 3.x 自动配置机制，零配置即可使用
- **功能全面**：不仅提供基础 Redis 操作，还包含分布式锁、ID生成器、消息队列等高级功能
- **性能优化**：内置 TCP 保活配置和连接池优化，提升连接稳定性
- **异常安全**：所有操作都进行完善的异常捕获和日志记录
- **生产就绪**：经过大规模生产环境验证，稳定可靠

## 📦 依赖

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-redis</artifactId>
    <version>${sh-framework.version}</version>
</dependency>
```

**传递依赖**：
- Spring Boot 3.x
- Spring Data Redis
- Lettuce 客户端（默认）
- sh-core（基础工具类）

## ⚙️ 快速开始

### 1. 基础配置

在 `application.yml` 中配置 Redis 连接：

```yaml
spring:
  redis:
    host: localhost
    port: 6379
    password:  # 可选，无密码时留空
    database: 0
    timeout: 5s
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
```

### 2. 使用 RedisHelper（基础操作）

```java
import com.wkclz.redis.helper.RedisHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class UserService {
    
    @Autowired
    private RedisHelper redisHelper;
    
    // 保存用户信息，1小时过期
    public void cacheUser(User user) {
        String key = "user:" + user.getId();
        redisHelper.set(key, user, 1, TimeUnit.HOURS);
    }
    
    // 获取用户信息
    public User getUser(Long userId) {
        String key = "user:" + userId;
        return (User) redisHelper.get(key);
    }
}
```

## 🔧 核心组件详解

### 1. RedisHelper - Redis 操作工具类

提供完整的 Redis 数据结构操作支持：

#### String 操作
```java
// 基本操作
redisHelper.set("key", "value");
String value = (String) redisHelper.get("key");

// 带过期时间
redisHelper.set("key", "value", 30, TimeUnit.MINUTES);

// 原子操作
Long result = redisHelper.increment("counter", 1);
```

#### Hash 操作
```java
// 单个字段
redisHelper.hSet("user:1", "name", "张三");
String name = (String) redisHelper.hGet("user:1", "name");

// 多个字段
Map<String, Object> map = new HashMap<>();
map.put("name", "李四");
map.put("age", 30);
redisHelper.hMSet("user:2", map);
```

#### List 操作
```java
// 左侧插入
redisHelper.lPush("queue", "task1");
redisHelper.lPush("queue", "task2");

// 右侧弹出
String task = (String) redisHelper.rPop("queue");
```

#### Set 操作
```java
// 添加元素
redisHelper.sAdd("tags", "java", "spring", "redis");

// 获取所有元素
Set<Object> tags = redisHelper.sMembers("tags");
```

#### ZSet 操作
```java
// 添加带分数的元素
redisHelper.zAdd("rank", "user1", 100.0);
redisHelper.zAdd("rank", "user2", 200.0);

// 获取排名
List<Object> top10 = redisHelper.zRange("rank", 0, 9, true);
```

### 2. RedisLock - 分布式锁

基于 Redis 的分布式锁实现，支持可重入、自动续期、防死锁：

```java
import com.wkclz.redis.helper.RedisLock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class OrderService {
    
    @Autowired
    private RedisLock redisLock;
    
    public void processOrder(Long orderId) {
        String lockKey = "order:lock:" + orderId;
        String lockId = null;
        
        try {
            // 尝试获取锁，等待5秒，锁持有30秒
            lockId = redisLock.tryLock(lockKey, 30, TimeUnit.SECONDS, 5, TimeUnit.SECONDS);
            
            if (lockId != null) {
                // 获取锁成功，执行业务逻辑
                processOrderInternal(orderId);
            } else {
                // 获取锁失败
                throw new RuntimeException("系统繁忙，请稍后重试");
            }
        } finally {
            // 释放锁
            if (lockId != null) {
                redisLock.unlock(lockKey, lockId);
            }
        }
    }
}
```

**锁特性**：
- **原子性**：使用 Lua 脚本保证原子操作
- **可重入**：同一线程可多次获取同一把锁
- **自动续期**：支持看门狗机制自动续期
- **防死锁**：锁自动过期，避免死锁

### 3. RedisIdGenerator - 分布式ID生成器

基于时间戳 + Redis 自增序列的分布式ID生成器：

```java
import com.wkclz.redis.helper.RedisIdGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class IdGeneratorService {
    
    @Autowired
    private RedisIdGenerator redisIdGenerator;
    
    public void generateIds() {
        // 生成订单ID
        Long orderId = redisIdGenerator.generateId("order");
        
        // 生成用户ID
        Long userId = redisIdGenerator.generateId("user");
        
        // 生成带业务前缀的ID
        String bizOrderId = redisIdGenerator.generateBizId("ORDER", "order");
    }
}
```

**ID 结构**：
```
时间戳差值（41位） | 机器标识（6位） | 序列号（14位）
```

**特性**：
- **全局唯一**：基于机器标识和序列号保证全局唯一
- **趋势递增**：时间戳在前，有利于数据库索引
- **高性能**：每秒可生成 16384 个ID
- **时间回拨处理**：自动处理时钟回拨问题

### 4. RedisMessageQueue - 消息队列系统

基于 Redis 的轻量级消息队列：

```java
import com.wkclz.redis.queue.RedisMessageQueue;
import com.wkclz.redis.queue.RedisMessageQueueManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MessageQueueService {
    
    @Autowired
    private RedisMessageQueueManager queueManager;
    
    // 发送消息
    public void sendOrderMessage(OrderMessage message) {
        RedisMessageQueue<OrderMessage> queue = 
            queueManager.getQueue("order_queue", OrderMessage.class);
        queue.sendMessage(message);
    }
    
    // 消费消息（阻塞式）
    public void consumeMessages() {
        RedisMessageQueue<String> queue = 
            queueManager.getQueue("task_queue", String.class);
        
        while (true) {
            try {
                String message = queue.receiveMessage();
                if (message != null) {
                    processMessage(message);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}
```

**队列特性**：
- **多种消费模式**：阻塞、非阻塞、超时等待
- **延迟队列**：支持延迟消息投递
- **优先级队列**：支持消息优先级
- **死信队列**：消费失败的消息进入死信队列

## ⚡ 高级配置

### 1. 连接池优化配置

```yaml
spring:
  redis:
    lettuce:
      pool:
        max-active: 16      # 最大连接数
        max-idle: 8        # 最大空闲连接
        min-idle: 2        # 最小空闲连接
        max-wait: 1000ms   # 获取连接最大等待时间
```

### 2. TCP 保活配置

组件内置 TCP 保活机制，防止连接被防火墙断开：

```java
// 自动配置的 TCP 保活参数
SocketOptions socketOptions = SocketOptions.builder()
    .keepAlive(true)      // 启用 TCP KeepAlive
    .tcpNoDelay(true)    // 启用 TCP_NODELAY
    .connectTimeout(Duration.ofSeconds(10))
    .build();
```

### 3. 序列化配置

默认使用 JSON 序列化：

```java
@Configuration
public class RedisSerializerConfig {
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            LettuceConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // 使用 Jackson2JsonRedisSerializer
        Jackson2JsonRedisSerializer<Object> serializer = 
            new Jackson2JsonRedisSerializer<>(Object.class);
        
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(serializer);
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(serializer);
        
        return template;
    }
}
```

## 🎯 最佳实践

### 1. 键命名规范

```java
// 推荐使用冒号分隔的层次结构
String userKey = "user:{userId}:profile";      // 用户资料
String orderKey = "order:{orderId}:status";    // 订单状态
String cacheKey = "cache:{biz}:{id}:{type}";   // 通用缓存

// 避免
String badKey = "userProfile_" + userId;       // 不推荐
```

### 2. 缓存策略

```java
@Service
public class ProductService {
    
    @Autowired
    private RedisHelper redisHelper;
    
    // 缓存穿透防护：空值缓存
    public Product getProduct(Long productId) {
        String key = "product:" + productId;
        Product product = (Product) redisHelper.get(key);
        
        if (product == null) {
            // 查询数据库
            product = productDao.findById(productId);
            
            if (product != null) {
                // 缓存有效数据
                redisHelper.set(key, product, 30, TimeUnit.MINUTES);
            } else {
                // 缓存空值，防止缓存穿透
                redisHelper.set(key, NULL_OBJECT, 5, TimeUnit.MINUTES);
            }
        }
        
        return product == NULL_OBJECT ? null : product;
    }
}
```

### 3. 分布式锁最佳实践

```java
public class DistributedLockBestPractice {
    
    @Autowired
    private RedisLock redisLock;
    
    public void safeLockOperation() {
        String lockKey = "resource:lock";
        String lockId = null;
        
        try {
            // 设置合理的锁超时时间
            lockId = redisLock.tryLock(lockKey, 10, TimeUnit.SECONDS, 3, TimeUnit.SECONDS);
            
            if (lockId == null) {
                throw new BusinessException("获取锁失败，请重试");
            }
            
            // 执行业务逻辑
            doBusiness();
            
        } catch (Exception e) {
            log.error("业务执行异常", e);
            throw e;
        } finally {
            // 确保在 finally 块中释放锁
            if (lockId != null) {
                redisLock.unlock(lockKey, lockId);
            }
        }
    }
}
```

## 🔍 监控与告警

### 1. 健康检查

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,redis
  endpoint:
    health:
      show-details: always
```

### 2. 关键指标监控

```java
@Component
public class RedisMetrics {
    
    @Autowired
    private RedisHelper redisHelper;
    
    // 监控缓存命中率
    public double getCacheHitRate(String prefix) {
        long hits = redisHelper.increment("metrics:cache:hits:" + prefix, 1);
        long total = redisHelper.increment("metrics:cache:total:" + prefix, 1);
        
        return total > 0 ? (double) hits / total : 0.0;
    }
}
```

## 🐛 常见问题

### Q1: 连接超时或连接被重置
**原因**：防火墙或网络设备断开空闲连接
**解决**：
1. 启用 TCP KeepAlive（已默认启用）
2. 调整连接池配置，减少空闲连接
3. 配置合理的超时时间

### Q2: 序列化异常
**原因**：存储和读取时使用的序列化器不一致
**解决**：
1. 确保所有服务使用相同的序列化配置
2. 使用 JSON 序列化，避免 Java 原生序列化
3. 保持类路径一致

### Q3: 内存使用过高
**原因**：缓存数据过多或没有设置过期时间
**解决**：
1. 为所有缓存设置合理的过期时间
2. 使用 Redis 内存淘汰策略
3. 定期清理无用缓存

## 📈 性能优化建议

### 1. 管道化操作（Pipeline）

```java
public void pipelineExample() {
    redisHelper.executePipeline(pipeline -> {
        for (int i = 0; i < 100; i++) {
            pipeline.set("key:" + i, "value:" + i);
        }
        return null;
    });
}
```

### 2. 批量操作

```java
public void batchOperations() {
    // 批量设置
    Map<String, Object> batchData = new HashMap<>();
    for (int i = 0; i < 100; i++) {
        batchData.put("key:" + i, "value:" + i);
    }
    redisHelper.multiSet(batchData);
    
    // 批量获取
    List<String> keys = new ArrayList<>();
    for (int i = 0; i < 100; i++) {
        keys.add("key:" + i);
    }
    List<Object> values = redisHelper.multiGet(keys);
}
```

## 🔗 相关资源

- [Spring Data Redis 文档](https://docs.spring.io/spring-data/redis/docs/current/reference/html/)
- [Redis 命令参考](https://redis.io/commands)
- [Lettuce 客户端文档](https://lettuce.io/core/release/reference/)

## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024-01-01 | 初始版本，包含基础 Redis 操作 |
| 1.1.0 | 2024-03-15 | 新增分布式锁和ID生成器 |
| 1.2.0 | 2024-06-01 | 新增消息队列系统 |
| 1.3.0 | 2024-08-20 | 优化连接池和TCP保活配置 |

---

**提示**：本文档基于 sh-redis 最新版本编写，具体 API 可能随版本更新而变化，请参考实际代码和版本说明。