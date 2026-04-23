# 后端使用指南

## 字典查询

### 获取字典标签

根据字典类型和字典值获取标签：

```java
// 获取单个字典标签
String label = dictCache.get("USER_STATUS", "1");
// 返回: "正常"

// 字典值为空时返回 null
String label = dictCache.get("USER_STATUS", null);
// 返回: null

// 字典类型不存在时返回 null
String label = dictCache.get("NOT_EXIST", "1");
// 返回: null
```

### 获取字典 Map

获取某个字典类型的所有键值对：

```java
// 获取字典 Map
Map<String, String> statusMap = dictCache.get("USER_STATUS");
// 返回: {"1": "正常", "2": "禁用", "3": "锁定"}

// 字典类型为空时返回空 Map
Map<String, String> emptyMap = dictCache.get(null);
// 返回: {}
```

## 缓存管理

缓存会在以下情况自动刷新：

1. **字典变更时**：创建、更新、删除字典后自动刷新
2. **定时检查**：定时检查 Redis 中的变更标记
3. **服务启动时**：服务启动时自动加载缓存

## 完整使用示例

### 用户状态字典使用

```java
@Service
public class UserService {
    
    @Autowired
    private DictCache dictCache;
    @Autowired
    private UserMapper userMapper;
    
    /**
     * 获取用户信息（包含状态标签）
     */
    public UserVo getUserInfo(Long userId) {
        User user = userMapper.selectById(userId);
        UserVo vo = new UserVo();
        BeanUtils.copyProperties(user, vo);
        
        // 获取状态标签
        String statusLabel = dictCache.get("USER_STATUS", user.getStatus());
        vo.setStatusLabel(statusLabel);
        
        return vo;
    }
    
    /**
     * 批量获取用户信息
     */
    public List<UserVo> listUserInfo() {
        List<User> users = userMapper.selectList();
        
        // 获取状态字典 Map
        Map<String, String> statusMap = dictCache.get("USER_STATUS");
        
        return users.stream()
            .map(user -> {
                UserVo vo = new UserVo();
                BeanUtils.copyProperties(user, vo);
                vo.setStatusLabel(statusMap.get(user.getStatus()));
                return vo;
            })
            .collect(Collectors.toList());
    }
}
```

### 订单状态字典使用

```java
@Service
public class OrderService {
    
    @Autowired
    private DictCache dictCache;
    
    /**
     * 获取订单状态选项
     */
    public List<DictOption> getOrderStatusOptions() {
        Map<String, String> statusMap = dictCache.get("ORDER_STATUS");
        return statusMap.entrySet().stream()
            .map(e -> new DictOption(e.getKey(), e.getValue()))
            .collect(Collectors.toList());
    }
}
```
