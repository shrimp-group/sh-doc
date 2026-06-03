# sh-web

基于 Spring Boot Web 的 Web 开发增强模块，提供统一的异常处理、请求响应工具、API 文档生成等 Web 开发常用功能。

## 🚀 核心价值

- **统一异常处理**：全局异常捕获和统一响应格式
- **请求响应增强**：提供丰富的请求和响应处理工具
- **API 文档生成**：自动生成 REST API 文档
- **线程上下文管理**：本地线程变量管理工具
- **生产就绪**：内置生产环境最佳实践

## 📦 依赖

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-web</artifactId>
    <version>${sh-framework.version}</version>
</dependency>
```

**传递依赖**：
- Spring Boot 3.x
- Spring Web
- Spring Actuator
- sh-spring（Spring 增强模块）
- sh-core（基础工具类）

## ⚙️ 快速开始

### 1. 基础配置

sh-web 自动配置，无需额外配置即可使用：

```yaml
# 可选：配置 Actuator 端点（用于健康检查）
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

### 2. 使用示例

```java
import com.wkclz.web.helper.RequestHelper;
import com.wkclz.web.helper.ResponseHelper;
import com.wkclz.web.helper.IpHelper;
import com.wkclz.core.base.R;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {
    
    // 自动异常处理示例
    @GetMapping("/{id}")
    public R<User> getUser(@PathVariable Long id) {
        // 业务逻辑，如果发生异常会被全局异常处理器捕获
        User user = userService.findById(id);
        return R.ok(user);
    }
    
    // 使用请求工具类
    @PostMapping("/search")
    public R<List<User>> searchUsers(@RequestBody SearchRequest request, 
                                    HttpServletRequest httpRequest) {
        // 获取客户端真实IP
        String clientIp = IpHelper.getOriginIp(httpRequest);
        logger.info("请求来自IP: {}", clientIp);
        
        // 处理请求参数
        Map<String, String> params = RequestHelper.getParamsFromRequest(httpRequest);
        
        // 业务逻辑
        List<User> users = userService.search(request);
        return R.ok(users);
    }
}
```

## 🔧 核心组件详解

### 1. ErrorHandler - 全局异常处理器

统一处理所有控制器抛出的异常，返回标准化的错误响应：

```java
import com.wkclz.core.exception.BusinessException;
import com.wkclz.core.exception.UserException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/order")
public class OrderController {
    
    @PostMapping("/create")
    public R<Order> createOrder(@RequestBody OrderRequest request) {
        // 业务异常示例
        if (request.getAmount() <= 0) {
            throw new BusinessException("订单金额必须大于0");
        }
        
        // 用户异常示例（前端会直接显示给用户）
        if (!userService.isValid(request.getUserId())) {
            throw new UserException("用户不存在或已禁用");
        }
        
        // 系统异常示例（会被自动捕获并记录日志）
        Order order = orderService.create(request);
        return R.ok(order);
    }
}
```

**支持的异常类型**：
- `BusinessException` - 业务异常（HTTP 400）
- `UserException` - 用户异常（HTTP 400，直接显示给用户）
- `SystemException` - 系统异常（HTTP 500）
- `HttpRequestMethodNotSupportedException` - HTTP方法不支持（HTTP 405）
- `HttpMediaTypeNotSupportedException` - 媒体类型不支持（HTTP 415）
- `NoResourceFoundException` - 资源未找到（HTTP 404）
- `SQLSyntaxErrorException` - SQL语法错误（HTTP 500）
- 其他所有异常（HTTP 500）

### 2. RequestHelper - 请求处理工具类

提供丰富的 HTTP 请求处理功能：

```java
import com.wkclz.web.helper.RequestHelper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
public class RequestDemoController {
    
    @GetMapping("/demo")
    public R<Map<String, Object>> demo(HttpServletRequest request) {
        // 获取所有请求参数
        Map<String, String> params = RequestHelper.getParamsFromRequest(request);
        
        // 获取请求头
        Map<String, String> headers = RequestHelper.getHeadersFromRequest(request);
        
        // 获取请求体（JSON）
        String body = RequestHelper.getBodyFromRequest(request);
        
        // URL 路径匹配
        boolean isMatch = RequestHelper.match("/api/**", request.getRequestURI());
        
        Map<String, Object> result = new HashMap<>();
        result.put("params", params);
        result.put("headers", headers);
        result.put("body", body);
        result.put("isMatch", isMatch);
        
        return R.ok(result);
    }
}
```

### 3. ResponseHelper - 响应处理工具类

提供响应处理功能，支持文件下载、错误响应等：

```java
import com.wkclz.web.helper.ResponseHelper;
import com.wkclz.core.base.R;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

@RestController
public class ResponseDemoController {
    
    // 文件下载示例
    @GetMapping("/download/excel")
    public void downloadExcel(HttpServletResponse response) {
        File excelFile = generateExcelFile();
        ResponseHelper.responseExcel(response, excelFile);
    }
    
    @GetMapping("/download/pdf")
    public void downloadPdf(HttpServletResponse response) {
        File pdfFile = generatePdfFile();
        ResponseHelper.responsePdf(response, pdfFile);
    }
    
    // 直接返回文件内容
    @GetMapping("/file/content")
    public void getFileContent(HttpServletResponse response) {
        String content = "Hello, World!";
        ResponseHelper.responseString(response, content);
    }
}
```

