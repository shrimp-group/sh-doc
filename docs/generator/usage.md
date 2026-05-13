# 项目接入及使用方法

本文档介绍如何在您的项目中集成和使用代码生成系统，重点说明 generator-client 的使用方法。

## 什么是 generator-client？

generator-client 是代码生成系统的客户端库，它允许您在项目中直接调用代码生成功能，无需通过Web界面。

### 主要功能
- **API调用**：调用远程代码生成服务
- **本地生成**：在本地生成代码文件
- **配置管理**：管理项目生成配置
- **批量生成**：支持批量生成多个表的代码

### 使用场景
1. **CI/CD集成**：在构建流程中自动生成代码
2. **开发工具集成**：在IDE或开发工具中集成代码生成
3. **自动化脚本**：通过脚本批量生成代码
4. **项目初始化**：新项目初始化时生成基础代码

## 快速开始

### 1. 添加依赖

在您的项目中添加 generator-client 依赖：

**Maven项目：**
```xml
<dependency>
    <groupId>com.wkclz.generator</groupId>
    <artifactId>generator-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

**Gradle项目：**
```groovy
implementation 'com.wkclz.generator:generator-client:1.0.0'
```

### 2. 配置服务地址

在 application.yml 或 application.properties 中配置代码生成服务地址：

```yaml
generator:
  server:
    url: `http://localhost:8080`  # 代码生成服务地址
    timeout: 30000              # 请求超时时间（毫秒）
```

### 3. 基本使用示例

```java
import com.wkclz.generator.client.GenHelper;
import com.wkclz.generator.client.bean.GenResult;

public class CodeGeneratorExample {
    
    public void generateCode() {
        // 创建生成助手
        GenHelper helper = new GenHelper();
        
        // 设置项目编码（在Web界面创建项目后获取）
        helper.setProjectCode("gen_123456789");
        
        // 执行生成
        GenResult result = helper.generate();
        
        if (result.isSuccess()) {
            System.out.println("代码生成成功！");
            System.out.println("生成文件数：" + result.getFileCount());
            System.out.println("生成路径：" + result.getGenPath());
        } else {
            System.out.println("代码生成失败：" + result.getMessage());
        }
    }
}
```

## 详细使用方法

### 1. 初始化生成助手

```java
// 方式一：使用默认配置
GenHelper helper = new GenHelper();

// 方式二：自定义配置
GenHelper helper = new GenHelper();
helper.setServerUrl("http://your-generator-server:8080");
helper.setConnectTimeout(30000);
helper.setReadTimeout(60000);
```

### 2. 设置生成参数

```java
// 设置项目编码（必需）
helper.setProjectCode("gen_123456789");

// 设置表名（可选，不设置则生成所有表）
helper.setTableNames(Arrays.asList("user", "role", "permission"));

// 设置生成路径（可选，默认使用项目配置）
helper.setOutputDirectory("/path/to/output");

// 设置是否增量生成（可选，默认false）
helper.setIncremental(true);

// 设置自定义变量（可选）
Map<String, Object> customVars = new HashMap<>();
customVars.put("author", "张三");
customVars.put("version", "1.0.0");
helper.setCustomVariables(customVars);
```

### 3. 执行代码生成

```java
// 执行生成
GenResult result = helper.generate();

// 检查结果
if (result.isSuccess()) {
    // 生成成功
    System.out.println("任务ID：" + result.getTaskId());
    System.out.println("文件数：" + result.getFileCount());
    System.out.println("生成路径：" + result.getGenPath());
    
    // 下载生成的代码包
    helper.download(result.getTaskId(), "generated-code.zip");
} else {
    // 生成失败
    System.out.println("错误代码：" + result.getCode());
    System.out.println("错误信息：" + result.getMessage());
    
    // 获取详细错误信息
    if (result.getErrors() != null) {
        for (String error : result.getErrors()) {
            System.out.println("错误详情：" + error);
        }
    }
}
```

### 4. 异步生成

```java
// 异步生成（适合大项目）
CompletableFuture<GenResult> future = helper.generateAsync();

// 处理结果
future.thenAccept(result -> {
    if (result.isSuccess()) {
        System.out.println("异步生成成功！");
    } else {
        System.out.println("异步生成失败：" + result.getMessage());
    }
});

