# micro-seq 功能集成文档

## 1. Maven 依赖引入

在主应用的 `pom.xml` 中添加以下依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-seq</artifactId>
</dependency>
```

`micro-seq` 由父工程 `com.wkclz.microapp:sh-microapp` 统一管理版本（`${revision}`），因此引入时无需（也不应）显式声明 `<version>`。

---

## 2. 自动配置

模块引入后，`SeqAutoConfig` 通过 Spring Boot 自动配置机制自动生效，无需手动配置：

- `resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 中注册了 `com.wkclz.micro.seq.SeqAutoConfig`
- `SeqAutoConfig`（`com.wkclz.micro.seq.SeqAutoConfig`）声明为 `@Configuration`：
  - 通过 `@MapperScan({"com.wkclz.micro.seq.mapper"})` 自动扫描 Mapper（`MdmSequenceMapper`）
  - 通过 `@ComponentScan(basePackages = {"com.wkclz.micro.seq"})` 自动扫描组件（Rest / Service / Api 等）

启动后即可注入 `com.wkclz.micro.seq.api.SeqApi` 进行编程式序列生成：

```java
@Autowired
private SeqApi seqApi;

// 单个序列：默认长度 4，生成结果为 prefix + 补齐长度的数字，如 "ORDER0001"
String seq = seqApi.genSequence("ORDER");

// 批量生成：prefix + size 个序列（默认长度 4）
List<String> seqs = seqApi.genSequences("ORDER", 10, "订单号");

// 指定长度生成
String seq2 = seqApi.genSequence("ORDER", 6, "订单号");
```

> 说明：`SeqApi` 的生成方法内部基于 `mdm_sequence` 表，以 `prefix` 为唯一键，通过 `Isolation.SERIALIZABLE` 事务 + `synchronized` 保证并发唯一性（生成数量极少，牺牲性能保功能）。

---

## 3. 数据库表结构

### 3.1 mdm_sequence — 序列生成表

```sql
CREATE TABLE `mdm_sequence` (
  `id`          bigint       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `seq_name`    varchar(127) DEFAULT NULL COMMENT '名称',
  `prefix`      varchar(63)  DEFAULT NULL COMMENT '前缀',
  `sequence`    int          DEFAULT 0  COMMENT '当前序列',
  `code_length` int          DEFAULT 4  COMMENT '序列长度(不计前缀长度)',
  `sort`        int          DEFAULT 0  COMMENT '排序',
  `create_time` datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`   varchar(31)  DEFAULT NULL COMMENT '创建人',
  `update_time` datetime     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`   varchar(31)  DEFAULT NULL COMMENT '更新人',
  `remark`      varchar(255) DEFAULT NULL COMMENT '备注',
  `version`     int          DEFAULT 0  COMMENT '乐观锁',
  `deleted`     varchar(24)  DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  KEY `idx_prefix` (`prefix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='序列生成';
