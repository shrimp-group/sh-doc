# 功能使用

Micro-Audit 是数据变更审计微服务模块，提供数据新增（INSERT）、修改（UPDATE）、删除（DELETE）三类变更的审计记录与查询能力。

- 新增 / 修改 / 删除审计：业务数据发生变化时，自动记录变更日志
- 批次（batchNo）：一次业务操作涉及的多条变更可用同一个批次号串联，便于整体追溯
- 字段级变更明细：可获取变更前后的字段级对比（columnName / columnDesc / oldValue / newValue）
- 提供编程式 API（`AuditApi`）与 REST 查询接口两种使用方式

> 被审计的业务实体需继承框架的 `BaseEntity`（`com.wkclz.core.base.BaseEntity`，含 `id`、`version` 等基础字段）。审计框架会根据实体的类名（驼峰转下划线）推导表名，例如 `User` → `user`。

## 注入 AuditApi

```java
@Autowired
private AuditApi auditApi;
```

## 获取批次号

```java
String batchNo = auditApi.getBatchNo();
```

批次号形如 `audit_xxx`。若调用变更方法时不传 `batchNo`，框架内部会自动生成一个新的批次号；需要将多次变更串成同一批次时，请先获取批次号再传入各次调用。

## 新增审计（INSERT）

数据新增成功后，将新增后的实体传入 `create`，框架会记录目标数据（dataTo）与操作类型 `INSERT`。

```java
// 新增单条，自动生成批次号
auditApi.create(user);

// 批量新增
auditApi.create(userList);

// 指定批次号（与本次业务中的其它变更串联）
auditApi.create(user, batchNo);
auditApi.create(userList, batchNo);
```

## 修改审计（UPDATE）

修改数据前保存旧值（from），修改后传入新值（to），框架会记录原数据（dataFrom）、目标数据（dataTo）与操作类型 `UPDATE`，并对比出字段级变更明细。

```java
// 修改前
User from = userService.getById(1L);

// 修改业务数据
user.setNickname("新的昵称");
userService.update(user);

// 修改后记录审计（from 与 to 都必须是同一 id 的数据）
auditApi.modify(from, user);

// 批量修改：froms 与 tos 一一对应，数量必须相等
auditApi.modify(fromList, toList);

// 指定批次号
auditApi.modify(from, user, batchNo);
auditApi.modify(fromList, toList, batchNo);
```

**注意（modify 约束）**：

- `from` 与 `to` 都必须有 `id`，且两者 `id` 必须相等，否则抛出校验异常
- 批量修改时，`froms` 与 `tos` 的数量必须一致（按下标一一对应）
- `from` 与 `to` 都不能为 null

## 删除审计（DELETE）

删除数据前，将待删除的实体传入 `delete`，框架会记录原数据（dataFrom）与操作类型 `DELETE`。

```java
// 删除单条，删除前记录
auditApi.delete(user);

// 批量删除
auditApi.delete(userList);

// 指定批次号
auditApi.delete(user, batchNo);
auditApi.delete(userList, batchNo);
```

## 分页查询（字段级变更明细）

编程式查询返回 `PageData<ChangeLog>`，其中每条 `ChangeLog` 包含字段级变更明细 `items`（类型为 `List<ChangeLogItem>`）。

```java
ChangeLog<User> dto = new ChangeLog<>();
// 必填：指定被审计的实体类型，用于推导表名与字段级对比
dto.setClazz(User.class);
// 以下查询条件均为可选
dto.setBatchNo(batchNo);          // 批次号
dto.setDataId(1L);                // 数据 ID
dto.setOperateType("UPDATE");     // 操作类型：INSERT / UPDATE / DELETE
dto.setTimeFrom(LocalDateTime.now().minusDays(7)); // 开始时间
dto.setTimeTo(LocalDateTime.now());                // 结束时间
dto.setKeyword("张三");            // 关键字（对 dataFrom/dataTo 模糊匹配）
dto.setCreateBy("admin");         // 创建人

PageData<ChangeLog> page = auditApi.getLogPage(dto);
List<ChangeLog> records = page.getRecords();
for (ChangeLog log : records) {
    // 变更记录基本信息
    log.getBatchNo();
    log.getTableName();
    log.getDataId();
    log.getDataVersion();
    log.getOperateType();

    // 字段级变更明细
    List<ChangeLogItem> items = log.getItems();
    for (ChangeLogItem item : items) {
        item.getColumnName();  // 字段名
        item.getColumnDesc();  // 字段描述（数据库列注释）
        item.getOldValue();    // 旧值
        item.getNewValue();    // 新值
    }
}
```

**说明**：

- `dto.setClazz(...)` 为必填，未设置时无法推导表名与字段信息
- 编程式查询返回的 `ChangeLog` 中 `dataFrom` / `dataTo` 为空，框架已将其解析后生成 `items` 字段级对比明细（INSERT 的 `oldValue` 为 null，DELETE 的 `newValue` 为 null，UPDATE 仅列出发生变化的字段）
- 分页结果可通过 `page.getCurrent()` / `page.getSize()` / `page.getTotal()` 获取分页信息

