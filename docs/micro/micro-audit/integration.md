# micro-audit 功能集成文档

## 1. Maven 依赖引入

在主应用的 `pom.xml` 中添加以下依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-audit</artifactId>
</dependency>
```

模块引入后，`AuditAutoConfig` 通过 Spring Boot 自动配置机制自动生效，无需手动配置：

- `resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 中注册了 `com.wkclz.micro.audit.AuditAutoConfig`
- `AuditAutoConfig` 通过 `@MapperScan({"com.wkclz.micro.audit.mapper"})` 自动扫描 Mapper
- 通过 `@ComponentScan(basePackages = {"com.wkclz.micro.audit"})` 自动扫描组件（Rest/Service/Impl 等）

**运行时依赖**：模块依赖 `com.wkclz.framework:sh-redis`，审计批次号由 `RedisIdGenerator.generateIdWithPrefix("audit_")` 生成（形如 `audit_xxx`）。因此主应用需保证 sh-redis 及 Redis 服务可用，否则批次号生成会失败。

---

## 2. 数据库表结构

### 2.1 mdm_change_log — 数据变更审计记录表

```sql
CREATE TABLE `mdm_change_log` (
  `id`            bigint       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_code`   varchar(63)  DEFAULT NULL COMMENT '租户编码',
  `batch_no`      varchar(127) DEFAULT NULL COMMENT '批次号(一次操作同一批次, RedisIdGenerator 生成, audit_ 前缀)',
  `table_name`    varchar(127) DEFAULT NULL COMMENT '表名(实体类名转下划线)',
  `data_id`       bigint       DEFAULT NULL COMMENT '数据ID',
  `data_version`  int          DEFAULT NULL COMMENT '数据版本',
  `operate_type`  varchar(31)  DEFAULT NULL COMMENT '操作类型(INSERT/UPDATE/DELETE)',
  `data_from`     longtext     DEFAULT NULL COMMENT '原数据(JSON)',
  `data_to`       longtext     DEFAULT NULL COMMENT '目标数据(JSON)',
  `sort`          int          DEFAULT 0  COMMENT '排序',
  `create_time`   datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`     varchar(31)  DEFAULT NULL COMMENT '创建人',
  `update_time`   datetime     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`     varchar(31)  DEFAULT NULL COMMENT '更新人',
  `remark`        varchar(255) DEFAULT NULL COMMENT '备注',
  `version`       int          DEFAULT 0  COMMENT '乐观锁',
  `deleted`       varchar(24)  DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_data_id` (`data_id`),
  KEY `idx_operate_type` (`operate_type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据变更审计记录';
```

**字段说明**：

- `data_from` / `data_to` 以 JSON 字符串形式存储变更前后数据，字段值可能较大，建议使用 `longtext` 类型
- `data_version` 为变更时的数据版本号（框架乐观锁版本）
- `operate_type` 取值：`INSERT` / `UPDATE` / `DELETE`
- 其余 `id` / `tenant_code` / `sort` / `create_time` / `create_by` / `update_time` / `update_by` / `remark` / `version` / `deleted` 为框架公共字段

---

## 3. REST API 接口清单

所有接口前缀：`/micro-audit`

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|--------|
| 1 | GET | `/change/log/page` | 变更记录分页查询 | `ChangeLogPageReq` | `R<PageData<ChangeLogPageResp>>` |
| 2 | GET | `/change/log/info` | 变更记录详情 | `ChangeLogInfoReq`(id) | `R<ChangeLogInfoResp>` |

### 3.1 分页查询参数（ChangeLogPageReq）

| 参数 | 类型 | 说明 |
|------|------|------|
| `batchNo` | String | 批次号（精确匹配） |
| `tableName` | String | 表名（精确匹配） |
| `dataId` | Long | 数据ID（精确匹配） |
| `operateType` | String | 操作类型 INSERT/UPDATE/DELETE（精确匹配） |
| `keyword` | String | 关键字，模糊匹配 `data_from` / `data_to` |
| `timeFrom` | LocalDateTime | 按 `create_time` 起始时间 |
| `timeTo` | LocalDateTime | 按 `create_time` 截止时间 |
| `current` | Long | 分页页码 |
| `size` | Long | 分页大小 |

### 3.2 响应说明（ChangeLogPageResp / ChangeLogInfoResp）

| 字段 | 类型 | 说明 |
|------|------|------|
| `batchNo` | String | 批次号 |
| `tableName` | String | 表名 |
| `dataId` | Long | 数据ID |
| `dataVersion` | Integer | 数据版本 |
| `operateType` | String | 操作类型 INSERT/UPDATE/DELETE |
| `dataFromEntity` | Map<String, Object> | `data_from` JSON 反序列化后的字段值 |
| `dataToEntity` | Map<String, Object> | `data_to` JSON 反序列化后的字段值 |

`dataFromEntity` / `dataToEntity` 为数据库 JSON 字符串（`data_from` / `data_to`）反序列化得到的 Map，key 为字段名，value 为字段值，便于前端直接渲染变更前后数据。

---

## 4. 验证集成的方法

### 4.1 检查模块加载

启动应用后，确认 `AuditAutoConfig` 自动配置生效（Mapper 扫描 `com.wkclz.micro.audit.mapper`、组件扫描 `com.wkclz.micro.audit`），审计相关 Bean 无启动报错。

### 4.2 分页查询

```bash
# 查询全部变更记录（分页）
curl "http://localhost:8080/micro-audit/change/log/page?current=1&size=10"

# 按批次号 + 表名 + 操作类型查询
curl "http://localhost:8080/micro-audit/change/log/page?batchNo=audit_xxx&tableName=mdm_user&operateType=UPDATE&current=1&size=10"

# 按关键字模糊搜索 data_from / data_to
curl "http://localhost:8080/micro-audit/change/log/page?keyword=zhangsan&current=1&size=10"

# 按时间范围查询
curl "http://localhost:8080/micro-audit/change/log/page?timeFrom=2026-08-01%2000:00:00&timeTo=2026-08-30%2023:59:59&current=1&size=10"
```

### 4.3 详情查询

```bash
# 查询变更记录详情
curl "http://localhost:8080/micro-audit/change/log/info?id=1"
```

### 4.4 常见问题排查

1. **表不存在**：启动或查询时报 `Table 'mdm_change_log' doesn't exist`，需先执行第 2 节建表 DDL
2. **查询无数据**：确认 `mdm_change_log` 表中有数据且 `deleted = 0`；审计数据是通过业务代码调用 `AuditApi` 的 `create` / `modify` / `delete` 方法写入的，若业务侧未接入审计，则表中无数据
3. **批次号查询为空**：确认批次号完整复制（由 `RedisIdGenerator` 生成，`audit_` 前缀）；同一次批量操作的多条记录共用同一批次号
4. **批次号生成失败 / 审计写入报错**：确认已引入 `com.wkclz.framework:sh-redis` 依赖且 Redis 服务正常，`RedisIdGenerator` 可用
5. **keyword 搜索不到**：`keyword` 基于 `data_from` / `data_to` 的 JSON 文本做 LIKE 模糊匹配，注意 JSON 中包含字段名与转义字符，建议搜索业务字段值片段
