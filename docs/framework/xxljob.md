# sh-xxljob

> XXL-Job 分布式定时任务集成模块

`sh-xxljob` 是 `sh-framework` 的 XXL-Job 分布式定时任务集成模块，为应用提供开箱即用的执行器自动配置。该模块基于 `xxl-job-core` 实现，简化了分布式定时任务的集成工作，支持 `@XxlJob` 注解开发任务处理器。

## 模块概述

### 核心价值

1. **开箱即用**：自动配置，最小化配置工作
2. **智能默认**：`appName` 默认使用 `spring.application.name`
3. **完整集成**：支持所有 XXL-Job 标准功能
4. **企业级特性**：支持集群部署、日志管理、安全认证

### 主要特性

- **自动配置**：Spring Boot 3.x 自动配置，无需手动配置
- **智能默认**：`appName` 自动使用应用名称
- **完整支持**：支持所有 XXL-Job 标准配置项
- **示例代码**：内置示例任务处理器
- **日志管理**：支持任务日志存储和清理
- **集群支持**：支持多执行器集群部署

## 快速开始

### 1. 添加依赖

在项目的 `pom.xml` 文件中添加 `sh-xxljob` 依赖：

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-xxljob</artifactId>
    <version>${sh-framework.version}</version>
</dependency>
```

### 2. 配置 XXL-Job 调度中心

在 `application.yml` 中配置 XXL-Job 调度中心连接信息：

```yaml
xxl:
  job:
    admin:
      addresses: http://xxl-job-admin:8080/xxl-job-admin
      accessToken: your-token  # 可选，调度中心通讯令牌
    executor:
      appname: ${spring.application.name}  # 自动使用应用名称
      port: 9999
      logpath: ./logs/xxl-job
      logretentiondays: 30
```

### 3. 自动配置

`sh-xxljob` 使用 Spring Boot 3.x 的自动配置机制，通过 `XxlJobAutoConfigure` 类自动扫描并注册相关组件：

```java
@AutoConfiguration
@ComponentScan(basePackages = {"com.wkclz.xxljob"})
public class XxlJobAutoConfigure {
}
```

## 核心组件

### 1. XxlJobConfig - 执行器配置类

`XxlJobConfig` 是核心配置类，负责读取 XXL-Job 执行器配置并创建 `XxlJobSpringExecutor` Bean。

#### 配置项说明

| 配置键 | 默认值 | 说明 |
|--------|--------|------|
| `xxl.job.admin.addresses` | 空 | 调度中心地址（集群逗号分隔；空则关闭自动注册） |
| `xxl.job.admin.accessToken` | 空 | 通讯令牌，非空时启用 |
| `xxl.job.admin.timeout` | 3 | 调度中心通讯超时时间（秒） |
| `xxl.job.executor.appname` | `${spring.application.name}` | 执行器 AppName（心跳注册分组依据） |
| `xxl.job.executor.address` | 空 | 执行器注册地址（优先使用，空则自动 IP:PORT） |
| `xxl.job.executor.ip` | 空 | 执行器 IP（多网卡时可手动设置） |
| `xxl.job.executor.port` | 9999 | 执行器端口号（多执行器需不同） |
| `xxl.job.executor.logpath` | `./xxl-job/jobhandler` | 执行器运行日志文件存储磁盘路径 |
| `xxl.job.executor.logretentiondays` | 30 | 执行器日志文件保存天数（≥3生效，-1关闭清理） |

#### 核心 Bean 创建

```java
@Bean
public XxlJobSpringExecutor xxlJobExecutor() {
    log.info(">>>>>>>>>>> xxl-job config init {} to {}", appName, adminAddresses);
    XxlJobSpringExecutor executor = new XxlJobSpringExecutor();
    executor.setAdminAddresses(adminAddresses);
    executor.setAppname(appName);
    executor.setTimeout(timeout);
    executor.setAddress(address);
    executor.setIp(ip);
    executor.setPort(port);
    executor.setAccessToken(accessToken);
    executor.setLogPath(logPath);
    executor.setLogRetentionDays(logRetentionDays);
    return executor;
}
```

### 2. 编写 Job Handler

#### 基本示例

```java
import com.xxl.job.core.context.XxlJobHelper;
import com.xxl.job.core.handler.annotation.XxlJob;
import org.springframework.stereotype.Component;

