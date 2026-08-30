# 设计思路

micro-audit 是数据变更审计微服务模块，用于记录业务数据的 **新增（INSERT）/ 修改（UPDATE）/ 删除（DELETE）** 审计轨迹，并提供查询与字段级差异对比能力。

核心设计理念：**写入时只落快照、不落差异；字段级差异在查询时动态计算**。即审计记录生成阶段仅将数据快照序列化为 JSON 存储，真正的字段级对比（oldValue/newValue）在查询阶段按需执行，从而保证写入链路轻量、查询展示灵活。

## 设计要点

### 审计记录生成链

审计记录的生成统一通过 `AuditApi` 接口完成，实现类为 `AuditImpl`，最终通过 `mdmChangeLogService.insertBatch` 批量落库（底层 Mapper 为 `MdmChangeLogMapper.insertBatch`）。

#### 新增审计（INSERT）

```
┌────────────────────────────────────────────────────────────┐
│ AuditApi.create(to)  /  create(List<F> tos, batchNo)        │
│                                                            │
│ 1. 表名推导: camelToUnderline(to 的类简单名)                  │
│ 2. to.setVersion(version 为空 ? 0 : version + 1)   ← 业务对象版本 +1
│ 3. 组装 MdmChangeLog:                                      │
│      batchNo     = 传入 batchNo 或新生成 audit_ 批次号      │
│      dataId      = to.getId()                             │
│      dataVersion = 0                ← 审计记录版本固定为 0   │
│      tableName   = 推导的表名                              │
│      operateType = "INSERT"                               │
│      dataTo      = getDataValueJson(to)  ← dataTo 快照     │
│      sort        = 0                                      │
│ 4. mdmChangeLogService.insertBatch(logs) 批量落库          │
└────────────────────────────────────────────────────────────┘
```

- `create` 记录**只保存 `dataTo` 快照**（新增后的数据），`dataFrom` 为空。
- 审计记录的 `dataVersion` 固定为 0；同时将 `to` 自身的版本号 +1（version 为空则置 0），方便业务侧感知版本变化。

#### 修改审计（UPDATE）

```
┌────────────────────────────────────────────────────────────┐
│ AuditApi.modify(from, to) / modify(List<F>, List<T>, batchNo)│
│                                                            │
│ 1. 表名推导: 取 from 的类推导表名                             │
│ 2. 参数校验:                                               │
│      from.getId() == null        → 抛异常 "from can not without id!"
│      to.getId()   == null        → 抛异常 "to can not without id!"
│      !from.getId().equals(to.getId()) → 抛异常 "[from] id is not
│                                            equals to [to] id!"
│ 3. to.setVersion(version 为空 ? 0 : version + 1)   ← to 版本 +1
│ 4. 组装 MdmChangeLog:                                      │
│      dataId      = from.getId()                           │
│      dataVersion = from.getVersion() + 1  ← 基于旧数据版本 +1 │
│      operateType = "UPDATE"                               │
│      dataFrom    = getDataValueJson(from)  ← 旧值快照       │
│      dataTo      = getDataValueJson(to)    ← 新值快照       │
│ 5. mdmChangeLogService.insertBatch(logs) 批量落库          │
└────────────────────────────────────────────────────────────┘
```

- `modify` **必须同时提供修改前（from）与修改后（to）两个快照**，二者 `id` 均不可为空且必须相等，否则抛出 `ValidationException`。
- `dataVersion` 为 `from.getVersion() + 1`，用于表达“此审计记录对应旧版本的下一个版本”。

#### 删除审计（DELETE）

```
┌────────────────────────────────────────────────────────────┐
│ AuditApi.delete(from) / delete(List<F> froms, batchNo)      │
│                                                            │
│ 1. 表名推导: 取 from 的类推导表名                             │
│ 2. 组装 MdmChangeLog:                                      │
│      dataId      = from.getId()                           │
│      dataVersion = from.getVersion() + 1                   │
│      operateType = "DELETE"                               │
│      dataFrom    = getDataValueJson(from)  ← 删除前快照     │
│ 3. mdmChangeLogService.insertBatch(logs) 批量落库          │
└────────────────────────────────────────────────────────────┘
```

