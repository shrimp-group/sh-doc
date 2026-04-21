# sh-redis

Redis 操作模块，提供常用的 Redis 操作工具类，基于 Spring Boot Redis Starter 实现。


## 功能特性

- 提供常用的 Redis 操作方法，包括：
  - String 类型操作
  - Hash 类型操作
  - List 类型操作
  - Set 类型操作
  - ZSet 类型操作
  - 通用操作（设置过期时间、检查键是否存在等）
- 自动配置，无需手动配置 RedisTemplate
- 支持 JSON 序列化和反序列化


## 依赖

- Spring Boot 4.0.0
- Spring Data Redis
- Jedis 客户端
- Lettuce 客户端

## 使用方法

### 1. 引入依赖

在项目的 pom.xml 文件中添加以下依赖：

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-redis</artifactId>
    <version>${sh-framework.version}</version>
</dependency>
```



### 2. 配置 Redis

在 application.properties 或 application.yml 文件中配置 Redis 连接信息：

```properties
# Redis 配置
spring.redis.host=localhost
spring.redis.port=6379
spring.redis.password=your_password
spring.redis.database=0
```



### 3. 使用 RedisUtil

注入 RedisUtil 类并使用其提供的方法：

```java
import com.wkclz.redis.util.RedisUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class UserService {

    @Autowired
    private RedisUtil redisUtil;

    public void setUser(User user) {
        // 保存用户信息到 Redis，过期时间为 1 小时
        redisUtil.set("user:" + user.getId(), user, 1, TimeUnit.HOURS);
    }

    public User getUser(Long userId) {
        // 从 Redis 获取用户信息
        return (User) redisUtil.get("user:" + userId);
    }

    public void deleteUser(Long userId) {
        // 从 Redis 删除用户信息
        redisUtil.delete("user:" + userId);
    }
}
```

## 方法说明

### String 类型操作

- `boolean set(String key, Object value)`：保存字符串
- `boolean set(String key, Object value, long timeout, TimeUnit timeUnit)`：保存字符串并设置过期时间
- `Object get(String key)`：获取字符串

### Hash 类型操作

- `boolean hSet(String key, String hashKey, Object value)`：保存哈希
- `Object hGet(String key, String hashKey)`：获取哈希值
- `Map<Object, Object> hGetAll(String key)`：获取所有哈希值

### List 类型操作

- `long lPush(String key, Object value)`：从列表左侧添加元素
- `Object rPop(String key)`：从列表右侧弹出元素
- `List<Object> lRange(String key, long start, long end)`：获取列表范围内的元素

### Set 类型操作

- `long sAdd(String key, Object... values)`：添加集合元素
- `Set<Object> sMembers(String key)`：获取集合所有元素

### ZSet 类型操作

- `boolean zAdd(String key, Object value, double score)`：添加有序集合元素
- `List<Object> zRange(String key, long start, long end, boolean isDesc)`：获取有序集合范围内的元素

### 通用操作

- `boolean delete(String key)`：删除键
- `long delete(Set<String> keys)`：批量删除键
- `boolean expire(String key, long timeout, TimeUnit unit)`：设置键的过期时间
- `long getExpire(String key, TimeUnit unit)`：获取键的剩余过期时间
- `boolean hasKey(String key)`：检查键是否存在

## 注意事项

1. RedisUtil 中所有方法都进行了异常捕获，返回 boolean 类型的方法在操作失败时返回 false，返回其他类型的方法在操作失败时返回 null。
2. 默认使用 JSON 序列化和反序列化，因此需要确保存储的对象可以被 JSON 序列化。
3. 建议为 Redis 键设置合理的命名规范，如 `业务类型:ID`，以便于管理和维护。




### 3. 使用 RedisTemplate

通过 RedisTemplate 进行数据操作：

```java
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class CacheService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    public void setValue(String key, Object value) {
        redisTemplate.opsForValue().set(key, value);
    }

    public Object getValue(String key) {
        return redisTemplate.opsForValue().get(key);
    }
}
```

### 4. 使用注解式缓存

通过注解实现声明式缓存：

```java
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Cacheable(value = "users", key = "#id")
    public User findById(Long id) {
        // 从数据库查询用户信息
        return userRepository.findById(id);
    }

    @CacheEvict(value = "users", key = "#user.id")
    public void updateUser(User user) {
        // 更新用户信息
        userRepository.update(user);
    }
}
```