@Component
public class MyJobHandler {

    @XxlJob("myBusinessJob")
    public void myBusinessJob() {
        XxlJobHelper.log("开始执行业务任务...");
        
        // 业务逻辑
        try {
            // 执行具体的业务操作
            processBusinessLogic();
            XxlJobHelper.log("业务任务执行完成");
        } catch (Exception e) {
            XxlJobHelper.log("业务任务执行失败: " + e.getMessage());
            throw e;
        }
    }

    @XxlJob("myDataSyncJob")
    public ReturnT<String> myDataSyncJob() {
        XxlJobHelper.log("数据同步开始");
        
        // 业务逻辑
        try {
            boolean success = syncData();
            if (success) {
                XxlJobHelper.log("数据同步成功");
                return ReturnT.SUCCESS;
            } else {
                XxlJobHelper.log("数据同步失败");
                return new ReturnT<>(ReturnT.FAIL_CODE, "数据同步失败");
            }
        } catch (Exception e) {
            XxlJobHelper.log("数据同步异常: " + e.getMessage());
            return new ReturnT<>(ReturnT.FAIL_CODE, e.getMessage());
        }
    }
    
    private void processBusinessLogic() {
        // 具体的业务逻辑
    }
    
    private boolean syncData() {
        // 数据同步逻辑
        return true;
    }
}
```

#### 带参数的 Job Handler

```java
@Component
public class ParameterizedJobHandler {

    @XxlJob("parameterizedJob")
    public ReturnT<String> parameterizedJob() {
        // 获取任务参数
        String jobParam = XxlJobHelper.getJobParam();
        XxlJobHelper.log("任务参数: " + jobParam);
        
        // 获取分片参数
        int shardIndex = XxlJobHelper.getShardIndex();
        int shardTotal = XxlJobHelper.getShardTotal();
        XxlJobHelper.log("分片参数: {}/{}", shardIndex, shardTotal);
        
        // 根据分片参数处理数据
        processDataByShard(shardIndex, shardTotal, jobParam);
        
        return ReturnT.SUCCESS;
    }
    
    private void processDataByShard(int shardIndex, int shardTotal, String param) {
        // 根据分片处理数据
        // 例如：处理数据库中的某一部分数据
    }
}
```

### 3. XxlJobDemo - 示例任务处理器

`sh-xxljob` 模块内置了一个示例任务处理器：

```java
@Component
public class XxlJobDemo {
    @XxlJob("demoJobHandler")
    public void demoJobHandler() {
        XxlJobHelper.log("XXL-JOB, Hello World.");
    }
}
```

**注意**：这个示例会自动注册，如果不需要，可以通过以下方式排除：
1. 移除 `@Component` 注解
2. 在配置中排除扫描 `com.wkclz.xxljob.demo` 包

## 详细配置指南

### 1. 最小配置

只需要配置调度中心地址即可运行：

```yaml
xxl:
  job:
    admin:
      addresses: http://localhost:8080/xxl-job-admin
```

### 2. 完整配置示例

```yaml
xxl:
  job:
    admin:
      addresses: http://xxl-job-admin-1:8080/xxl-job-admin,http://xxl-job-admin-2:8080/xxl-job-admin
      accessToken: your-secret-token
      timeout: 5
    executor:
      appname: order-service
      address: 
      ip: 192.168.1.100
      port: 9999
      logpath: /data/logs/xxl-job/order-service
      logretentiondays: 30
```

### 3. 多环境配置

```yaml
# application-dev.yml (开发环境)
xxl:
  job:
    admin:
      addresses: http://dev-xxl-job:8080/xxl-job-admin
    executor:
      appname: ${spring.application.name}
      port: 9999

