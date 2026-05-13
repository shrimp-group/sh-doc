# 高级配置

## 缓存配置

### 缓存参数

| 配置项 | 是否必填 | 默认值 | 可选值 | 说明 |
|--------|----------|--------|--------|------|
| `shrimp.dict.cache.enabled` | 否 | true | true/false | 是否启用本地缓存 |
| `shrimp.dict.cache.refresh-interval` | 否 | 30 | 正整数 | 缓存刷新间隔（秒） |
| `shrimp.dict.cache.max-dicts` | 否 | 1000 | 正整数 | 最大缓存字典数量 |
| `shrimp.dict.cache.expire-time` | 否 | 3600 | 正整数 | 缓存过期时间（秒） |

### 配置示例

```yaml
shrimp:
  dict:
    cache:
      enabled: true
      refresh-interval: 30
      max-dicts: 1000
      expire-time: 3600
```

## 性能优化

### 缓存策略

1. **预加载**：服务启动时预加载常用字典
2. **批量查询**：使用多字典查询接口减少请求次数
3. **缓存命中率**：监控缓存命中率，优化缓存策略
4. **异步刷新**：字典变更时异步刷新缓存

### 预加载配置

```java
@Component
public class DictPreloader implements ApplicationRunner {

    @Autowired
    private MdmDictItemService mdmDictItemService;

    @Override
    public void run(ApplicationArguments args) {
        // 预加载常用字典
        List<String> commonDictTypes = Arrays.asList(
            "USER_STATUS",
            "ORDER_STATUS",
            "PAYMENT_TYPE",
            "PRODUCT_CATEGORY"
        );

        for (String dictType : commonDictTypes) {
            mdmDictItemService.getDictItemsByDictType(dictType);
        }

        System.out.println("字典预加载完成");
    }
}
```

## 字典管理最佳实践

### 命名规范

- **字典类型**：使用大写字母和下划线，如 `USER_STATUS`
- **字典项**：使用有意义的编码，如 `ACTIVE`、`INACTIVE`

### 字典设计原则

1. **单一职责**：每个字典类型只管理一个业务领域
2. **命名清晰**：字典类型和项的命名要清晰易懂
3. **版本管理**：字典变更要进行版本管理
4. **文档化**：重要字典要进行文档说明

### 常见字典设计

| 字典类型 | 用途 | 示例字典项 |
|----------|------|------------|
| USER_STATUS | 用户状态 | ACTIVE, INACTIVE, LOCKED |
| ORDER_STATUS | 订单状态 | PENDING, PAID, SHIPPED, DELIVERED |
| PAYMENT_TYPE | 支付方式 | ALIPAY, WECHAT, CREDIT_CARD |
| PRODUCT_CATEGORY | 产品分类 | ELECTRONICS, CLOTHING, FOOD |
| GENDER | 性别 | MALE, FEMALE, OTHER |
| YES_NO | 是/否 | YES, NO |

## 监控与日志

### 缓存监控

```java
@RestController
@RequestMapping("/monitor/dict")
public class DictMonitorController {

    @Autowired
    private DictCache dictCache;

    @GetMapping("/cache/status")
    public R cacheStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", dictCache.isEnabled());
        status.put("cacheSize", dictCache.getCacheSize());
        status.put("lastRefreshTime", dictCache.getLastRefreshTime());
        return R.ok(status);
    }

    @PostMapping("/cache/refresh")
    public R refreshCache() {
        dictCache.clearCache();
        return R.ok("缓存刷新成功");
    }
}
```

### 日志配置

在 `application.yml` 中配置字典服务日志：

```yaml
logging:
  level:
    com.wkclz.micro.dict: info
    com.wkclz.micro.dict.cache: debug
```

## 常见问题

### Q: 字典变更后多久生效？

A: 字典变更后，缓存会在 30 秒内自动刷新，无需手动操作。

### Q: 如何处理字典缓存与数据库不一致的问题？

A: 可以通过以下方式解决：
1. 手动调用 `dictCache.clearCache()` 刷新缓存
2. 等待缓存自动过期（默认 3600 秒）
3. 重启服务

### Q: 如何优化大量字典的查询性能？

A: 建议：
1. 使用批量查询接口 `/common/dicts/list`
2. 合理设置缓存参数
3. 预加载常用字典
4. 监控缓存命中率

### Q: 字典服务支持集群部署吗？

A: 支持。通过 Redis 分布式通知机制，确保集群中所有节点的缓存一致性。

## 扩展功能

### 自定义字典加载器

```java
public interface DictLoader {
    List<MdmDictItem> loadDict(String dictType);
}

@Component
public class DatabaseDictLoader implements DictLoader {

    @Autowired
    private MdmDictItemService mdmDictItemService;

    @Override
    public List<MdmDictItem> loadDict(String dictType) {
        return mdmDictItemService.getDictItemsByDictType(dictType);
    }
}

// 可以扩展其他加载器，如从配置文件、远程服务等加载字典
```

### 字典导出导入

```java
@Service
public class DictExportService {

    @Autowired
    private MdmDictService mdmDictService;
    @Autowired
    private MdmDictItemService mdmDictItemService;

    // 导出字典为 JSON
    public String exportDict(String dictType) {
        MdmDict dict = mdmDictService.getByDictType(dictType);
        List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictType(dictType);

        Map<String, Object> exportData = new HashMap<>();
        exportData.put("dict", dict);
        exportData.put("items", items);

        return JsonUtil.toJson(exportData);
    }

    // 导入字典
    public void importDict(String json) {
        Map<String, Object> importData = JsonUtil.toMap(json);
        MdmDict dict = JsonUtil.toBean(JsonUtil.toJson(importData.get("dict")), MdmDict.class);
        List<MdmDictItem> items = JsonUtil.toList(JsonUtil.toJson(importData.get("items")), MdmDictItem.class);

        // 保存字典类型
        mdmDictService.saveOrUpdate(dict);

        // 保存字典项
        for (MdmDictItem item : items) {
            mdmDictItemService.saveOrUpdate(item);
        }
    }
}
```