### 4. RestHelper - REST API 文档生成

自动扫描和生成 REST API 文档：

```java
import com.wkclz.web.helper.RestHelper;
import com.wkclz.web.bean.RestInfo;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docs")
public class ApiDocController {
    
    // 获取所有 API 文档（JSON 格式）
    @GetMapping("/all")
    public String getAllApis() {
        return RestHelper.getMappingStr(null, null, null);
    }
    
    // 获取 API 文档列表
    @GetMapping("/list")
    public List<RestInfo> getApiList() {
        return RestHelper.getMapping();
    }
}

// 使用注解标记 API 信息
@RestController
@RequestMapping("/api/user")
@ApiDesc("用户管理接口")
public class UserController {
    
    @GetMapping("/{id}")
    @ApiDesc("根据ID获取用户")
    public R<User> getUser(@PathVariable @FieldDesc("用户ID") Long id) {
        // ...
    }
}
```

### 5. IpHelper - IP 地址工具类

获取客户端真实 IP 地址：

```java
import com.wkclz.web.helper.IpHelper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
public class IpDemoController {
    
    @GetMapping("/ip-info")
    public R<Map<String, String>> getIpInfo(HttpServletRequest request) {
        // 获取原始客户端IP（经过代理）
        String originIp = IpHelper.getOriginIp(request);
        
        // 获取上游服务器IP（直接连接）
        String upstreamIp = IpHelper.getUpstreamIp(request);
        
        Map<String, String> ipInfo = new HashMap<>();
        ipInfo.put("originIp", originIp);
        ipInfo.put("upstreamIp", upstreamIp);
        ipInfo.put("remoteAddr", request.getRemoteAddr());
        
        return R.ok(ipInfo);
    }
}
```

### 6. LocalThreadHelper - 本地线程工具类

管理线程本地变量，用于请求上下文传递：

```java
import com.wkclz.web.helper.LocalThreadHelper;
import org.springframework.web.bind.annotation.*;

@RestController
public class ThreadContextController {
    
    // 在业务代码中使用
    @GetMapping("/user/profile")
    public R<UserProfile> getUserProfile() {
        // 获取线程变量
        String requestId = LocalThreadHelper.get("requestId");
        Long userId = LocalThreadHelper.get("userId");
        
        logger.info("请求ID: {}, 用户ID: {}", requestId, userId);
        
        // 业务逻辑
        UserProfile profile = userService.getProfile(userId);
        return R.ok(profile);
    }
}
```

### 7. Bean 数据对象 - 请求响应基础类

sh-web 提供了一组通用的请求响应数据对象，位于 `com.wkclz.web.bean` 包下，用于标准化 API 请求和响应格式。

#### 7.1 IdReq - 主键ID请求

用于通过主键ID查询或操作单个资源的请求对象：

