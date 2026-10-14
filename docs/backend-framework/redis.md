# sh-redis

基于 Spring Boot Data Redis 的 Redis 集成模块，提供 Redis 操作工具类、分布式锁、分布式 ID 生成器、时间戳序列生成器、消息队列等能力。

## 🚀 核心价值

- **开箱即用**：基于 Spring Boot 自动配置（`@AutoConfiguration` + 组件扫描），引入依赖即可使用
- **功能全面**：基础数据结构操作、分布式锁（含看门狗自动续期）、分布式 ID 生成、时间戳序列生成、消息队列
- **连接稳定**：内置 TCP 保活（keepAlive / tcpNoDelay）与命令超时配置
- **安全可靠**：序列化采用 AutoType 白名单机制，防止反序列化注入；锁的释放与续期由 Lua 脚本保证原子性
- **异常兜底**：Redis 操作类方法均捕获异常并降级返回，不向外抛出运行时异常；ID 生成在 Redis 不可用时降级本地生成

## 📦 依赖

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-redis</artifactId>
    <version>${revision}</version>
</dependency>
```

**传递依赖**：
- sh-core（基础工具类）
- spring-boot-starter-data-redis（Lettuce 客户端）

## ⚙️ 快速开始

### 1. 基础配置

在 `application.yml` 中配置 Redis 连接：

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password:          # 可选，无密码时留空
      database: 0
      timeout: 10s       # 建议不小于组件内置的 commandTimeout(5s)

# AutoType 白名单扩展（可选）：配置业务自定义类的包路径前缀
sh:
  redis:
    auto-type-whitelist:
      - com.example.business
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

提供完整的 Redis 数据结构操作支持，绝大多数方法内部捕获异常并降级返回（`false` / `null` / `0`）。

#### 对象存储
```java
// 保存对象（不带过期时间）
redisHelper.set("key", value);

// 保存对象并设置过期时间
redisHelper.set("key", value, 30, TimeUnit.MINUTES);

// 仅键不存在时保存（SETNX + EXPIRE 原子操作），返回是否成功
boolean ok = redisHelper.setIfAbsent("key", value, 30, TimeUnit.MINUTES);

// 获取对象
Object value = redisHelper.get("key");
```

#### 字符串 / 数字存储
```java
// 纯字符串（使用 StringRedisTemplate，不经过 JSON 序列化）
redisHelper.setString("key", "value");
redisHelper.setString("key", "value", 30, TimeUnit.MINUTES);
String value = redisHelper.getString("key");

// 数字
redisHelper.setNumber("key", 100);
redisHelper.setNumber("key", 100, 30, TimeUnit.MINUTES);

// 自增
Long count = redisHelper.increment("counter");

// 自增并在首次创建（结果为 1）时设置过期时间
Long count2 = redisHelper.increment("counter", 30, TimeUnit.SECONDS);
```

#### 删除
```java
// 删除单个键
redisHelper.delete("key");

// 批量删除，返回删除数量
Set<String> keys = new HashSet<>(Arrays.asList("key1", "key2"));
long deleted = redisHelper.delete(keys);
```

#### Hash 操作
```java
// 设置单个字段
redisHelper.hSet("user:1", "name", "张三");

// 获取单个字段 / 全部字段
Object name = redisHelper.hGet("user:1", "name");
Map<Object, Object> all = redisHelper.hGetAll("user:1");
```

#### List 操作
```java
// 左侧入队
redisHelper.lPush("queue", "task1");

// 右侧弹出（队列消费）
Object task = redisHelper.rPop("queue");

// 左侧弹出（非阻塞）
Object task2 = redisHelper.lPop("queue");

// 左侧阻塞弹出，超时返回 null
Object task3 = redisHelper.bLPop("queue", 5, TimeUnit.SECONDS);

// 队列长度 / 范围查询
long size = redisHelper.lLen("queue");
List<Object> range = redisHelper.lRange("queue", 0, -1);
```

#### Set 操作
```java
// 添加元素（可多个）
redisHelper.sAdd("tags", "java", "spring", "redis");

// 获取所有元素
Set<Object> tags = redisHelper.sMembers("tags");
```

#### ZSet 操作
```java
// 添加带分数的元素
redisHelper.zAdd("rank", "user1", 100.0);

