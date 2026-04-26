# 前端使用指南

## 公共接口

### 单字典查询

**接口地址**：`GET /common/dict/list`

**请求参数**：

| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| dictType | String | 是 | 字典类型编码 |

**请求示例**：

```javascript
fetch('/common/dict/list?dictType=USER_STATUS')
  .then(response => response.json())
  .then(data => {
    console.log(data);
  });
```

**响应示例**：

```json
{
  "code": 1,
  "data": [
    {
      "id": 1,
      "dictType": "USER_STATUS",
      "dictKey": "ACTIVE",
      "dictValue": "激活",
      "description": "用户激活状态",
      "sort": 1
    },
    {
      "id": 2,
      "dictType": "USER_STATUS",
      "dictKey": "INACTIVE",
      "dictValue": "未激活",
      "description": "用户未激活状态",
      "sort": 2
    },
    {
      "id": 3,
      "dictType": "USER_STATUS",
      "dictKey": "LOCKED",
      "dictValue": "锁定",
      "description": "用户锁定状态",
      "sort": 3
    }
  ]
}
```

### 多字典查询

**接口地址**：`GET /common/dicts/list`

**请求参数**：

| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| dictType | String | 是 | 字典类型编码，多个用逗号分隔 |

**请求示例**：

```javascript
fetch('/common/dicts/list?dictType=USER_STATUS,ORDER_STATUS,PAYMENT_TYPE')
  .then(response => response.json())
  .then(data => {
    console.log(data);
  });
```

**响应示例**：

```json
{
  "code": 1,
  "data": {
    "USER_STATUS": [
      {
        "id": 1,
        "dictType": "USER_STATUS",
        "dictKey": "ACTIVE",
        "dictValue": "激活",
        "description": "用户激活状态",
        "sort": 1
      },
      {
        "id": 2,
        "dictType": "USER_STATUS",
        "dictKey": "INACTIVE",
        "dictValue": "未激活",
        "sort": 2
      }
    ],
    "ORDER_STATUS": [
      {
        "id": 3,
        "dictType": "ORDER_STATUS",
        "dictKey": "PENDING",
        "dictValue": "待处理",
        "description": "订单待处理",
        "sort": 1
      },
      {
        "id": 4,
        "dictType": "ORDER_STATUS",
        "dictKey": "PAID",
        "dictValue": "已支付",
        "description": "订单已支付",
        "sort": 2
      }
    ],
    "PAYMENT_TYPE": [
      {
        "id": 5,
        "dictType": "PAYMENT_TYPE",
        "dictKey": "ALIPAY",
        "dictValue": "支付宝",
        "description": "支付宝支付",
        "sort": 1
      },
      {
        "id": 6,
        "dictType": "PAYMENT_TYPE",
        "dictKey": "WECHAT",
        "dictValue": "微信支付",
        "description": "微信支付",
        "sort": 2
      }
    ]
  }
}
```

## 管理接口

### 字典类型管理

**接口地址**：`GET /dict/list`

**请求参数**：

| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| dictType | String | 否 | 字典类型编码（模糊查询） |
| dictName | String | 否 | 字典类型名称（模糊查询） |
| status | Integer | 否 | 状态（1-启用，0-禁用） |
| page | Integer | 否 | 页码，默认 1 |
| size | Integer | 否 | 每页大小，默认 10 |

**响应示例**：

```json
{
  "code": 1,
  "data": {
    "records": [
      {
        "id": 1,
        "dictType": "USER_STATUS",
        "dictName": "用户状态",
        "description": "用户状态字典",
        "status": 1,
        "sort": 1
      },
      {
        "id": 2,
        "dictType": "ORDER_STATUS",
        "dictName": "订单状态",
        "description": "订单状态字典",
        "status": 1,
        "sort": 2
      }
    ],
    "total": 2,
    "size": 10,
    "current": 1
  }
}
```

### 字典项管理

**接口地址**：`GET /dict-item/list`

**请求参数**：

| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| dictType | String | 否 | 字典类型编码 |
| dictKey | String | 否 | 字典项编码（模糊查询） |
| dictValue | String | 否 | 字典项值（模糊查询） |
| status | Integer | 否 | 状态（1-启用，0-禁用） |
| page | Integer | 否 | 页码，默认 1 |
| size | Integer | 否 | 每页大小，默认 10 |

**响应示例**：

```json
{
  "code": 1,
  "data": {
    "records": [
      {
        "id": 1,
        "dictType": "USER_STATUS",
        "dictKey": "ACTIVE",
        "dictValue": "激活",
        "description": "用户激活状态",
        "status": 1,
        "sort": 1
      },
      {
        "id": 2,
        "dictType": "USER_STATUS",
        "dictKey": "INACTIVE",
        "dictValue": "未激活",
        "description": "用户未激活状态",
        "status": 1,
        "sort": 2
      }
    ],
    "total": 2,
    "size": 10,
    "current": 1
  }
}
```

## 完整示例

### 示例 1：下拉选择框