## REST 查询接口

模块提供了 REST 查询接口供前端直接调用，所有接口前缀为 `/micro-audit`。

### 变更记录-分页查询

```http
GET /micro-audit/change/log/page?current=1&size=10&tableName=xxx&operateType=UPDATE&keyword=xxx
```

**请求示例**：

```bash
curl "http://localhost:8080/micro-audit/change/log/page?current=1&size=10&tableName=user&operateType=UPDATE&keyword=张三&batchNo=audit_xxx"
```

**响应示例**（每条记录包含 `dataFromEntity` / `dataToEntity`，均为 JSON 解析后的 Map）：

```json
{
    "code": 1,
    "data": {
        "records": [
            {
                "id": 1001,
                "batchNo": "audit_202401151030001",
                "tableName": "user",
                "dataId": 1,
                "dataVersion": 2,
                "operateType": "UPDATE",
                "dataFromEntity": {
                    "id": 1,
                    "nickname": "旧昵称",
                    "phone": "13800000000"
                },
                "dataToEntity": {
                    "id": 1,
                    "nickname": "新昵称",
                    "phone": "13800000000"
                },
                "createTime": "2024-01-15 10:30:01",
                "createBy": "admin"
            }
        ],
        "total": 1,
        "current": 1,
        "size": 10
    }
}
```

### 变更记录-详情

```http
GET /micro-audit/change/log/info?id=1
```

**请求示例**：

```bash
curl "http://localhost:8080/micro-audit/change/log/info?id=1"
```

**响应示例**：

```json
{
    "code": 1,
    "data": {
        "id": 1,
        "batchNo": "audit_202401151030001",
        "tableName": "user",
        "dataId": 1,
        "dataVersion": 2,
        "operateType": "UPDATE",
        "dataFromEntity": {
            "id": 1,
            "nickname": "旧昵称"
        },
        "dataToEntity": {
            "id": 1,
            "nickname": "新昵称"
        },
        "createTime": "2024-01-15 10:30:01",
        "createBy": "admin"
    }
}
```

> REST 接口返回的 `dataFromEntity` / `dataToEntity` 为变更前后的完整数据快照（Map），字段级差异对比请使用编程式 API `getLogPage` 的 `items`。

## 参数说明

### 查询条件参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| batchNo | String | 批次号，精确匹配 |
| tableName | String | 表名（实体类名驼峰转下划线，如 `User` → `user`），精确匹配 |
| dataId | Long | 数据 ID，精确匹配 |
| operateType | String | 操作类型：INSERT / UPDATE / DELETE，精确匹配 |
| createBy | String | 创建人，精确匹配 |
| keyword | String | 关键字，对 dataFrom（原数据）/ dataTo（目标数据）进行模糊匹配（LIKE） |
| timeFrom | LocalDateTime | 创建时间开始，`create_time >= timeFrom` |
| timeTo | LocalDateTime | 创建时间结束，`create_time <= timeTo` |

### 分页参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| current | Long | 当前页码，从 1 开始，默认 1 |
| size | Long | 每页条数，默认值见框架 `Pageable` 定义 |

**注意**：分页参数是 `current` / `size`（不是 `pageNum` / `pageSize`）。

## 完整业务接入场景

以下示例演示「修改用户资料后记录审计，并查询字段变更明细」的完整流程。

### 1. 业务代码接入

```java
@Service
public class UserService {

    @Autowired
    private AuditApi auditApi;
    @Autowired
    private UserMapper userMapper;

    /**
     * 修改用户资料，并记录修改审计
     */
    public void updateUser(User user) {
        // 1. 修改前保存旧值
        User from = userMapper.selectById(user.getId());

        // 2. 执行业务修改
        userMapper.updateById(user);

        // 3. 记录修改审计（from 与 to 的 id 必须相等）
        auditApi.modify(from, user);
    }

    /**
     * 查询某用户的修改历史及字段级变更明细
     */
    public List<ChangeLog> listUserChangeLogs(Long userId, String keyword) {
        ChangeLog<User> dto = new ChangeLog<>();
        dto.setClazz(User.class);
        dto.setDataId(userId);
        dto.setOperateType("UPDATE");
        dto.setKeyword(keyword);

        PageData<ChangeLog> page = auditApi.getLogPage(dto);
        return page.getRecords();
    }
}
```

### 2. 通过 REST 查询审计记录

```bash
# 分页查询用户表（user）的修改审计记录
curl "http://localhost:8080/micro-audit/change/log/page?current=1&size=10&tableName=user&operateType=UPDATE"

# 查询变更记录详情
curl "http://localhost:8080/micro-audit/change/log/info?id=1"
```

### 3. 字段级变更明细展示

对返回的 `ChangeLog` 遍历 `items`，即可在前端展示形如下表的字段级变更：

| 字段名 | 字段描述 | 旧值 | 新值 |
| --- | --- | --- | --- |
| nickname | 昵称 | 旧昵称 | 新昵称 |
| phone | 手机号 | 13800000000 | 13900000000 |