// 范围查询，isDesc 为 true 时降序（reverseRange）
Set<Object> top = redisHelper.zRange("rank", 0, 9, true);
```

#### 通用操作
```java
// 设置过期时间
redisHelper.expire("key", 30, TimeUnit.SECONDS);

// 查询剩余过期时间
long ttl = redisHelper.getExpire("key", TimeUnit.SECONDS);

// 判断键是否存在
boolean exists = redisHelper.hasKey("key");
```

> 注意：模块不提供发布/订阅（pub/sub）API。

### 2. RedisLock - 分布式锁

基于 Redis 的分布式锁实现，支持看门狗自动续期，释放/续期由 Lua 脚本保证原子性。

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
        // 尝试获取锁（锁持有 30 秒），返回 requestId，失败返回 null
        String requestId = redisLock.tryLock(lockKey, 30, TimeUnit.SECONDS);
        if (requestId == null) {
            throw new RuntimeException("系统繁忙，请稍后重试");
        }
        try {
            // 执行业务逻辑
            processOrderInternal(orderId);
        } finally {
            // 释放锁（Lua 脚本校验 requestId 后删除）
            redisLock.releaseLock(lockKey, requestId);
        }
    }
}
```

**带看门狗自动续期**（业务执行时间可能超过锁过期时间时使用）：

```java
import com.wkclz.redis.helper.LockHolder;

LockHolder holder = redisLock.tryLockWithWatchdog(lockKey, 30, TimeUnit.SECONDS);
if (holder == null) {
    throw new RuntimeException("系统繁忙，请稍后重试");
}
try {
    doBusiness();
} finally {
    // 释放锁（同时停止看门狗）
    redisLock.releaseLock(holder);
}
```

**获取失败后等待重试**（第一次尝试失败后，按重试次数与间隔反复尝试）：

```java
// 锁持有 30 秒；失败后重试 3 次，每次间隔 1 秒
String requestId = redisLock.tryLockWithRetry(lockKey, 30, TimeUnit.SECONDS, 3, 1, TimeUnit.SECONDS);
```

**锁特性**：
- **原子获取**：基于 SETNX（`setIfAbsent`），带过期时间
- **原子释放**：Lua 脚本校验 `requestId` 匹配后才删除，避免误删他人持有的锁
- **原子续期**：Lua 脚本校验 `requestId` 匹配后才续期（EXPIRE）
- **非可重入**：同一线程重复获取同一把锁需要先释放
- **看门狗续期**：仅在 `tryLockWithWatchdog` 时启用；续期间隔为锁时间的 1/3，由单守护线程调度器（`redis-lock-watchdog`）执行；续期失败自动停止
- **防死锁**：锁带过期时间，业务异常或宕机时自动释放

### 3. RedisIdGenerator - 分布式 ID 生成器

基于相对时间戳 + Redis 自增序列的分布式 ID 生成器，最终以 base62 编码输出。

```java
import com.wkclz.redis.helper.RedisIdGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class IdGeneratorService {

    @Autowired
    private RedisIdGenerator redisIdGenerator;

    public void generateIds() {
        // 按业务类型生成 ID（businessType 为空时默认 "default"）
        String orderId = redisIdGenerator.generateIdWithType("order");

        // 生成带业务前缀的 ID（prefix 为空时抛异常）
        String bizOrderId = redisIdGenerator.generateIdWithPrefix("ORDER");
    }
}
```

**ID 结构**：
```
相对时间戳（基于 2024-01-01 00:00:00，最高 44 位） | 机器标识（6 位） | 序列号（14 位）
整体 base62 编码，缩短长度
```

**特性**：
- **全局唯一**：时间戳 + 机器标识 + Redis 自增序列组合保证唯一
- **趋势递增**：时间戳在前，有利于数据库索引
- **机器标识**：取本机 IP 后两字节映射（6 位，最大 64 台机器），无法获取 IP 时使用安全随机数
- **Redis 键**：`id:generator:{businessType}`，每次自增后设置 5 秒过期
- **时间回拨处理**：检测到时钟回拨时沿用上次时间戳，避免 ID 回退
- **降级策略**：Redis 不可用时降级为本地生成（时间戳 + 本地序列），保证可用性

### 4. TimestampSequenceGenerator - 时间戳序列生成器

生成 `yyMMddHHmmss + 4位序列` 格式（16 位）的唯一 ID。