// 等待完成（可选）
future.get(5, TimeUnit.MINUTES);
```

## 高级功能

### 1. 批量生成多个项目

```java
List<String> projectCodes = Arrays.asList(
    "gen_111111111",  // 用户管理模块
    "gen_222222222",  // 订单管理模块
    "gen_333333333"   // 商品管理模块
);

for (String projectCode : projectCodes) {
    GenHelper helper = new GenHelper();
    helper.setProjectCode(projectCode);
    
    GenResult result = helper.generate();
    if (result.isSuccess()) {
        System.out.println("项目 " + projectCode + " 生成成功");
    } else {
        System.out.println("项目 " + projectCode + " 生成失败：" + result.getMessage());
    }
}
```

### 2. 自定义模板变量

```java
Map<String, Object> customVars = new HashMap<>();
customVars.put("author", "李四");
customVars.put("company", "示例公司");
customVars.put("copyright", "© 2024 示例公司");
customVars.put("version", "1.0.0");

GenHelper helper = new GenHelper();
helper.setProjectCode("gen_123456789");
helper.setCustomVariables(customVars);

GenResult result = helper.generate();
```

在模板中使用自定义变量：
```ftl
/**
 * ${table.tableComment}
 * 
 * @author ${author}
 * @company ${company}
 * @version ${version}
 */
```

### 3. 增量生成

```java
GenHelper helper = new GenHelper();
helper.setProjectCode("gen_123456789");
helper.setIncremental(true);  // 启用增量生成

GenResult result = helper.generate();

if (result.isSuccess()) {
    if (result.isIncremental()) {
        System.out.println("增量生成完成");
        System.out.println("新增文件：" + result.getNewFileCount());
        System.out.println("修改文件：" + result.getModifiedFileCount());
        System.out.println("删除文件：" + result.getDeletedFileCount());
    } else {
        System.out.println("全量生成完成");
    }
}
```

### 4. 生成预览

```java
// 预览生成结果（不实际生成文件）
GenHelper helper = new GenHelper();
helper.setProjectCode("gen_123456789");

// 获取预览信息
Map<String, String> preview = helper.preview();

// 查看每个文件的预览内容
for (Map.Entry<String, String> entry : preview.entrySet()) {
    System.out.println("文件：" + entry.getKey());
    System.out.println("内容预览：" + entry.getValue().substring(0, Math.min(200, entry.getValue().length())) + "...");
    System.out.println();
}
```

### 5. 错误处理与重试

```java
GenHelper helper = new GenHelper();
helper.setProjectCode("gen_123456789");

// 设置重试策略
helper.setMaxRetries(3);
helper.setRetryDelay(1000);  // 重试延迟（毫秒）

try {
    GenResult result = helper.generateWithRetry();
    
    if (result.isSuccess()) {
        System.out.println("生成成功（经过 " + result.getRetryCount() + " 次重试）");
    } else {
        System.out.println("生成失败，最终错误：" + result.getMessage());
    }
} catch (Exception e) {
    System.out.println("生成过程发生异常：" + e.getMessage());
}
```

## 集成示例

### 1. Spring Boot项目集成

```java
import com.wkclz.generator.client.GenHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CodeGeneratorService {
    
    @Value("${generator.server.url}")
    private String serverUrl;
    
    @Value("${generator.project.code}")
    private String projectCode;
    
    /**
     * 生成用户管理模块代码
     */
    public void generateUserModule() {
        GenHelper helper = new GenHelper();
        helper.setServerUrl(serverUrl);
        helper.setProjectCode(projectCode);
        helper.setTableNames(Arrays.asList("user", "role", "user_role"));
        
        GenResult result = helper.generate();
        
        if (result.isSuccess()) {
            // 生成成功，可以触发后续操作
            System.out.println("用户管理模块代码生成完成");
        } else {
            throw new RuntimeException("代码生成失败：" + result.getMessage());
        }
    }
    
    /**
     * 在应用启动时生成代码
     */
    @PostConstruct
    public void initGenerate() {
        if (shouldGenerateOnStartup()) {
            generateUserModule();
        }
    }
    
    private boolean shouldGenerateOnStartup() {
        // 根据配置决定是否在启动时生成代码
        return true;
    }
}
```

### 2. Maven插件集成

在 pom.xml 中添加插件配置：

```xml
<build>
    <plugins>
        <plugin>
            <groupId>com.wkclz.generator</groupId>
            <artifactId>generator-maven-plugin</artifactId>
            <version>1.0.0</version>
            <configuration>
                <serverUrl>http://localhost:8080</serverUrl>
                <projectCode>gen_123456789</projectCode>
                <outputDirectory>${project.basedir}/src/main/java</outputDirectory>
                <tables>
                    <table>user</table>
                    <table>role</table>
                    <table>permission</table>
                </tables>
            </configuration>
            <executions>
                <execution>
                    <phase>generate-sources</phase>
                    <goals>
                        <goal>generate</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