# application-prod.yml (生产环境)
xxl:
  job:
    admin:
      addresses: http://prod-xxl-job-1:8080/xxl-job-admin,http://prod-xxl-job-2:8080/xxl-job-admin
      accessToken: ${XXL_JOB_ACCESS_TOKEN}
    executor:
      appname: ${spring.application.name}
      port: 9999
      logpath: /var/log/xxl-job/${spring.application.name}
      logretentiondays: 90
```

## 使用示例

### 1. 数据同步任务

```java
@Component
public class DataSyncJobHandler {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private OrderService orderService;
    
    @XxlJob("syncUserData")
    public ReturnT<String> syncUserData() {
        XxlJobHelper.log("开始同步用户数据");
        
        try {
            // 同步用户数据
            int count = userService.syncFromExternalSystem();
            XxlJobHelper.log("成功同步 {} 条用户数据", count);
            
            return ReturnT.SUCCESS;
        } catch (Exception e) {
            XxlJobHelper.log("用户数据同步失败: {}", e.getMessage());
            return new ReturnT<>(ReturnT.FAIL_CODE, "同步失败: " + e.getMessage());
        }
    }
    
    @XxlJob("syncOrderData")
    public void syncOrderData() {
        XxlJobHelper.log("开始同步订单数据");
        
        // 获取分片参数，实现分布式处理
        int shardIndex = XxlJobHelper.getShardIndex();
        int shardTotal = XxlJobHelper.getShardTotal();
        
        // 根据分片处理订单数据
        orderService.syncOrdersByShard(shardIndex, shardTotal);
        
        XxlJobHelper.log("订单数据同步完成，分片: {}/{}", shardIndex, shardTotal);
    }
}
```

### 2. 报表生成任务

```java
@Component
public class ReportJobHandler {
    
    @Autowired
    private ReportService reportService;
    
    @XxlJob("generateDailyReport")
    public ReturnT<String> generateDailyReport() {
        XxlJobHelper.log("开始生成日报表");
        
        try {
            // 获取昨天的日期
            LocalDate yesterday = LocalDate.now().minusDays(1);
            
            // 生成日报表
            ReportResult result = reportService.generateDailyReport(yesterday);
            
            XxlJobHelper.log("日报表生成成功: {}", result);
            return ReturnT.SUCCESS;
        } catch (Exception e) {
            XxlJobHelper.log("日报表生成失败: {}", e.getMessage());
            return new ReturnT<>(ReturnT.FAIL_CODE, "生成失败: " + e.getMessage());
        }
    }
    
    @XxlJob("cleanOldReports")
    public void cleanOldReports() {
        XxlJobHelper.log("开始清理过期报表");
        
        // 清理30天前的报表
        int deletedCount = reportService.cleanOldReports(30);
        
        XxlJobHelper.log("清理完成，共删除 {} 个过期报表", deletedCount);
    }
}
```

### 3. 消息处理任务

```java
@Component
public class MessageJobHandler {
    
    @Autowired
    private MessageService messageService;
    
    @XxlJob("processPendingMessages")
    public void processPendingMessages() {
        XxlJobHelper.log("开始处理待发送消息");
        
        // 获取任务参数（每次处理的消息数量）
        String param = XxlJobHelper.getJobParam();
        int batchSize = StringUtils.isNotBlank(param) ? Integer.parseInt(param) : 100;
        
        // 处理待发送消息
        int processedCount = messageService.processPendingMessages(batchSize);
        
        XxlJobHelper.log("消息处理完成，共处理 {} 条消息", processedCount);
    }
    