```java
import com.wkclz.redis.helper.TimestampSequenceGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SequenceService {

    @Autowired
    private TimestampSequenceGenerator timestampSequenceGenerator;

    public void generateIds() {
        // 默认业务类型
        String id = timestampSequenceGenerator.generate();

        // 指定业务类型（不同业务类型序列独立）
        String orderId = timestampSequenceGenerator.generate("order");
    }
}
```

**特性**：
- **格式**：`yyMMddHHmmss` + 4 位补零序列，共 16 位
- **Redis 键**：`id:ts:seq:{businessType}:{epochSecond}`，按秒分区，键 5 秒过期
- **自适应步长**：根据上一秒实际生成量动态调整自增步长（INCRBY），降低序列竞争
- **防阻塞**：序列接近耗尽（剩余空间不足一个步长）时主动等待下一秒再生成
- **降级策略**：Redis 不可用时使用本地序列降级

### 5. RedisMessageQueue - 消息队列

基于 Redis List 的轻量级消息队列，支持手动消费与订阅消费两种模式。

```java
import com.wkclz.redis.queue.RedisMessageQueue;
import com.wkclz.redis.queue.RedisMessageQueueManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class MessageQueueService {

    @Autowired
    private RedisMessageQueueManager queueManager;

    // 发送消息
    public void sendOrderMessage(OrderMessage message) {
        RedisMessageQueue<OrderMessage> queue =
            queueManager.getQueue("order_queue", OrderMessage.class);
        queue.sendMessage(message);
        // 或直接发送
        queueManager.sendMessage("order_queue", message);
    }

    // 消费消息（非阻塞）
    public void consumeNonBlocking() {
        RedisMessageQueue<OrderMessage> queue =
            queueManager.getQueue("order_queue", OrderMessage.class);
        OrderMessage message = queue.receiveMessageNonBlocking();
        if (message != null) {
            processMessage(message);
        }
    }

    // 消费消息（阻塞，无消息时一直等待）
    public void consumeBlocking() throws InterruptedException {
        RedisMessageQueue<OrderMessage> queue =
            queueManager.getQueue("order_queue", OrderMessage.class);
        OrderMessage message = queue.receiveMessage();
        if (message != null) {
            processMessage(message);
        }
    }

    // 消费消息（阻塞带超时，超时返回 null）
    public void consumeWithTimeout() throws InterruptedException {
        RedisMessageQueue<OrderMessage> queue =
            queueManager.getQueue("order_queue", OrderMessage.class);
        OrderMessage message = queue.receiveMessage(5, TimeUnit.SECONDS);
        if (message != null) {
            processMessage(message);
        }
    }

    // 队列长度 / 清空队列
    public void queueStats() {
        RedisMessageQueue<OrderMessage> queue =
            queueManager.getQueue("order_queue", OrderMessage.class);
        long count = queue.getMessageCount();
        queue.clear();
    }
}
```

**订阅消费模式**（由组件线程池托管消费线程）：

```java
import com.wkclz.redis.queue.MessageListener;

@PostConstruct
public void init() {
    // 订阅订单队列，收到消息后回调 onMessage
    boolean ok = queueManager.subscribe("order_queue", new MessageListener<OrderMessage>() {
        @Override
        public void onMessage(OrderMessage message) {
            processOrder(message);
        }

        @Override
        public Class<OrderMessage> getMessageType() {
            return OrderMessage.class;
        }
    });

    // 取消订阅（消费线程随之退出）
    queueManager.unsubscribe("order_queue");
}
```

**队列特性**：
- **基于 List 实现**：消息经 `lPush` 入队、`bLPop`/`lPop` 出队，队列 Redis 键为 `queue:{queueName}`
- **多种消费方式**：阻塞（无限等待）、阻塞带超时、非阻塞
- **订阅消费**：`subscribe(queueName, listener)` 后由组件线程池阻塞消费并回调 `onMessage`；同一队列重复订阅返回 `false`
- **消费线程池**：核心线程 4 / 最大线程 16 / 空闲 60 秒回收 / 队列容量 1024 / CallerRunsPolicy 拒绝策略
- 不提供延迟队列、优先级队列、死信队列能力

## ⚡ 高级配置

### 1. 连接工厂（内置 TCP 保活）

组件通过 `RedisKeepAliveConfig` 提供自定义 `LettuceConnectionFactory`，覆盖 Spring Boot 默认工厂：

