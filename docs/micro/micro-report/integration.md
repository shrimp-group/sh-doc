# 功能集成

Micro-Report 是报表微模块，提供基于数据脚本的报表定义、查询与导出能力。

## 添加依赖

在项目的 `pom.xml` 中添加依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-report</artifactId>
    <version>${revision}</version>
</dependency>
```

模块通过 Spring Boot 自动配置（`ReportAutoConfig`）装配，引入依赖后自动完成 Mapper 与组件扫描，无需额外配置类。

## 数据表初始化

模块不自动建表，需按实体与公共字段规范手工初始化以下 4 张表：

| 表名 | 用途 |
|------|------|
| report_definition | 报表定义主表（编码、名称、SQL 脚本、返回类型 result_type、启用状态 enable_flag 等） |
| report_definition_param | 报表参数定义，通过 report_code 关联主表 |
| report_definition_result | 报表结果字段定义，通过 report_code 关联主表 |
| report_definition_his | 报表定义历史版本，通过 data_id 关联主表 id |

各表除业务字段外，需包含 `BaseEntity` 公共字段（id、sort、create_time、create_by、update_time、update_by、remark、version）与逻辑删除列 `deleted`。

## 注意事项

1. **依赖 Redis**：报表定义缓存刷新基于 Redis Pub/Sub（频道 `sh:micro:report:cache:refresh`），集成方需保证 Redis 可用
2. **缓存刷新**：报表定义增删改后自动广播刷新各实例缓存（3 秒防抖）；缓存仅加载 `enable_flag = 1` 的报表定义，未启用的报表不可执行
3. **SQL 安全**：数据脚本仅允许 SELECT 语句，执行与测试时非 SELECT 一律拒绝
4. **级联行为**：修改 `reportCode` 时级联更新参数与结果字段的 report_code；删除报表定义时级联删除其参数与结果字段
5. **历史留痕**：报表定义创建与修改时自动写入历史表，无需手工维护
6. **权限接入**：接口前缀为 `/micro-report`，路径见 Route 常量定义；需将各接口导入权限系统并绑定角色后访问