- `delete` 记录**只保存 `dataFrom` 快照**（删除前的数据），`dataTo` 为空。

三种操作的落库字段对比：

| 操作 | operateType | dataFrom | dataTo | dataVersion | 业务对象版本变化 |
|------|-------------|----------|--------|-------------|-----------------|
| create | INSERT | 空 | ✅ 新数据快照 | 固定 0 | to.version +1（空则置 0） |
| modify | UPDATE | ✅ 旧快照 | ✅ 新快照 | from.version +1 | to.version +1（空则置 0） |
| delete | DELETE | ✅ 旧快照 | 空 | from.version +1 | 无 |

### 快照机制

`dataFrom` / `dataTo` 存储的是对象字段值的 **JSON 字符串快照**，由 `AuditCompareUtil.getDataValueJson(data)` 生成：

```
AuditCompareUtil.getDataValueJson(data)
        └── getValues(data)
              ├── BeanUtil.getJavaField(data.getClass())   // 获取字段信息集合
              ├── 遍历每个 JavaField
              │     ├── fieldInfo.getGetter()              // 取 getter 方法
              │     └── getter.invoke(data)                // 反射调用 getter 取值
              │           └── 异常 → log.error 后跳过该字段
              └── JSONObject.toJSONString(values)          // 序列化为 JSON 字符串
```

- 快照通过 `BeanUtil.getJavaField` 遍历对象的 **getter** 提取各字段值，因此快照覆盖所有具备 getter 的字段。
- 单字段取值异常仅 `log.error` 记录并跳过该字段，不影响整体快照生成。

### 字段级对比（查询时完成）

字段级差异对比发生在 `AuditImpl.getLogPage` 查询阶段，而非写入阶段。流程如下：

```
getLogPage(ChangeLog<T> dto)
│
├─ 1. 表名推导
│     tableName = camelToUnderline(dto.getClazz().getSimpleName())
│
├─ 2. 分页查询 MdmChangeLog
│     param ← tableName / batchNo / dataId / operateType /
│             createBy / timeFrom / timeTo / keyword
│     page = mdmChangeLogService.getChangeLogPage(param)
│            └── PageQuery.page(param, mapper::getChangeLogList)
│
├─ 3. 获取列元数据（字段来源）
│     ColumnQuery(tableName)
│     tableInfoService.getColumnInfos4Options(query)
│     每个列: columnName → underlineToCamel(columnName)   // 下划线转驼峰
│             columnComment 保留为列描述
│
├─ 4. 获取 getter 映射
│     getters = BeanUtil.getJavaField(dto.getClazz())
│             （以驼峰字段名为 key 的 JavaField 集合）
│
├─ 5. 逐条审计记录：
│     a. dataFrom JSON → parseObject 反序列化为实体 from（为空则 null）
│        dataTo   JSON → parseObject 反序列化为实体 to   （为空则 null）
│        反序列化后将 d.dataFrom / d.dataTo 置空（快照已消费）
│     b. 遍历列元数据：
│        field = getters.get(info.getColumnName())
│        无 field 或无 getter → 跳过该列
│        o = from 为 null ? null : getter.invoke(from)   // 旧值
│        n = to  为 null ? null : getter.invoke(to)      // 新值
│
│        比较规则：
│        ├─ o == null && n == null            → 跳过（都为空，视为相同）
│        ├─ o == null（n 必非 null）          → 记录（值从无到有）
│        └─ o != null && !o.equals(n)        → 记录（值发生变更）
│
│        c. 生成 ChangeLogItem:
│           columnName = info.getColumnName()      // 驼峰列名
│           columnDesc = info.getColumnComment()   // 列描述
│           oldValue   = o
│           newValue   = n
│
├─ 6. 异常处理
│     反射调用 getter 抛 InvocationTargetException / IllegalAccessException
│     → log.error("can not invoke ...") 后继续，不中断整体查询
│
└─ 7. 返回 PageData<ChangeLog>（每条记录携带 items 差异列表）
```