- **Socket 层**：keepAlive(true)、tcpNoDelay(true)、connectTimeout(10s)
- **命令超时**：commandTimeout(5s)，需不大于 `spring.data.redis.timeout` 配置
- **密码处理**：密码为空字符串时不设置，避免空密码认证失败
- 连接地址取自 `spring.data.redis.host / port / password / database`

### 2. 序列化与 AutoType 白名单

`RedisTemplate` 序列化规则（`RedisTemplateConfig`）：

- key / hashKey：`StringRedisSerializer`
- value / hashValue：`Fastjson2JsonRedisSerializer`

`Fastjson2JsonRedisSerializer` 基于 fastjson2，写入时携带 `WriteClassName`，读取时通过 `autoTypeFilter` 白名单过滤，仅允许白名单内的类通过 AutoType 实例化，防止恶意 `@type` 注入：

- **默认白名单**：`com.wkclz.`、`java.util.`、`java.lang.`、`java.time.`
- **扩展白名单**：通过 `sh.redis.auto-type-whitelist` 配置业务自定义类的包路径前缀

### 3. 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `spring.data.redis.host` | String | `localhost` | Redis 主机 |
| `spring.data.redis.port` | int | `6379` | Redis 端口 |
| `spring.data.redis.password` | String | 空 | 密码，为空时不设置 |
| `spring.data.redis.database` | int | `0` | 库索引 |
| `sh.redis.auto-type-whitelist` | List\<String\> | 空 | AutoType 白名单扩展（包路径前缀） |

### 4. RedisMessageListenerContainer

组件已注册 `RedisMessageListenerContainer` Bean（`RedisConfig`），可供扩展监听器使用。

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

        // 短任务：tryLock 即可（业务执行时间需小于锁过期时间）
        String requestId = redisLock.tryLock(lockKey, 10, TimeUnit.SECONDS);

        // 长任务：使用 tryLockWithWatchdog 自动续期
        // LockHolder holder = redisLock.tryLockWithWatchdog(lockKey, 10, TimeUnit.SECONDS);

        if (requestId == null) {
            throw new BusinessException("获取锁失败，请重试");
        }

        try {
            // 执行业务逻辑
            doBusiness();
        } finally {
            // 确保在 finally 块中释放锁
            redisLock.releaseLock(lockKey, requestId);
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
        include: health,metrics
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

    // 监控调用计数（基于自增）
    public long recordCall(String name) {
        return redisHelper.increment("metrics:call:" + name);
    }
}
```

## 🐛 常见问题

### Q1: 连接超时或连接被重置
**原因**：防火墙或网络设备断开空闲连接
**解决**：
1. 组件已默认启用 TCP KeepAlive 与 tcpNoDelay
2. 检查网络设备空闲连接超时策略
3. 确认 `spring.data.redis.timeout` 不小于内置 commandTimeout(5s)

### Q2: 反序列化异常
**原因**：读取时无法通过 AutoType 白名单实例化业务类，或存储与读取的序列化配置不一致
**解决**：
1. 将业务自定义类的包路径前缀加入 `sh.redis.auto-type-whitelist`
2. 确保所有服务使用相同的序列化配置
3. 修改类名/字段后注意旧缓存数据的兼容

### Q3: 内存使用过高
**原因**：缓存数据过多或没有设置过期时间
**解决**：
1. 为所有缓存设置合理的过期时间
2. 使用 Redis 内存淘汰策略
3. 定期清理无用缓存（`delete(key)` / `delete(keys)`）

## 🔗 相关资源

- [Spring Data Redis 文档](https://docs.spring.io/spring-data/redis/docs/current/reference/html/)
- [Redis 命令参考](https://redis.io/commands)
- [Lettuce 客户端文档](https://lettuce.io/core/release/reference/)
- [fastjson2 文档](https://github.com/alibaba/fastjson2)

## 📝 版本历史

| 版本 | 说明 |
|------|------|
| 当前版本 | 包含 RedisHelper、RedisLock（看门狗续期）、RedisIdGenerator、TimestampSequenceGenerator、RedisMessageQueue/Manager、Fastjson2 安全序列化、TCP 保活配置 |

---

**提示**：本文档基于 sh-redis 最新源码编写，具体 API 以实际代码为准。
