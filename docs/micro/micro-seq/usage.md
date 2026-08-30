# 功能使用

Micro-Seq 是序列号生成微服务模块，提供分布式环境下唯一、有序的序列号（编码）生成能力。采用编程式 `SeqApi` 接口接入（无需注解），支持单号 / 批量生成、前缀 + 左补零格式化，并通过 `SERIALIZABLE` 事务隔离 + `synchronized` 同步 + 乐观锁三重机制保证并发下序列号不重复。

- 编程式 API：注入 `SeqApi` 即可调用 `genSequence` / `genSequences` 生成序列号
- 前缀 + 左补零：返回结果由「前缀 + 数字序列」组成，如 `ORDER` + `0001` → `ORDER0001`
- 并发防重：`SERIALIZABLE` 事务 + `synchronized` 同步 + 乐观锁（`version`）三重保障，更新竞争失败时抛异常放弃生成
- 序列自动初始化：首次按前缀生成时自动创建序列记录，`seqName` 缺省取前缀
- REST 管理接口：分页查询 / 详情 / 修改序列规则

## 添加依赖

Maven 坐标：`com.wkclz.microapp:micro-seq`（版本跟随 `sh-microapp` 父 POM 的 `revision` 管理）。

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-seq</artifactId>
</dependency>
```

> 引入依赖即可使用。`SeqAutoConfig` 通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 自动装配，扫描 `com.wkclz.micro.seq` 包下的 Mapper 与组件，无需额外配置。

## 注入 SeqApi

`SeqApi` 位于 `com.wkclz.micro.seq.api`，在任意 Spring 组件中注入即可：

```java
@Service
public class OrderService {

    @Autowired
    private SeqApi seqApi;

}
```

## 生成单个序列号

`SeqApi` 提供三个 `genSequence` 重载方法，序列长度 `length` 缺省为 4。

### genSequence(prefix)

使用缺省长度 4，序列名称 `seqName` 缺省取前缀：

```java
String orderNo = seqApi.genSequence("ORDER");
// orderNo = "ORDER0001"
```

### genSequence(prefix, seqName)

指定序列名称（用于在 `mdm_sequence` 表中标识序列规则，便于管理端维护），长度仍缺省 4：

```java
String orderNo = seqApi.genSequence("ORDER", "订单号序列");
// orderNo = "ORDER0001"
```

### genSequence(prefix, length, seqName)

同时指定前缀、序列长度与序列名称：

```java
String orderNo = seqApi.genSequence("ORDER", 6, "订单号序列");
// orderNo = "ORDER000001"
```

**返回示例**（假设该前缀首次生成，从 1 开始）：

| 调用 | 返回 |
| --- | --- |
| `genSequence("ORDER")` | `ORDER0001` |
| `genSequence("ORDER", "订单号序列")` | `ORDER0001` |
| `genSequence("ORDER", 6, "订单号序列")` | `ORDER000001` |
| `genSequence("A", 4, null)` | `A0001` |

> `genSequence` 底层调用批量方法 `genSequences(prefix, 1, length, seqName)` 并返回第一条；若结果为空会抛出 `ValidationException`（`生成失败，没有可返回的序列!`）。

## 批量生成序列号

`SeqApi` 提供两个 `genSequences` 批量重载方法，返回 `List<String>`，列表元素已拼接前缀。

### genSequences(prefix, size, seqName)

指定生成数量，长度缺省 4：

```java
List<String> seqs = seqApi.genSequences("ORDER", 3, "订单号序列");
// seqs = ["ORDER0001", "ORDER0002", "ORDER0003"]
```

### genSequences(prefix, size, length, seqName)

同时指定生成数量与序列长度：

```java
List<String> seqs = seqApi.genSequences("ORDER", 3, 6, "订单号序列");
// seqs = ["ORDER000001", "ORDER000002", "ORDER000003"]
```

**说明**：

- `size`：生成数量，若传 `null` 或小于 0，按 1 处理
- 批量生成是原子的：一次调用内 `size` 个序列号连续递增并一次性提交，中途失败（乐观锁更新影响行数为 0）时整个事务回滚，不会产生"发号但未落库"的间隙

## 返回拼接前缀与补零说明

`SeqApi` 与 `MdmSequenceService` 的分工：

- `MdmSequenceService.genSequences` 只返回左补零后的数字部分（如 `0001`），不做前缀拼接
- `SeqApi.genSequences` 对每个元素执行 `prefix + 数字部分`，返回拼接前缀后的最终编码（如 `ORDER0001`）

补零规则：

- 数字部分按序列长度 `codeLength` 左补零，长度不足时用 `0` 补齐；缺省长度 4，最小长度 4（`length` 传 `null` 或小于 4 时按 4 处理）
- 已存在序列记录时，实际长度以库中 `codeLength` 为准（后续通过 update 接口调整后即按新长度生成）
- 数字超过 `codeLength` 位数时不截断、不补零，原样返回（如 `codeLength = 4` 时第 10000 号返回 `10000`）

序列初始化行为：

- 首次按某前缀生成时，自动创建一条序列记录（`sequence` 从 0 开始），`seqName` 未指定时缺省取前缀；因此首次生成返回的是 `prefix + 0001`
- 之后每次生成基于库中已持久化的当前 `sequence` 递增
- 前缀 `prefix` 不能为空（否则抛出 `ValidationException`），生成前会被 `trim()` 去除首尾空格

并发防重：

- 核心方法 `genSequences` 使用 `@Transactional(rollbackFor = Exception.class, isolation = Isolation.SERIALIZABLE)` 事务 + `synchronized` 方法同步
- 序列值通过乐观锁（`version`）更新，更新影响行数为 0（并发竞争失败）时抛出 `ValidationException`（`编码生成竞争失败，为防止重复，已放弃生成，请重新提交！`），本次生成整体放弃，确保序列号不重复

> 源码注释说明：序列生成的唯一性非常重要，生成数量极少，牺牲一定性能换取功能正确性。

## REST 接口

模块提供序列规则的 REST 查询 / 修改接口，供管理端或运维维护序列规则（序列名称、前缀、当前序列、序列长度）。所有接口统一以 `/micro-seq` 为前缀。

### 1. 分页查询

```http
GET /micro-seq/sequence/page
```

**请求参数**（Query）：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| current | Long | 否 | 当前页码，默认 1 |
| size | Long | 否 | 每页条数，默认值见框架 `Pageable` 定义 |
| seqName | String | 否 | 名称，模糊查询（LIKE） |
| prefix | String | 否 | 前缀，模糊查询（LIKE） |
| sequence | Integer | 否 | 当前序列，精确匹配 |
| codeLength | Integer | 否 | 序列长度（不计前缀长度），精确匹配 |

**请求示例**：

```bash
curl "http://localhost:8080/micro-seq/sequence/page?current=1&size=10&seqName=订单&prefix=ORDER"
```

**响应**：`R<PageData<SequencePageResp>>`，列表项包含 `id`、`seqName`、`prefix`、`sequence`、`codeLength` 及基础字段。

```json
{
    "code": 1,
    "data": {
        "records": [
            {
                "id": 1,
                "seqName": "订单号序列",
                "prefix": "ORDER",
                "sequence": 100,
                "codeLength": 6,
                "remark": null,
                "createTime": "2026-08-30 10:00:00",
                "createBy": "admin",
                "version": 100
            }
        ],
        "total": 1,
        "current": 1,
        "size": 10
    }
}
```

### 2. 详情

```http
GET /micro-seq/sequence/info?id=1
```

**请求参数**（Query）：`id`（序列记录主键 ID，必填）

**请求示例**：

```bash
curl "http://localhost:8080/micro-seq/sequence/info?id=1"
```

**响应**：`R<SequenceResp>`。id 不存在时返回 `code` 非成功态且 `message` 为 `id is error`。

```json
{
    "code": 1,
    "data": {
        "id": 1,
        "seqName": "订单号序列",
        "prefix": "ORDER",
        "sequence": 100,
        "codeLength": 6,
        "remark": null,
        "createTime": "2026-08-30 10:00:00",
        "createBy": "admin",
        "version": 100
    }
}
```

### 3. 修改

```http
POST /micro-seq/sequence/update
Content-Type: application/json
```

**请求参数**（Body，JSON）：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Long | 是 | 主键 ID（继承 `UpdateReq`） |
| version | Integer | 是 | 数据版本，乐观锁（继承 `UpdateReq`） |
| seqName | String | 是 | 名称，不能为空 |
| prefix | String | 是 | 前缀，不能为空 |
| sequence | Integer | 是 | 当前序列，不能为空 |
| codeLength | Integer | 是 | 序列长度（不计前缀长度），不能为空 |
| sort | Integer | 否 | 排序 |
| remark | String | 否 | 备注 |

**请求示例**：

```bash
curl -X POST "http://localhost:8080/micro-seq/sequence/update" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "version": 100,
    "seqName": "订单号序列",
    "prefix": "ORDER",
    "sequence": 100,
    "codeLength": 6,
    "sort": 1,
    "remark": "订单号序列规则"
  }'
