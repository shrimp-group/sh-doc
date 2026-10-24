# 规则引擎

Micro-LiteFlow 是轻量级规则引擎微服务模块，提供流程编排和规则执行功能。

## 功能特性

- 流程编排：可视化流程编排
- 组件化：业务组件化设计
- 规则脚本：支持 EL 表达式规则
- 热部署：规则热更新

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-liteflow</artifactId>
</dependency>
```

### 定义规则

```xml
<chain name="demo">
    THEN(a, b, c);
</chain>
```

## 数据表

包含 `liteflow_chain`（规则）、`liteflow_script`（脚本）两张表。

```sql
CREATE TABLE `liteflow_chain` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `application_name` varchar(31) DEFAULT NULL COMMENT '应用名称',
  `chain_name` varchar(31) DEFAULT NULL COMMENT '规则名称',
  `chain_desc` varchar(63) DEFAULT NULL COMMENT '规则描述',
  `el_data` longtext COMMENT '规则数据',
  `route` longtext COMMENT '路由',
  `namespace` varchar(31) DEFAULT NULL COMMENT '命名空间',
  `enable` int NOT NULL DEFAULT '1' COMMENT '状态',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(31) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(31) DEFAULT NULL COMMENT '更新人',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `version` int NOT NULL DEFAULT '0' COMMENT '版本号',
  `status` bigint unsigned NOT NULL DEFAULT '1' COMMENT 'status',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB COMMENT='liteflow-规则';

CREATE TABLE `liteflow_script` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `application_name` varchar(31) DEFAULT NULL COMMENT '应用名称',
  `script_id` varchar(31) DEFAULT NULL COMMENT '脚本ID',
  `script_name` varchar(63) DEFAULT NULL COMMENT '脚本名称',
  `script_data` longtext COMMENT '脚本数据',
  `script_type` varchar(31) DEFAULT NULL COMMENT '脚本类型',
  `script_language` varchar(31) DEFAULT NULL COMMENT '脚本语言',
  `enable` int NOT NULL DEFAULT '1' COMMENT '可用状态',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(31) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(31) DEFAULT NULL COMMENT '更新人',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `version` int NOT NULL DEFAULT '0' COMMENT '版本号',
  `status` bigint unsigned NOT NULL DEFAULT '1' COMMENT 'status',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB COMMENT='liteflow-脚本';
```

> 注：原 SQL 用 `status`（默认 1，删除时填充时间戳）承担软删标记，与数据库规范 `deleted` 语义一致但命名不同，且未含 `deleted` 字段，按原文保留。下方配置中的 `chainCustomSql`/`scriptCustomSql` 的 `status = 1` 依赖此字段。

## 配置

```yaml
liteflow:
  print-banner: false
  rule-source-ext-data-map:
    applicationName: demo
    #是否开启SQL日志
    sqlLogEnabled: false
    #是否开启SQL数据轮询自动刷新机制 默认不开启
    pollingEnabled: true
    pollingIntervalSeconds: 59
    pollingStartSeconds: 59

    chainTableName: liteflow_chain
    chainNameField: chain_name
    elDataField: el_data
    routeField: route
    namespaceField: namespace
    chainCustomSql: SELECT chain_name,chain_desc,el_data,route,namespace FROM liteflow_chain WHERE status = 1 AND enable = 1
    scriptTableName: liteflow_script
    scriptIdField: script_id
    scriptNameField: script_name
    scriptDataField: script_data
    scriptTypeField: script_type
    scriptLanguageField: script_language
    scriptCustomSql: SELECT script_id,script_name,script_data,script_type,script_language FROM liteflow_script WHERE status = 1 AND enable = 1
```

## 使用

- 创建组件

```java
@Component("a")
public class ACmp extends NodeComponent {
  @Override
  public void process() {
    System.out.println("ACmp executed!");
  }
}
```

- 启动流程

```java
@Slf4j
@Component
public class LiteFlowDemo {
    @Autowired
    private FlowExecutor flowExecutor;
    public void run(String... args) throws Exception {
        LiteflowResponse chain1 = flowExecutor.execute2Resp("chain1", args);
        if (chain1.isSuccess()){
            log.info("执行成功");
        }else{
            log.info("执行失败");
        }
    }
}
```