```

**字段说明**：

- 业务字段：`seq_name`（名称）、`prefix`（前缀，序列生成唯一键）、`sequence`（当前序列，已生成到的值）、`code_length`（序列长度，不计前缀长度）
- 通用审计字段（框架 `DbColumnEntity` 规范）：`id` / `sort` / `create_time` / `create_by` / `update_time` / `update_by` / `remark` / `version`
- `version` 为乐观锁，更新时 `version = version + 1` 并以旧 `version` 作为条件，防止并发覆盖
- `deleted` 为逻辑删除标记，所有查询均带 `deleted = 0` 条件

---

## 4. REST API 接口清单

所有接口前缀：`/micro-seq`

| # | 方法 | 路径 | 说明 | 请求 | 返回值 |
|---|------|------|------|------|--------|
| 1 | GET | `/micro-seq/sequence/page` | 序列分页查询 | `SequencePageReq` | `R<PageData<SequencePageResp>>` |
| 2 | GET | `/micro-seq/sequence/info` | 序列详情（按 ID） | `SequenceInfoReq` | `R<SequenceResp>` |
| 3 | POST | `/micro-seq/sequence/update` | 修改序列 | `SequenceUpdateReq` | `R<SequenceResp>` |

### 4.1 分页查询参数（SequencePageReq）

继承 `PageReq`，提供分页字段 `current`（页码）、`size`（每页大小），同时支持以下业务过滤条件：

| 参数 | 类型 | 说明 |
|------|------|------|
| `seqName` | String | 名称【支持模糊查询】 |
| `prefix` | String | 前缀【支持模糊查询】 |
| `sequence` | Integer | 当前序列（精确匹配） |
| `codeLength` | Integer | 序列长度(不计前缀长度)（精确匹配） |
| `current` | Long | 分页页码 |
| `size` | Long | 分页大小 |

> 分页结果封装为 `PageData`：`current` / `size` / `offset` / `total` / `count` / `records`（`records` 元素为 `SequencePageResp`）。

### 4.2 详情查询参数（SequenceInfoReq）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | Long | 是 | 主键 ID |

> ID 不存在时返回 `R.error("id is error")`。

### 4.3 修改请求参数（SequenceUpdateReq）

继承 `UpdateReq`，携带乐观锁字段：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | Long | 是 | 主键 ID |
| `version` | Integer | 是 | 数据版本（乐观锁） |
| `seqName` | String | 是 | 名称 |
| `prefix` | String | 是 | 前缀 |
| `sequence` | Integer | 是 | 当前序列 |
| `codeLength` | Integer | 是 | 序列长度(不计前缀长度) |
| `sort` | Integer | 否 | 排序 |
| `remark` | String | 否 | 备注 |

> 更新前会做 `prefix` 唯一性校验（`duplicateCheck`），`prefix` 与其他记录重复时返回 `RECORD_DUPLICATE`；记录不存在时返回 `RECORD_NOT_EXIST`。

### 4.4 响应字段（SequenceResp / SequencePageResp）

二者字段一致，均继承 `EntityResp`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Long | 主键 ID |
| `sort` | Integer | 排序 |
| `seqName` | String | 名称 |
| `prefix` | String | 前缀 |
| `sequence` | Integer | 当前序列 |
| `codeLength` | Integer | 序列长度(不计前缀长度) |
| `createTime` | LocalDateTime | 创建时间 |
| `createBy` | String | 创建人 code |
| `updateTime` | LocalDateTime | 更新时间 |
| `updateBy` | String | 更新人 code |
| `remark` | String | 备注 |
| `version` | Integer | 数据版本 |
| `createByName` | String | 创建人姓名 |
| `updateByName` | String | 更新人姓名 |

> 统一响应封装为 `R<T>`：`code` / `msg` / `data` / `requestTime` / `responseTime` / `costTime`。

---

## 5. 验证集成的方法

### 5.1 依赖引入

确认主应用 `pom.xml` 已添加 `com.wkclz.microapp:micro-seq` 依赖，且父工程 `com.wkclz.microapp:sh-microapp` 已包含该模块（`<dependencyManagement>` 或 modules 列表）。

### 5.2 启动自动配置生效

启动应用，观察启动日志无 `SeqAutoConfig` 相关报错；可通过以下方式确认生效：

- 自动配置已加载 `com.wkclz.micro.seq.SeqAutoConfig`，Mapper 扫描 `com.wkclz.micro.seq.mapper`、组件扫描 `com.wkclz.micro.seq`
- 若已集成 Swagger/OpenAPI（`@Tag(name = "1.序列生成")`），可在接口文档中看到 `/micro-seq/sequence/*` 三个接口

### 5.3 curl 自测

```bash
# 分页查询（全部序列）
curl "http://localhost:8080/micro-seq/sequence/page?current=1&size=10"

# 分页查询（按名称/前缀模糊过滤）
curl "http://localhost:8080/micro-seq/sequence/page?seqName=订单&prefix=ORDER&current=1&size=10"

# 详情查询
curl "http://localhost:8080/micro-seq/sequence/info?id=1"

# 修改序列（携带 id + version 乐观锁）
curl -X POST "http://localhost:8080/micro-seq/sequence/update" \
  -H "Content-Type: application/json" \
  -d '{"id":1,"version":0,"seqName":"订单号","prefix":"ORDER","sequence":100,"codeLength":6,"remark":"修改测试"}'
```

### 5.4 常见问题排查

1. **表不存在**：启动或查询时报 `Table 'mdm_sequence' doesn't exist`，需先执行第 3 节建表 DDL
2. **修改返回 `RECORD_NOT_EXIST`**：确认 `id` 存在且 `deleted = 0`
3. **修改返回 `RECORD_DUPLICATE`**：`prefix` 与其他记录重复，序列生成以 `prefix` 为唯一键，不可重复
4. **修改失败（乐观锁冲突）**：`version` 必须与数据库中当前 `version` 一致，更新后 `version` 自增，需使用最新值
5. **编程式生成抛 `编码生成竞争失败`**：`SeqApi.genSequence` 内部以 `prefix` 为唯一键串行更新，并发下失败属正常保护，重试即可
