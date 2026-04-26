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

模块启动时会自动创建所需的数据表。首次使用前，需要通过管理后台配置字典数据。

## 配置文件

在 `application.yml` 中配置字典服务参数：

### 缓存配置

| 配置项 | 是否必填 | 默认值 | 可选值 | 说明 |
|--------|----------|--------|--------|------|
| `shrimp.dict.cache.enabled` | 否 | true | true/false | 是否启用本地缓存 |
| `shrimp.dict.cache.refresh-interval` | 否 | 30 | 正整数 | 缓存刷新间隔（秒） |
| `shrimp.dict.cache.max-dicts` | 否 | 1000 | 正整数 | 最大缓存字典数量 |

### 配置示例

```yaml
shrimp:
  dict:
    cache:
      enabled: true
      refresh-interval: 30
      max-dicts: 1000
```

## 集成方式

### 方式一：依赖注入

在需要使用字典服务的类中注入服务：

```java
@Autowired
private MdmDictService mdmDictService;

@Autowired
private MdmDictItemService mdmDictItemService;

@Autowired
private DictCache dictCache;
```

### 方式二：REST 接口

直接调用字典服务的 REST 接口：

- **公共接口**：无需认证
  - `/common/dict/list` - 单字典查询
  - `/common/dicts/list` - 多字典查询

- **管理接口**：需要认证
  - `/dict/list` - 字典类型管理
  - `/dict-item/list` - 字典项管理

## 验证集成

启动应用后，可以通过以下方式验证集成是否成功：

1. **检查启动日志**：查看是否输出 `micro-dict: 字典服务初始化成功`
2. **测试公共接口**：调用 `/common/dict/list?dictType=USER_STATUS` 测试
3. **检查数据库**：确认字典表是否创建成功
4. **测试缓存**：多次调用查询接口，确认缓存生效

## 字典配置

### 字典类型配置

通过管理后台配置字典类型：

| 配置项 | 是否必填 | 说明 |
|--------|----------|------|
| 字典类型编码 | 是 | 唯一标识符，建议使用大写字母和下划线 |
| 字典类型名称 | 是 | 字典类型的中文名称 |
| 描述 | 否 | 字典类型的详细描述 |
| 状态 | 是 | 启用或禁用 |
| 排序 | 否 | 显示顺序 |

### 字典项配置

通过管理后台配置字典项：

| 配置项 | 是否必填 | 说明 |
|--------|----------|------|
| 字典类型 | 是 | 所属字典类型 |
| 字典项编码 | 是 | 字典项的唯一标识 |
| 字典项值 | 是 | 字典项的显示值 |
| 描述 | 否 | 字典项的详细描述 |
| 状态 | 是 | 启用或禁用 |
| 排序 | 否 | 显示顺序 |

## 注意事项

1. **字典命名规范**：字典类型使用大写字母和下划线，如 `USER_STATUS`
2. **缓存刷新**：字典变更后，缓存会在 30 秒内自动刷新
3. **性能优化**：多字典查询建议使用 `/common/dicts/list` 接口
4. **安全控制**：管理接口需要权限验证，防止未授权修改