比较规则示意：

```
┌─────────────┬─────────────┬──────────────────────┐
│  旧值 o      │  新值 n      │  处理                 │
├─────────────┼─────────────┼──────────────────────┤
│ null        │ null        │ 跳过（不生成差异项）    │
│ null        │ 非 null     │ 记录（值从无到有）      │
│ 非 null     │ 任意        │ o.equals(n) ? 跳过     │
│             │             │ : 记录（值变更）        │
└─────────────┴─────────────┴──────────────────────┘
```

- **写入不对比、查询才对比**：审计落库时仅存快照，避免写入链路进行字段反射对比带来的性能损耗；查询时按需对快照反序列化并做字段级 diff，展示灵活（同一份快照可适配不同的对比维度）。
- 对比粒度与实体字段强相关：只有实体具备 getter 且表存在对应列元数据的字段才会参与对比。

### 批次号

批次号用于将一次业务操作的多条审计记录归组，便于事务级追踪：

- 生成方式：`RedisIdGenerator.generateIdWithPrefix("audit_")`，基于 Redis 生成带 `audit_` 前缀的唯一批次号。
- 传入方式：`create` / `modify` / `delete` 均提供带 `batchNo` 参数的重载方法，未传入时内部自动调用 `getBatchNo()` 生成。
- 手动获取：调用 `AuditApi.getBatchNo()` 可预先获取批次号，用于在一次跨方法操作中手动归组。

### 表名推导

审计记录与查询均通过实体类推导目标表名，规则为：

```
表名 = StringUtil.camelToUnderline( clazz.getSimpleName() )
```

即取实体的**简单类名**，将驼峰命名转换为下划线命名。例如实体 `MdmOrder` → 表名 `mdm_order`。空对象或空类会抛出 `ValidationException`。

### 查询接口

`ChangeLogRest` 提供变更记录的 HTTP 查询入口（路由前缀 `/micro-audit`）：

| 接口 | 路由 | 说明 |
|------|------|------|
| 分页查询 | GET `/micro-audit/change/log/page` | 按条件分页查询，支持 batchNo/tableName/dataId/operateType/keyword/timeFrom/timeTo；`dataFrom`/`dataTo` 会被解析为 `dataFromEntity`/`dataToEntity`（Map）返回 |
| 详情 | GET `/micro-audit/change/log/info` | 按 id 查询单条变更记录详情，快照同样解析为 Map 返回 |

分页 SQL（`MdmChangeLogMapper.xml`）按 `id DESC` 排序，过滤 `deleted = 0`，关键字可模糊匹配 `data_from` / `data_to`。

## 核心组件速查

| 组件 | 说明 |
|------|------|
| AuditApi | 审计记录生成与查询接口：create / modify / delete / getLogPage / getBatchNo |
| AuditImpl | AuditApi 的实现，负责校验、快照组装、版本控制与批量落库，以及查询时字段级对比 |
| ChangeLog | 审计记录 DTO（继承 MdmChangeLog），扩展 `clazz`（实体类型）与 `items`（字段差异列表），用于查询入参与出参 |
| ChangeLogItem | 字段差异项：columnName / columnDesc / oldValue / newValue |
| MdmChangeLog | 审计记录实体（表 `mdm_change_log`）：batchNo / tableName / dataId / dataVersion / operateType / dataFrom / dataTo |
| AuditCompareUtil | 工具类：表名推导（camelToUnderline）、快照生成（getDataValueJson） |
| MdmChangeLogService | 审计记录服务（继承 BaseService），提供分页查询 getChangeLogPage 与 insertBatch 落库 |
| MdmChangeLogMapper | 审计记录 Mapper，`getChangeLogList` 分页查询 SQL |
| ChangeLogRest | 变更记录 HTTP 查询接口（分页、详情） |
