# 前端使用指南

## 公共字典接口

前端通过公共接口获取字典数据，无需登录即可访问。

### 获取单个字典

```http
GET /micro-dict/common/dict/list?dictType=USER_STATUS
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dictType | String | 是 | 字典类型（支持驼峰格式，会自动转换） |

**响应示例**：

```json
{
    "code": 1,
    "data": [
        {
            "id": 1,
            "dictType": "USER_STATUS",
            "dictValue": "1",
            "dictLabel": "正常",
            "elType": "success",
            "description": "用户正常状态",
            "sort": 1
        },
        {
            "id": 2,
            "dictType": "USER_STATUS",
            "dictValue": "2",
            "dictLabel": "禁用",
            "elType": "danger",
            "description": "用户禁用状态",
            "sort": 2
        }
    ]
}
```

### 获取多个字典

```http
GET /micro-dict/common/dicts/list?dictType=USER_STATUS,ORDER_STATUS,GENDER
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dictType | String | 是 | 字典类型，多个用英文逗号分隔 |

**响应示例**：

```json
{
    "code": 1,
    "data": {
        "USER_STATUS": [
            {
                "id": 1,
                "dictType": "USER_STATUS",
                "dictValue": "1",
                "dictLabel": "正常",
                "elType": "success",
                "sort": 1
            }
        ],
        "ORDER_STATUS": [
            {
                "id": 1,
                "dictType": "ORDER_STATUS",
                "dictValue": "10",
                "dictLabel": "待支付",
                "elType": "warning",
                "sort": 1
            }
        ],
        "GENDER": [
            {
                "id": 1,
                "dictType": "GENDER",
                "dictValue": "1",
                "dictLabel": "男",
                "sort": 1
            }
        ]
    }
}
```

## 前端封装示例

### Vue 3 + TypeScript

#### 字典工具类

```typescript
// utils/dict.ts
interface DictItem {
  id: number
  dictType: string
  dictValue: string
  dictLabel: string
  elType?: string
  description?: string
  sort: number
}

const dictCache = new Map<string, DictItem[]>()

export async function loadDict(dictType: string): Promise<DictItem[]> {
  if (dictCache.has(dictType)) {
    return dictCache.get(dictType)!
  }
  
  const response = await fetch(`/micro-dict/common/dict/list?dictType=${dictType}`)
  const result = await response.json()
  
  if (result.code === 1) {
    dictCache.set(dictType, result.data)
    return result.data
  }
  
  return []
}

export async function loadDicts(dictTypes: string[]): Promise<Record<string, DictItem[]>> {
  const uncached = dictTypes.filter(t => !dictCache.has(t))
  
  if (uncached.length > 0) {
    const response = await fetch(`/micro-dict/common/dicts/list?dictType=${uncached.join(',')}`)
    const result = await response.json()
    
    if (result.code === 1) {
      Object.entries(result.data).forEach(([key, value]) => {
        dictCache.set(key, value as DictItem[])
      })
    }
  }
  
  const result: Record<string, DictItem[]> = {}
  dictTypes.forEach(t => {
    result[t] = dictCache.get(t) || []
  })
  
  return result
}

export function getDictLabel(dictType: string, dictValue: string): string {
  const items = dictCache.get(dictType)
  if (!items) return ''
  
  const item = items.find(i => i.dictValue === dictValue)
  return item?.dictLabel || ''
}

export function getDictItem(dictType: string, dictValue: string): DictItem | undefined {
  const items = dictCache.get(dictType)
  if (!items) return undefined
  
  return items.find(i => i.dictValue === dictValue)
}
```

#### 字典组件

```vue
<!-- components/DictSelect.vue -->
<template>
  <el-select v-model="modelValue" v-bind="$attrs">
    <el-option
      v-for="item in options"
      :key="item.dictValue"
      :label="item.dictLabel"
      :value="item.dictValue"
    />
  </el-select>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { loadDict } from '@/utils/dict'

interface Props {
  dictType: string
  modelValue: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const options = ref<any[]>([])

onMounted(async () => {
  options.value = await loadDict(props.dictType)
})

const modelValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>
```

#### 使用示例