```vue
<template>
  <div>
    <el-select v-model="userStatus" placeholder="请选择用户状态">
      <el-option
        v-for="option in statusOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>
  </div>
</template>

<script>
export default {
  data() {
    return {
      userStatus: '',
      statusOptions: []
    };
  },
  mounted() {
    this.loadDictOptions();
  },
  methods: {
    async loadDictOptions() {
      try {
        const response = await fetch('/common/dict/list?dictType=USER_STATUS');
        const result = await response.json();
        
        if (result.code === 1) {
          this.statusOptions = result.data.map(item => ({
            value: item.dictKey,
            label: item.dictValue
          }));
        }
      } catch (error) {
        console.error('加载字典失败:', error);
      }
    }
  }
};
</script>
```

### 示例 2：多字典批量加载

```javascript
// 工具函数：加载多个字典
async function loadDicts(dictTypes) {
  try {
    const response = await fetch(`/common/dicts/list?dictType=${dictTypes.join(',')}`);
    const result = await response.json();
    
    if (result.code === 1) {
      return result.data;
    }
    return {};
  } catch (error) {
    console.error('加载字典失败:', error);
    return {};
  }
}

// 使用示例
async function initForm() {
  // 批量加载多个字典
  const dicts = await loadDicts(['USER_STATUS', 'ORDER_STATUS', 'PAYMENT_TYPE']);
  
  // 转换为下拉选项
  const userStatusOptions = dicts.USER_STATUS?.map(item => ({
    value: item.dictKey,
    label: item.dictValue
  })) || [];
  
  const orderStatusOptions = dicts.ORDER_STATUS?.map(item => ({
    value: item.dictKey,
    label: item.dictValue
  })) || [];
  
  const paymentTypeOptions = dicts.PAYMENT_TYPE?.map(item => ({
    value: item.dictKey,
    label: item.dictValue
  })) || [];
  
  // 使用选项初始化表单
  return {
    userStatusOptions,
    orderStatusOptions,
    paymentTypeOptions
  };
}

// 调用示例
initForm().then(options => {
  console.log('字典选项:', options);
  // 初始化表单...
});
```

### 示例 3：字典值转换

```javascript
// 工具函数：根据字典键获取值
function getDictValue(dictItems, key) {
  if (!dictItems) return key;
  
  const item = dictItems.find(item => item.dictKey === key);
  return item ? item.dictValue : key;
}

// 工具函数：批量转换字典值
function mapDictValues(dictItems, keys) {
  if (!dictItems) return keys;
  
  const dictMap = {};
  dictItems.forEach(item => {
    dictMap[item.dictKey] = item.dictValue;
  });
  
  return keys.map(key => dictMap[key] || key);
}

// 使用示例
async function displayUserStatuses(userList) {
  // 加载用户状态字典
  const response = await fetch('/common/dict/list?dictType=USER_STATUS');
  const result = await response.json();
  
  if (result.code === 1) {
    const statusDict = result.data;
    
    // 为每个用户添加状态显示值
    return userList.map(user => ({
      ...user,
      statusText: getDictValue(statusDict, user.status)
    }));
  }
  
  return userList;
}
```

### 示例 4：字典缓存

```javascript
// 字典缓存工具
class DictCache {
  constructor() {
    this.cache = new Map();
    this.expireTime = 5 * 60 * 1000; // 5分钟缓存
  }
  
  async getDict(dictType) {
    const now = Date.now();
    const cached = this.cache.get(dictType);
    
    if (cached && (now - cached.timestamp) < this.expireTime) {
      return cached.data;
    }
    
    // 缓存过期，重新加载
    try {
      const response = await fetch(`/common/dict/list?dictType=${dictType}`);
      const result = await response.json();
      
      if (result.code === 1) {
        this.cache.set(dictType, {
          data: result.data,
          timestamp: now
        });
        return result.data;
      }
    } catch (error) {
      console.error('加载字典失败:', error);
    }
    
    // 加载失败，返回缓存（如果有）
    return cached?.data || [];
  }
  
  async getDicts(dictTypes) {
    const promises = dictTypes.map(type => this.getDict(type));
    const results = await Promise.all(promises);
    
    const dictMap = {};
    dictTypes.forEach((type, index) => {
      dictMap[type] = results[index];
    });
    
    return dictMap;
  }
  
  clear() {
    this.cache.clear();
  }
  
  clearType(dictType) {
    this.cache.delete(dictType);
  }
}

// 使用示例
const dictCache = new DictCache();

// 获取字典
async function loadUserStatus() {
  return await dictCache.getDict('USER_STATUS');
}

// 批量获取字典
async function loadCommonDicts() {
  return await dictCache.getDicts(['USER_STATUS', 'ORDER_STATUS']);
}
```

## 注意事项

1. **性能优化**：使用字典缓存减少重复请求
2. **批量查询**：多字典查询使用 `/common/dicts/list` 接口
3. **错误处理**：添加适当的错误处理和兜底逻辑
4. **缓存策略**：根据字典更新频率设置合理的缓存时间
5. **字典变更**：字典变更后，前端缓存会在缓存过期后自动更新
6. **参数验证**：确保传递正确的字典类型编码
7. **权限控制**：管理接口需要认证，确保携带正确的认证信息