运行生成命令：
```bash
mvn generator:generate
```

### 3. 命令行工具集成

创建生成脚本：

```bash
#!/bin/bash
# generate-code.sh

PROJECT_CODE="gen_123456789"
SERVER_URL="http://localhost:8080"
OUTPUT_DIR="./generated"

# 调用生成接口
curl -X POST "${SERVER_URL}/generator/gen/generate" \
  -H "Content-Type: application/json" \
  -d "{\"projectCode\":\"${PROJECT_CODE}\"}" \
  -o "${OUTPUT_DIR}/generated.zip"

# 解压生成的文件
if [ -f "${OUTPUT_DIR}/generated.zip" ]; then
    unzip -o "${OUTPUT_DIR}/generated.zip" -d "${OUTPUT_DIR}"
    echo "代码生成完成，文件已保存到 ${OUTPUT_DIR}"
else
    echo "代码生成失败"
    exit 1
fi
```

## 配置说明

### 1. 客户端配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| generator.server.url | `http://localhost:8080` | 代码生成服务地址 |
| generator.server.timeout | 30000 | 请求超时时间（毫秒） |
| generator.server.maxRetries | 3 | 最大重试次数 |
| generator.server.retryDelay | 1000 | 重试延迟时间（毫秒） |

### 2. 生成参数配置

| 参数 | 必需 | 说明 |
|------|------|------|
| projectCode | 是 | 项目编码（在Web界面创建项目后获取） |
| tableNames | 否 | 要生成的表名列表，不设置则生成所有表 |
| outputDirectory | 否 | 输出目录，不设置则使用项目配置 |
| incremental | 否 | 是否增量生成，默认false |
| customVariables | 否 | 自定义模板变量 |

## 常见问题

### Q: 如何获取项目编码？
A: 在代码生成系统的Web界面创建项目后，可以在项目详情页面找到项目编码。

### Q: 生成失败怎么办？
**排查步骤：**
1. 检查服务地址是否正确
2. 检查项目编码是否正确
3. 检查网络连接是否正常
4. 查看错误信息详情
5. 检查数据库连接是否正常

### Q: 生成的代码在哪里？
A: 默认情况下，生成的代码会打包为ZIP文件，可以通过`download`方法下载。如果配置了输出目录，会直接生成到指定目录。

### Q: 可以自定义生成逻辑吗？
A: 可以，通过继承`GenHelper`类并重写相关方法，可以实现自定义的生成逻辑。

### Q: 支持哪些模板变量？
A: 除了系统提供的表结构变量外，还可以通过`setCustomVariables`方法添加自定义变量。

### Q: 如何监控生成进度？
A: 大项目生成时，可以通过回调函数或事件监听器监控生成进度。

## 最佳实践

### 1. 环境配置
- **开发环境**：使用本地服务，快速迭代
- **测试环境**：使用测试数据库，验证生成效果
- **生产环境**：使用正式服务，严格控制权限

### 2. 生成策略
- **增量生成**：日常开发使用增量生成
- **全量生成**：重大变更时使用全量生成
- **定时生成**：定期生成代码，保持代码同步

### 3. 错误处理
- **重试机制**：网络错误时自动重试
- **日志记录**：详细记录生成日志
- **错误通知**：生成失败时发送通知

### 4. 性能优化
- **批量生成**：多个项目一起生成
- **异步生成**：大项目使用异步生成
- **缓存利用**：重复生成时利用缓存

## 相关资源

- [generator-client源码](https://github.com/shrimp-group/sh-generator/tree/main/generator-client)
- [示例项目](https://github.com/shrimp-group/sh-generator-examples)

---

**提示**：如果您是第一次使用 generator-client，建议先从[快速开始](#快速开始)的简单示例开始。