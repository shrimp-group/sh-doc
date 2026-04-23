# 高级配置

## 字典分类管理

字典分类（dictCtg）用于对字典类型进行分组管理，便于维护和查找。

### 常见分类

| 分类 | 说明 | 示例字典类型 |
|------|------|-------------|
| 系统 | 系统基础字典 | USER_STATUS, GENDER, NATION |
| 业务 | 业务相关字典 | ORDER_STATUS, PAYMENT_TYPE |
| 配置 | 系统配置字典 | SWITCH_CONFIG, PARAM_TYPE |

### 分类规范

1. 分类名称简洁明了
2. 同类字典使用相同分类
3. 避免分类过多，建议控制在 10 个以内

## 字典项 Element 类型

elType 字段用于前端组件样式配置，常见值：

| elType | Element Plus 标签类型 | 适用场景 |
|--------|----------------------|----------|
| success | 绿色 | 正常、成功、启用 |
| danger | 红色 | 禁用、失败、异常 |
| warning | 橙色 | 警告、待处理 |
| info | 灰色 | 普通、默认 |
| primary | 蓝色 | 主要、重要 |

### 使用示例

```vue
<el-tag :type="dictItem.elType">
  {{ dictItem.dictLabel }}
</el-tag>
```

## 多租户支持

字典服务支持多租户场景，每个租户可以有独立的字典数据。

### 使用方式

```java
// 获取字典时自动根据当前租户隔离
String label = dictCache.get("USER_STATUS", "1");
// 系统会根据当前登录用户的租户编码获取对应字典
```

## 字典数据迁移

### 环境迁移步骤

1. **导出字典**：在源环境调用 Copy 接口
2. **保存数据**：将返回的 JSON 数据保存
3. **导入字典**：在目标环境调用 Paste 接口

### 迁移脚本示例

```bash
# 导出字典
curl "http://dev-api/micro-dict/dict/copy?dictTypes=USER_STATUS,ORDER_STATUS" > dict_backup.json

# 导入字典
curl -X POST "http://test-api/micro-dict/dict/paste" \
  -H "Content-Type: application/json" \
  -d @dict_backup.json
```

## 性能优化

### 缓存预热

服务启动时自动加载字典缓存，无需手动预热。

### 批量查询

推荐使用批量接口获取多个字典：

```http
GET /micro-dict/common/dicts/list?dictType=USER_STATUS,ORDER_STATUS,GENDER
```

减少 HTTP 请求次数，提高性能。

### 前端缓存

前端应实现字典缓存，避免重复请求：

```typescript
const dictCache = new Map<string, DictItem[]>()

export async function loadDict(dictType: string) {
  if (dictCache.has(dictType)) {
    return dictCache.get(dictType)!
  }
  // ... 加载并缓存
}
```

## 注意事项

1. **字典类型唯一**：dictType 在同一租户下必须唯一
2. **删除顺序**：删除字典类型前需先删除关联的字典项
3. **缓存同步**：字典变更后会自动刷新缓存，无需手动操作
4. **命名规范**：建议使用大写下划线格式命名字典类型

## 常见问题

### Q: 字典修改后前端没有更新？

A: 检查以下几点：
1. 后端缓存是否刷新（查看日志）
2. 前端是否有缓存
3. Redis 连接是否正常

### Q: 如何批量导入字典？

A: 使用 Copy/Paste 接口：
1. 调用 Copy 接口导出字典
2. 调用 Paste 接口导入字典

### Q: 字典值支持什么类型？

A: 字典值（dictValue）存储为字符串类型，可以存储：
- 数字字符串："1", "2", "3"
- 字母字符串："MALE", "FEMALE"
- 组合字符串："TYPE_A", "TYPE_B"

### Q: 如何实现字典排序？

A: 通过 sort 字段控制排序，sort 值越小越靠前。

### Q: 如何禁用某个字典项？

A: 设置 enableFlag = 0 即可禁用，前端查询时可以过滤禁用项。
