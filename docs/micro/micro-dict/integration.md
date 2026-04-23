# 功能集成

## 添加依赖

在项目的 `pom.xml` 中添加依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-dict</artifactId>
    <version>${revision}</version>
</dependency>
```

## 数据库初始化

模块启动时会自动创建所需的数据表。

## 配置文件

字典服务依赖 Redis 进行缓存同步，确保 Redis 配置正确：

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: 
      database: 0
```

## 自动配置

模块通过 Spring Boot 自动配置机制加载，无需额外配置。

## 验证集成

启动应用后，可以通过以下方式验证集成是否成功：

1. **检查缓存初始化**：查看日志中是否输出 `micro-dict: 字典更新成功`
2. **测试字典接口**：调用字典查询接口测试
3. **检查数据库**：确认数据表是否正确创建

## 快速测试

通过管理后台添加测试字典后，可以使用以下方式测试：

```java
@Autowired
private DictCache dictCache;

// 获取字典标签
String label = dictCache.get("USER_STATUS", "1");
// 返回: "正常"

// 获取字典 Map
Map<String, String> statusMap = dictCache.get("USER_STATUS");
// 返回: {"1": "正常", "2": "禁用", "3": "锁定"}
```