```

**响应**：`R<SequenceResp>`，返回修改后的序列规则完整信息。

**注意**：

- 修改 `codeLength` 后，后续生成将按新长度左补零
- 修改 `sequence` 可调整当前计数（如重置 / 跳号），请谨慎操作
- `prefix` 唯一，修改为已存在的前缀会触发重复校验，抛出 `ValidationException`（`RECORD_DUPLICATE`）

## 完整业务场景示例

以下示例演示在一个 Service 中注入 `SeqApi`，实现「创建订单时生成订单号」，以及「批量创建明细时批量生成流水号」两种常见场景：

```java
@Service
public class OrderService {

    @Autowired
    private SeqApi seqApi;
    @Autowired
    private OrderMapper orderMapper;

    /**
     * 创建订单：生成订单号（ORDER + 6 位左补零）
     *
     * @param orderNo 外部订单号（可为空）
     */
    public Order createOrder(Order order) {
        // 1. 生成订单号：如 ORDER000001、ORDER000002
        String orderNo = seqApi.genSequence("ORDER", 6, "订单号序列");
        order.setOrderNo(orderNo);

        // 2. 落库
        orderMapper.insert(order);
        return order;
    }

    /**
     * 批量创建订单明细：一次性生成 N 个明细流水号
     *
     * @param size 明细数量
     */
    public List<String> batchCreateDetail(int size) {
        // 批量生成 3 个流水号：如 DETAIL0001、DETAIL0002、DETAIL0003
        List<String> detailNos = seqApi.genSequences("DETAIL", size, "明细流水号序列");
        // 业务处理：按序写入明细单号
        return detailNos;
    }
}
```

接入流程小结：

1. 引入依赖 `com.wkclz.microapp:micro-seq`，`SeqAutoConfig` 自动装配
2. Service 注入 `SeqApi`
3. 需要单号时调用 `genSequence`，需要批量发号时调用 `genSequences`
4. 序列规则由 `mdm_sequence` 表持久化，首次生成自动初始化，后续可通过 REST 接口维护