```vue
<template>
  <div>
    <!-- 字典选择器 -->
    <DictSelect v-model="form.status" dict-type="USER_STATUS" />
    
    <!-- 字典标签显示 -->
    <el-tag :type="getDictItem('USER_STATUS', row.status)?.elType">
      {{ getDictLabel('USER_STATUS', row.status) }}
    </el-tag>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { loadDicts, getDictLabel, getDictItem } from '@/utils/dict'
import DictSelect from '@/components/DictSelect.vue'

const form = reactive({
  status: ''
})

onMounted(async () => {
  // 批量加载字典
  await loadDicts(['USER_STATUS', 'ORDER_STATUS', 'GENDER'])
})
</script>
```

### React + TypeScript

#### 字典 Hook

```typescript
// hooks/useDict.ts
import { useState, useEffect } from 'react'

interface DictItem {
  id: number
  dictType: string
  dictValue: string
  dictLabel: string
  elType?: string
  description?: string
  sort: number
}

const dictCache = new Map<string, DictItem[]>()

export function useDict(dictType: string) {
  const [options, setOptions] = useState<DictItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dictCache.has(dictType)) {
      setOptions(dictCache.get(dictType)!)
      return
    }

    setLoading(true)
    fetch(`/micro-dict/common/dict/list?dictType=${dictType}`)
      .then(res => res.json())
      .then(result => {
        if (result.code === 1) {
          dictCache.set(dictType, result.data)
          setOptions(result.data)
        }
      })
      .finally(() => setLoading(false))
  }, [dictType])

  const getLabel = (value: string) => {
    const item = options.find(o => o.dictValue === value)
    return item?.dictLabel || ''
  }

  return { options, loading, getLabel }
}

export function useDicts(dictTypes: string[]) {
  const [dicts, setDicts] = useState<Record<string, DictItem[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const uncached = dictTypes.filter(t => !dictCache.has(t))
    
    if (uncached.length === 0) {
      const result: Record<string, DictItem[]> = {}
      dictTypes.forEach(t => {
        result[t] = dictCache.get(t) || []
      })
      setDicts(result)
      return
    }

    setLoading(true)
    fetch(`/micro-dict/common/dicts/list?dictType=${uncached.join(',')}`)
      .then(res => res.json())
      .then(result => {
        if (result.code === 1) {
          Object.entries(result.data).forEach(([key, value]) => {
            dictCache.set(key, value as DictItem[])
          })
          
          const allDicts: Record<string, DictItem[]> = {}
          dictTypes.forEach(t => {
            allDicts[t] = dictCache.get(t) || []
          })
          setDicts(allDicts)
        }
      })
      .finally(() => setLoading(false))
  }, [dictTypes.join(',')])

  const getLabel = (dictType: string, value: string) => {
    const items = dicts[dictType] || []
    const item = items.find(o => o.dictValue === value)
    return item?.dictLabel || ''
  }

  return { dicts, loading, getLabel }
}
```

#### 使用示例

```tsx
import { useDict, useDicts } from '@/hooks/useDict'

function UserForm() {
  const { options: statusOptions } = useDict('USER_STATUS')
  const { dicts, getLabel } = useDicts(['USER_STATUS', 'GENDER'])

  return (
    <form>
      <select>
        {statusOptions.map(item => (
          <option key={item.dictValue} value={item.dictValue}>
            {item.dictLabel}
          </option>
        ))}
      </select>
    </form>
  )
}

function UserList({ users }) {
  const { getLabel } = useDicts(['USER_STATUS'])

  return (
    <table>
      {users.map(user => (
        <tr key={user.id}>
          <td>{user.name}</td>
          <td>{getLabel('USER_STATUS', user.status)}</td>
        </tr>
      ))}
    </table>
  )
}
```

## 字典类型命名转换

接口支持驼峰格式自动转换：

| 前端传入 | 自动转换为 |
|----------|-----------|
| userStatus | USER_STATUS |
| orderStatus | ORDER_STATUS |
| paymentType | PAYMENT_TYPE |

## 最佳实践

### 1. 预加载字典

在应用启动时预加载常用字典：

```typescript
// main.ts
import { loadDicts } from '@/utils/dict'

// 预加载常用字典
loadDicts([
  'USER_STATUS',
  'ORDER_STATUS',
  'GENDER',
  'PAYMENT_TYPE'
])
```

### 2. 字典缓存策略

- 字典数据在页面刷新后重新加载
- 可结合 localStorage 实现持久化缓存
- 建议设置缓存过期时间

### 3. 字典组件封装

封装通用的字典组件，提高开发效率：

- DictSelect：字典选择器
- DictTag：字典标签
- DictRadio：字典单选
- DictCheckbox：字典多选
