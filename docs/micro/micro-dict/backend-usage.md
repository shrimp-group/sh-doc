# 后端使用指南

## 依赖注入

```java
// 字典类型服务
@Autowired
private MdmDictService mdmDictService;

// 字典项服务
@Autowired
private MdmDictItemService mdmDictItemService;

// 字典缓存
@Autowired
private DictCache dictCache;
```

## 字典类型管理

### 查询字典类型

```java
// 分页查询字典类型
Page<MdmDict> page = mdmDictService.page(new Page<>(1, 10));

// 根据编码查询字典类型
MdmDict dict = mdmDictService.getByDictType("USER_STATUS");

// 查询所有字典类型
List<MdmDict> dicts = mdmDictService.list();
```

### 保存字典类型

```java
// 创建字典类型
MdmDict dict = new MdmDict();
dict.setDictType("USER_STATUS");
dict.setDictName("用户状态");
dict.setDescription("用户状态字典");
dict.setStatus(1); // 1-启用，0-禁用
dict.setSort(1);
mdmDictService.save(dict);

// 更新字典类型
dict.setDictName("用户状态字典");
mdmDictService.updateById(dict);
```

### 删除字典类型

```java
// 根据 ID 删除
mdmDictService.removeById(1L);

// 批量删除
List<Long> ids = Arrays.asList(1L, 2L, 3L);
mdmDictService.removeByIds(ids);
```

## 字典项管理

### 查询字典项

```java
// 根据字典类型查询字典项
List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictType("USER_STATUS");

// 分页查询字典项
Page<MdmDictItem> page = mdmDictItemService.page(new Page<>(1, 10), new QueryWrapper<MdmDictItem>().eq("dict_type", "USER_STATUS"));

// 根据字典类型和键查询
MdmDictItem item = mdmDictItemService.getByDictTypeAndDictKey("USER_STATUS", "ACTIVE");
```

### 保存字典项

```java
// 创建字典项
MdmDictItem item = new MdmDictItem();
item.setDictType("USER_STATUS");
item.setDictKey("ACTIVE");
item.setDictValue("激活");
item.setDescription("用户激活状态");
item.setStatus(1);
item.setSort(1);
mdmDictItemService.save(item);

// 更新字典项
item.setDictValue("已激活");
mdmDictItemService.updateById(item);
```

### 删除字典项

```java
// 根据 ID 删除
mdmDictItemService.removeById(1L);

// 批量删除
List<Long> ids = Arrays.asList(1L, 2L, 3L);
mdmDictItemService.removeByIds(ids);

// 根据字典类型删除
mdmDictItemService.removeByDictType("USER_STATUS");
```

## 字典查询（推荐使用）

### 单字典查询

```java
// 查询单个字典类型的所有项
List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictType("USER_STATUS");

// 转换为 Map（键值对）
Map<String, String> dictMap = items.stream()
    .collect(Collectors.toMap(MdmDictItem::getDictKey, MdmDictItem::getDictValue));

// 获取字典值
String statusValue = dictMap.get("ACTIVE"); // 返回 "激活"
```

### 多字典查询

```java
// 批量查询多个字典类型
List<String> dictTypes = Arrays.asList("USER_STATUS", "ORDER_STATUS", "PAYMENT_TYPE");
List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictTypes(dictTypes);

// 按字典类型分组
Map<String, List<MdmDictItem>> dictMap = items.stream()
    .collect(Collectors.groupingBy(MdmDictItem::getDictType));

// 获取特定字典的项
List<MdmDictItem> userStatusItems = dictMap.get("USER_STATUS");
```

## 缓存管理

### 手动刷新缓存

```java
// 刷新所有字典缓存
dictCache.clearCache();

// 刷新所有字典缓存
dictCache.clearCache();
```

### 检查缓存状态

```java
// 检查缓存是否启用
boolean enabled = dictCache.isEnabled();

// 获取缓存大小
int size = dictCache.getCacheSize();

// 检查缓存是否包含特定字典
boolean contains = dictCache.containsKey("USER_STATUS");
```

## 完整使用示例

### 示例 1：用户状态管理

```java
@Service
public class UserService {
    
    @Autowired
    private MdmDictItemService mdmDictItemService;
    
    /**
     * 获取用户状态列表
     */
    public List<DictOption> getUserStatusOptions() {
        List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictType("USER_STATUS");
        return items.stream()
            .map(item -> new DictOption(item.getDictKey(), item.getDictValue()))
            .collect(Collectors.toList());
    }
    
    /**
     * 根据状态码获取状态名称
     */
    public String getStatusName(String statusCode) {
        List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictType("USER_STATUS");
        return items.stream()
            .filter(item -> item.getDictKey().equals(statusCode))
            .map(MdmDictItem::getDictValue)
            .findFirst()
            .orElse(statusCode);
    }
    
    /**
     * 批量获取状态名称
     */
    public Map<String, String> getStatusNames(List<String> statusCodes) {
        List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictType("USER_STATUS");
        Map<String, String> statusMap = items.stream()
            .collect(Collectors.toMap(MdmDictItem::getDictKey, MdmDictItem::getDictValue));
        
        return statusCodes.stream()
            .collect(Collectors.toMap(
                code -> code,
                code -> statusMap.getOrDefault(code, code)
            ));
    }
}

public class DictOption {
    private String value;
    private String label;
    
    // 构造器、getter、setter
}
```

### 示例 2：订单状态管理

```java
@Service
public class OrderService {
    
    @Autowired
    private MdmDictItemService mdmDictItemService;
    
    /**
     * 获取订单状态流转规则
     */
    public Map<String, List<String>> getOrderStatusFlow() {
        // 从字典中获取状态流转规则
        List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictType("ORDER_STATUS_FLOW");
        
        return items.stream()
            .collect(Collectors.toMap(
                MdmDictItem::getDictKey,  // 当前状态
                item -> Arrays.asList(item.getDictValue().split("\|") )  // 可流转的目标状态
            ));
    }
    
    /**
     * 验证订单状态流转是否合法
     */
    public boolean isValidStatusFlow(String currentStatus, String targetStatus) {
        Map<String, List<String>> flowMap = getOrderStatusFlow();
        List<String> allowedStatuses = flowMap.get(currentStatus);
        return allowedStatuses != null && allowedStatuses.contains(targetStatus);
    }
}
```

### 示例 3：多字典联合查询

```java
@Service
public class CommonService {
    
    @Autowired
    private MdmDictItemService mdmDictItemService;
    
    /**
     * 获取系统常用字典
     */
    public Map<String, List<DictOption>> getCommonDicts() {
        List<String> dictTypes = Arrays.asList(
            "USER_STATUS",
            "ORDER_STATUS",
            "PAYMENT_TYPE",
            "PRODUCT_CATEGORY"
        );
        
        List<MdmDictItem> items = mdmDictItemService.getDictItemsByDictTypes(dictTypes);
        
        return items.stream()
            .collect(Collectors.groupingBy(
                MdmDictItem::getDictType,
                Collectors.mapping(
                    item -> new DictOption(item.getDictKey(), item.getDictValue()),
                    Collectors.toList()
                )
            ));
    }
}
```

## 注意事项

1. **性能优化**：对于频繁使用的字典，建议在服务启动时预加载到缓存
2. **缓存一致性**：字典变更后，缓存会在 30 秒内自动刷新，无需手动操作
3. **异常处理**：字典查询失败时，应提供默认值或降级方案
4. **多租户**：在多租户环境中，注意租户编码的传递和隔离
5. **字典命名**：遵循统一的命名规范，便于维护和管理