```java
import com.wkclz.web.bean.IdReq;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {
    
    @GetMapping("/detail")
    public R<UserResponse> getUserDetail(@Valid IdReq req) {
        UserEntity user = userService.getById(req.getId());
        return R.ok(convertToResponse(user));
    }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 主键ID |

#### 7.2 PageReq - 分页请求

用于分页查询的请求对象：

```java
import com.wkclz.web.bean.PageReq;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {
    
    @GetMapping("/list")
    public R<PageResponse<UserResponse>> getUserList(PageReq req) {
        Page<UserEntity> page = userService.queryPage(req);
        return R.ok(convertToPageResponse(page));
    }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| current | Long | 否 | 当前页码，默认1 |
| size | Long | 否 | 每页大小，默认10 |

#### 7.3 UpdateReq - 更新请求

用于更新操作的请求对象，包含乐观锁版本号：

```java
import com.wkclz.web.bean.UpdateReq;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

public class UserUpdateRequest extends UpdateReq {
    
    private String username;
    private String email;
    private String phone;
    
    // getter/setter
}

@RestController
@RequestMapping("/api/user")
public class UserController {
    
    @PutMapping("/update")
    public R<UserResponse> updateUser(@Valid @RequestBody UserUpdateRequest req) {
        UserEntity user = userService.updateById(req);
        return R.ok(convertToResponse(user));
    }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 主键ID |
| version | Integer | 是 | 数据版本（乐观锁） |

#### 7.4 RemoveReq - 删除请求

用于删除操作的请求对象，支持单条和批量删除：

```java
import com.wkclz.web.bean.RemoveReq;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {
    
    @DeleteMapping("/remove")
    public R<Void> removeUser(@Valid @RequestBody RemoveReq req) {
        userService.remove(req);
        return R.ok();
    }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 二选一 | 单个主键ID |
| ids | List\<Long\> | 二选一 | 主键ID列表（批量删除） |

**验证规则：** `id` 和 `ids` 必须至少填写一个。

#### 7.5 EntityResp - 实体响应

用于实体查询响应的基础类，包含通用的审计字段：

```java
import com.wkclz.web.bean.EntityResp;

public class UserResponse extends EntityResp {
    
    private String userCode;
    private String username;
    private String nickname;
    private String email;
    private String phone;
    private Integer status;
    
    // getter/setter
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键ID |
| createTime | LocalDateTime | 创建时间 |
| createBy | String | 创建人code |
| createByName | String | 创建人姓名 |
| updateTime | LocalDateTime | 更新时间 |
| updateBy | String | 更新人code |
| updateByName | String | 更新人姓名 |
| remark | String | 备注 |
| version | Integer | 数据版本 |

#### 7.6 RestInfo - REST API 信息

用于描述 REST API 接口信息的内部类，主要配合 `RestHelper` 使用：

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| clazz | Class | 控制器类 |
| appCode | String | 应用编码 |
| code | String | 接口编码 |
| module | String | 模块名称 |
| method | String | HTTP方法（GET/POST/PUT/DELETE） |
| uri | String | 请求URI |
| name | String | 接口名称 |
| desc | String | 接口描述 |
| writeFlag | Integer | 是否写操作标识 |

## 🎯 最佳实践

### 1. 统一异常处理实践

```java
// 自定义业务异常
public class OrderException extends BusinessException {
    public OrderException(String message) {
        super(message);
    }
    
    public OrderException(String message, int code) {
        super(message, code);
    }
}

@Service
public class OrderService {
    
    public Order createOrder(OrderRequest request) {
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new OrderException("订单金额无效", 4001);
        }
        
        return orderRepository.save(convertToOrder(request));
    }
}
```

### 2. 请求日志记录

```java
@Component
public class RequestLogFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
        
        long startTime = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString();
        
        // 设置线程变量
        LocalThreadHelper.set("requestId", requestId);
        LocalThreadHelper.set("startTime", startTime);
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            // 记录响应日志
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            logger.info("[{}] Completed in {}ms", requestId, duration);
            
            // 清理线程变量
            LocalThreadHelper.clear();
        }
    }
}
```

### 3. API 版本管理

```java
// 使用路径版本控制
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {
    // V1 版本的接口
}

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {
    // V2 版本的接口
}
```

### 4. 安全最佳实践

```java
@RestController
public class SecurityController {
    
    // IP 限流
    @GetMapping("/api/public/data")
    public R<String> getPublicData(HttpServletRequest request) {
        String clientIp = IpHelper.getOriginIp(request);
        
        // 检查IP访问频率
        if (rateLimitService.isRateLimited(clientIp)) {
            throw new BusinessException("访问过于频繁，请稍后再试", 429);
        }
        
        return R.ok("公开数据");
    }
}
```

## 🔍 监控与告警

### 1. 健康检查端点

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
```

### 2. 性能监控

```java
@Aspect
@Component
public class PerformanceMonitorAspect {
    
    private static final long SLOW_THRESHOLD_MS = 1000;
    
    @Around("@annotation(org.springframework.web.bind.annotation.RequestMapping)")
    public Object monitorPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        try {
            return joinPoint.proceed();
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            
            if (duration > SLOW_THRESHOLD_MS) {
                String methodName = joinPoint.getSignature().toShortString();
                logger.warn("慢接口: {} 耗时 {}ms", methodName, duration);
            }
        }
    }
}
```

## 🐛 常见问题

### Q1: 异常信息泄露
**问题**：生产环境异常堆栈信息泄露给客户端
**解决**：
```yaml
app:
  error:
    # 生产环境关闭详细错误信息
    show-details: false
    # 自定义错误消息
    default-message: "系统繁忙，请稍后重试"
```

### Q2: 跨域问题
**解决**：
```java
@Configuration
public class CorsConfig {
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:3000", "https://example.com")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
```

### Q3: 文件上传大小限制
**解决**：
```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 100MB
```

## 📈 性能优化建议

### 1. 启用响应压缩

```yaml
server:
  compression:
    enabled: true
    mime-types: text/html,text/xml,text/plain,text/css,text/javascript,application/javascript,application/json
    min-response-size: 1024
```

### 2. 静态资源缓存

```java
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
            .addResourceLocations("classpath:/static/")
            .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS));
    }
}
```

## 🔗 相关资源

- [Spring Web 文档](https://docs.spring.io/spring-framework/reference/web/webmvc.html)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [REST API 设计指南](https://restfulapi.net/)

## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024-01-01 | 初始版本，包含基础 Web 功能 |
| 1.1.0 | 2024-03-15 | 新增全局异常处理和工具类 |
| 1.2.0 | 2024-06-01 | 新增 API 文档生成和线程上下文管理 |
| 1.3.0 | 2024-08-20 | 优化性能和安全性 |

---

**提示**：本文档基于 sh-web 最新版本编写，具体 API 可能随版本更新而变化，请参考实际代码和版本说明。