    @XxlJob("retryFailedMessages")
    public ReturnT<String> retryFailedMessages() {
        XxlJobHelper.log("开始重试失败消息");
        
        try {
            int retryCount = messageService.retryFailedMessages();
            
            if (retryCount > 0) {
                XxlJobHelper.log("成功重试 {} 条失败消息", retryCount);
                return ReturnT.SUCCESS;
            } else {
                XxlJobHelper.log("没有需要重试的失败消息");
                return new ReturnT<>(ReturnT.SUCCESS_CODE, "没有需要重试的消息");
            }
        } catch (Exception e) {
            XxlJobHelper.log("重试失败消息异常: {}", e.getMessage());
            return new ReturnT<>(ReturnT.FAIL_CODE, "重试失败: " + e.getMessage());
        }
    }
}
```

## 最佳实践

### 1. 任务命名规范

- 使用有意义的任务名称，如 `syncUserData`、`generateDailyReport`
- 遵循驼峰命名法
- 避免使用特殊字符和空格

### 2. 日志记录

- 使用 `XxlJobHelper.log()` 记录任务执行日志
- 日志会同步到调度中心，便于查看任务执行情况
- 记录关键步骤和异常信息

### 3. 异常处理

```java
@XxlJob("safeJobHandler")
public ReturnT<String> safeJobHandler() {
    try {
        // 业务逻辑
        executeBusinessLogic();
        return ReturnT.SUCCESS;
    } catch (BusinessException e) {
        // 业务异常，记录日志并返回失败
        XxlJobHelper.log("业务异常: {}", e.getMessage());
        return new ReturnT<>(ReturnT.FAIL_CODE, e.getMessage());
    } catch (Exception e) {
        // 系统异常，记录详细日志
        XxlJobHelper.log("系统异常: {}", e.getMessage());
        XxlJobHelper.log("异常堆栈: ", e);
        return new ReturnT<>(ReturnT.FAIL_CODE, "系统异常");
    }
}
```

### 4. 性能优化

- 对于大数据量处理，使用分片参数实现分布式处理
- 合理设置任务执行超时时间
- 避免在任务中执行长时间阻塞的操作

### 5. 监控告警

- 在调度中心配置任务失败告警
- 监控任务执行时间和成功率
- 定期检查任务日志

## 常见问题

### 1. 执行器无法注册到调度中心

**可能原因**：
- 调度中心地址配置错误
- 网络不通
- 调度中心未启动

**解决方案**：
1. 检查 `xxl.job.admin.addresses` 配置是否正确
2. 检查网络连接
3. 查看执行器日志，确认注册过程

### 2. 任务执行失败

**可能原因**：
- 任务处理器不存在或名称不匹配
- 任务代码异常
- 资源不足

**解决方案**：
1. 检查任务处理器名称是否与调度中心配置一致
2. 查看任务执行日志
3. 检查系统资源使用情况

### 3. 日志无法查看

**可能原因**：
- 日志路径配置错误
- 权限不足
- 日志文件被清理

**解决方案**：
1. 检查 `xxl.job.executor.logpath` 配置
2. 确保应用有写权限
3. 检查 `logretentiondays` 配置

## 架构原理

### 自动配置流程

```
引入 sh-xxljob 依赖
  → 读取 AutoConfiguration.imports
  → 加载 XxlJobAutoConfigure
  → @ComponentScan 扫描 com.wkclz.xxljob 包
  → XxlJobConfig 注册为 Bean
  → xxlJobExecutor() 创建 XxlJobSpringExecutor
  → XxlJobDemo 注册为 Bean（示例 Handler）
  → 执行器启动，向调度中心注册
```

### 组件交互

```
调度中心 (XXL-Job Admin)
        ↑
        | HTTP/RPC
        ↓
执行器 (XxlJobSpringExecutor)
        ↑
        | Spring Bean 调用
        ↓
任务处理器 (@XxlJob 注解的方法)
```

## 注意事项

1. **配置前缀**：使用 `xxl.job` 前缀，与 XXL-Job 官方约定保持一致
2. **智能默认**：`appname` 默认使用 `spring.application.name`，无需重复配置
3. **最小配置**：仅需配置 `xxl.job.admin.addresses` 即可运行
4. **示例代码**：`XxlJobDemo` 会自动注册，如不需要可排除
5. **日志管理**：合理设置 `logretentiondays`，避免日志文件过多

## 相关链接

- [XXL-Job 官方文档](https://www.xuxueli.com/xxl-job/)
- [Spring Boot 文档](https://spring.io/projects/spring-boot)
- [sh-framework 文档](../index.md)

---

通过 `sh-xxljob` 模块，您可以快速集成 XXL-Job 分布式定时任务系统