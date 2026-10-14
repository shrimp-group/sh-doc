# 设计思路

micro-seq 是序列号生成微服务模块。它基于数据库表 `mdm_sequence` 维护每个前缀（prefix）的当前序号（sequence），通过「应用内 synchronized 互斥 + 数据库 SERIALIZABLE 事务 + version 乐观锁条件更新」三层手段保证序列唯一性，最终产出「前缀 + 左补零数字」的序列号。核心入口为 `SeqApi`，业务方只需调用 `SeqApi.genSequence(prefix, ...)` 即可获得唯一序列号。

## 设计要点

### 生成链路

对外唯一入口是 `SeqApi.genSequences`，整条调用链路为：

```
SeqApi.genSequences(prefix, size, length, seqName)          // synchronized，组合 prefix
        │
        ▼
MdmSequenceService.genSequences(prefix, size, length, seqName)
        │   @Transactional(rollbackFor = Exception.class, isolation = SERIALIZABLE)
        │   synchronized
        ▼
mapper.getSequenceInfo(prefix)        // 按 prefix 精确查询当前序列
        │
        ├─ 记录不存在 → 缺省建号（insertSequenceInfo）→ 重新 getSequenceInfo
        ▼
length = seq.getCodeLength()          // 以库中记录为准
sequence = seq.getSequence()
循环 size 次: sequence += 1 → fitLength(sequence, length)  // 左补零
        ▼
mapper.updateSequenceInfo(seq)        // version 乐观锁条件更新
        │
        ├─ 影响行数 < 1 → 抛"编码生成竞争失败"异常（回滚）
        ▼
返回 List<String>（纯数字补零序列）
        │
        ▼
SeqApi 逐项拼接 → prefix + 数字序列，返回 List<String>
```

最终返回值 = `prefix + 补零序列`，其中数字部分左补零至 `codeLength` 位。

`SeqApi` 提供多组重载，方便按需调用：

| 方法 | 行为 |
|------|------|
| `genSequence(prefix)` | 默认长度 4，`seqName` 为空 |
| `genSequence(prefix, seqName)` | 默认长度 4 |
| `genSequence(prefix, length, seqName)` | 生成 1 个；结果为空时抛 `"生成失败，没有可返回的序列!"`，否则返回首个 |
| `genSequences(prefix, size, seqName)` | 默认长度 4 |
| `genSequences(prefix, size, length, seqName)` | 完整入口，`synchronized` 方法 |

参数处理约定：

- `prefix` 为空抛 `"prefix 不能为空"`，随后 `prefix = prefix.trim()` 去首尾空白
- `size` 为 `null` 或 `< 0` 时取 `1`（`size = 0` 保留，返回空列表）

### 并发与防重原理

序列唯一性通过三层机制保证，牺牲性能保功能（生成量极少）：

1. **应用内互斥**：`MdmSequenceService.genSequences` 声明为 `synchronized`，单实例内同一前缀的生成请求串行执行；`SeqApi.genSequences` 亦为 `synchronized`，双重互斥
2. **事务隔离**：方法标注 `@Transactional(rollbackFor = Exception.class, isolation = Isolation.SERIALIZABLE)`，数据库层面串行化，进一步隔离并发读写
3. **version 乐观锁条件更新（核心防重）**：更新语句携带旧 version 作为 WHERE 条件：

```sql
UPDATE mdm_sequence
SET sequence = #{sequence}, version = version + 1
WHERE deleted = 0
  AND prefix = #{prefix}
  AND version = #{version}
```

更新成功则 `version + 1`；若影响行数 `< 1`（说明期间 version 已被其他事务修改，序列已被占用），抛异常：

```
"编码生成竞争失败，为防止重复，已放弃生成，请重新提交！"
```

异常类型为 `ValidationException`，事务整体回滚，本次生成作废，避免生成重复序列号。

### 缺省建号

`getSequenceInfo(prefix)` 按前缀精确查询，查不到记录时自动创建一条，保证首次调用即可使用：

```
记录不存在时（seq == null）：
    length 为 null 或 < 4        → length = 4   （最小长度 4）
    seqName 为空                 → seqName = prefix （缺省取 prefix）
    新记录：seqName / prefix / sequence=0 / codeLength=length
    mapper.insertSequenceInfo(seq)
    seq = mapper.getSequenceInfo(prefix)   // 重新读取（含自增主键、version）
```

创建完成后（以及记录已存在时），统一执行 `length = seq.getCodeLength()`，即**实际长度以库中记录的 `code_length` 为准**，再在其基础上递增生成。

### 补零规则 fitLength

数字部分由静态方法 `fitLength(sequence, length)` 处理：

```
str = sequence + ""
i   = length - str.length()
i < 1        → 原样返回 str       // 数字位数已达或超过 codeLength，超长不截断、不处理
否则          → "0".repeat(i) + str  // 左补零至 codeLength 位
```

即：位数不足时左侧补 `0` 至 `codeLength` 位；位数达到或超过 `codeLength` 时原样返回（不做截断）。

### 序列信息查询 getSequenceInfo

`MdmSequenceMapper.getSequenceInfo` 按 `prefix` 精确查询单条记录：

```sql
SELECT seq_name, prefix, sequence, code_length, version
FROM mdm_sequence
WHERE deleted = 0
  AND prefix = #{prefix}
```

查询结果用于生成链路（取 `sequence`、`codeLength`、`version`）以及乐观锁更新时的 version 比对。

## 核心组件速查

| 组件 | 说明 |
|------|------|
| SeqApi | 序列生成 API（@Component），业务方唯一入口；`synchronized`，提供多组重载，返回 `prefix + 补零序列` |
| MdmSequenceService | 序列服务（@Service，继承 BaseService）；`SERIALIZABLE` 事务 + `synchronized` 防并发，缺省建号、fitLength 补零、version 乐观锁更新；另有分页 / 新增 / 修改（prefix 唯一性校验）等管理方法 |
| MdmSequenceMapper | Mapper 接口：getSequenceList（分页）、getSequenceInfo（按 prefix 精确查询）、insertSequenceInfo（建号）、updateSequenceInfo（乐观锁条件更新） |
| MdmSequence | 实体（mdm_sequence 表）：seqName（名称）、prefix（前缀）、sequence（当前序列）、codeLength（序列长度，不计前缀长度），继承 BaseEntity（id / version / 审计字段等） |
| Route | 路由常量：`@Router(module = "micro-seq", prefix = "/micro-seq")`，含 /sequence/page、/sequence/info、/sequence/update |
| SequenceRest | 序列管理 REST 接口（@RestController，RequestMapping = `/micro-seq`）：分页查询、按 ID 查详情、修改，均以 `R` 统一封装 |
