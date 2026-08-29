# sh-web

基于 Spring Boot Web 的 Web 开发增强模块，提供统一的异常处理、请求响应工具、REST API 文档生成、线程上下文管理、响应用户名回填等 Web 开发常用能力。

## 🚀 核心价值

- **统一异常处理**：`@RestControllerAdvice` 全局捕获异常，统一返回 `R<T>` 标准响应
- **请求响应增强**：提供请求解析、响应输出、真实 IP 获取等工具类
- **API 文档生成**：扫描 `@RestController` / `@Controller` 并解析 Swagger 注解，自动生成 REST API 文档
- **线程上下文管理**：多 Key 泛型线程上下文工具，适用于请求级数据传递
- **用户名自动回填**：响应体中的 `BaseEntity` 自动回填 `createByName` / `updateByName`
- **生产就绪**：内置异常告警邮件通知能力

## 📦 依赖

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-web</artifactId>
    <version>${sh-framework.version}</version>
</dependency>
```

**直接依赖**：
- `sh-spring`（Spring 增强模块，提供 `SystemConfig`、`SpringContextHolder`、`MailUtil` 等）
- `spring-boot-starter-web`
- `spring-boot-starter-actuator`
- `mysql-connector-j`（optional，供 `ErrorHandler` 识别 MySQL 异常）
- `spring-jdbc`（optional，供 `ErrorHandler` 识别 JDBC 异常）
- `swagger-annotations`（`io.swagger.core.v3`，用于接口文档注解解析）
- `jakarta.validation-api`（参数校验）

**传递依赖**：
- `sh-core`（经 `sh-spring` 引入，提供 `R`、`PageData`、`Pageable`、`BaseEntity`、异常体系等）

> `mysql-connector-j` 与 `spring-jdbc` 为 optional 依赖：业务方若使用 MySQL / JDBC，由自身引入对应实现即可获得 SQL 异常的精确识别。

## ⚙️ 快速开始

### 1. 自动装配

sh-web 通过 `ShWebAutoConfig`（`@AutoConfiguration` + 扫描 `com.wkclz.web` 包）自动装配，引入依赖后无需额外配置即可使用：

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
import com.wkclz.web.helper.IpHelper;
import com.wkclz.core.base.R;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    // 全局异常处理：方法内抛出的异常由 ErrorHandler 统一处理
    @GetMapping("/{id}")
    public R<User> getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return R.ok(user);
    }

    // 使用请求工具类
    @PostMapping("/search")
    public R<List<User>> searchUsers(@RequestBody SearchRequest request, HttpServletRequest httpRequest) {
        // 获取客户端真实 IP
        String clientIp = IpHelper.getOriginIp(httpRequest);

        // 获取请求参数（query string / form 参数）
        Map<String, String> params = RequestHelper.getParamsFromRequest(httpRequest);

        List<User> users = userService.search(request);
        return R.ok(users);
    }
}
```

## 🔧 核心组件详解

### 1. ErrorHandler - 全局异常处理器

`@RestControllerAdvice` 全局异常处理器，统一捕获控制器抛出的异常并返回 `R<T>` 标准错误响应，同时设置对应的 HTTP 状态码。

**异常映射表**：

| 异常类型 | HTTP 状态码 | R.code | 响应消息 |
|---------|------------|--------|---------|
| `HttpMediaTypeNotSupportedException` | 415 | 415 | `Unsupported Media Type` |
| `HttpRequestMethodNotSupportedException` | 405 | 405 | `Method Not Allowed` |
| `NoResourceFoundException` | 404 | 404 | `Not Found` |
| `SQLSyntaxErrorException` | 500 | 500 | `Internal Server Error` |
| `BadSqlGrammarException` | 500 | 500 | `Internal Server Error` |
| `UncategorizedSQLException` | 500 | 500 | `Internal Server Error` |
| `MysqlDataTruncation` | 500 | 500 | `Internal Server Error` |
| `ValidationException`（框架自定义） | 400 | 异常自身 code | 异常消息 |
| `ConstraintViolationException` | 400 | 400 | 各约束消息以 `; ` 拼接 |
| `MethodArgumentNotValidException` | 400 | 400 | 第一个 `FieldError` 的默认消息 |
| `BindException` | 400 | 400 | 第一个 `FieldError` 的默认消息 |
| `CommonException` | 500 | -1 | 异常消息 |
| `Exception`（兜底） | 500 | 500 / 异常 code | 见下方说明 |

**兜底处理规则**：沿异常 cause 链（最多向上追溯 3 层）查找 `CommonException`，找到则按 `CommonException` 返回；未找到时返回通用错误。出于安全考虑，兜底响应不向客户端暴露堆栈信息，`message` 为空时统一返回 `Internal Server Error`，完整堆栈仅在服务端日志中记录。

**异常记录与告警**：所有异常均记录错误日志（`UserException` 仅记录摘要，其余异常记录完整堆栈）；当 `alarm.email.enabled=true` 时，非 `UserException` 异常会发送告警邮件：

```yaml
alarm:
  email:
    enabled: true
    host: smtp.exmail.qq.com
    from: alarm@example.com
    password: ENC(xxx.yyy)   # 敏感信息务必加密存储
    to: admin@example.com
```

**使用示例**：

```java
import com.wkclz.core.exception.CommonException;
import com.wkclz.core.exception.UserException;
import com.wkclz.core.exception.ValidationException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/order")
public class OrderController {

    @PostMapping("/create")
    public R<Order> createOrder(@RequestBody OrderRequest request) {
        // 参数校验异常（HTTP 400）
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw ValidationException.of("订单金额必须大于0");
        }

        // 用户异常：直接反馈给用户，仅记录摘要日志（HTTP 400）
        if (!userService.isValid(request.getUserId())) {
            throw UserException.of("用户不存在或已禁用");
        }

        // 业务/系统异常（HTTP 500，R.code = -1）
        if (orderService.isClosed(request.getOrderId())) {
            throw CommonException.of("订单已关闭，无法操作");
        }

        Order order = orderService.create(request);
        return R.ok(order);
    }
}
```

### 2. UserNameBodyAdvice - 响应用户名回填

`@RestControllerAdvice` 实现的 `ResponseBodyAdvice`，在响应写出前自动为响应体中的 `BaseEntity` 回填 `createByName` / `updateByName`：

- 递归遍历响应体（数组 / `Iterable` / `Map` / `R` / 普通对象字段），最大深度 8 层，收集所有 `BaseEntity`
- 汇总全部 `createBy` / `updateBy` 用户编码，批量调用 `UserNameProvider.getNamesByUserCodes` 一次查询
- 将查询结果回填到各实体的 `createByName` / `updateByName`
- 字段反射信息按类缓存（`ConcurrentHashMap`），避免重复扫描

`UserNameProvider` 为 sh-core 提供的 SPI 接口（`com.wkclz.core.spi.UserNameProvider`），从 Spring 容器中获取第一个实现；容器中不存在实现时跳过回填，不影响正常响应。

```java
import com.wkclz.core.spi.UserNameProvider;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
public class UserNameProviderImpl implements UserNameProvider {

    @Override
    public Map<String, String> getNamesByUserCodes(Set<String> userCodes) {
        // 按 userCodes 批量查询用户姓名，返回 userCode -> userName
        return userService.mapUserNames(userCodes);
    }
}
```

### 3. RequestHelper - 请求处理工具类

提供 HTTP 请求解析与 URL 处理功能：

| 方法 | 说明 |
|------|------|
| `match(String rule, String uri)` | Ant 风格路径匹配，任一参数为空返回 false |
| `getIdsFromBaseModel(BaseEntity entity)` | 合并实体的 `ids` 列表与 `id` 单个值 |
| `getParamsFromRequest(HttpServletRequest)` | 获取全部请求参数为 `Map<String, String>`（多值以逗号拼接） |
| `getRequestUrl()` | 当前请求的完整 URL（无请求时返回 `unknown`） |
| `getRequest()` | 获取当前请求，回退读取线程上下文中的 `HttpServletRequest` |
| `getFrontDomain(HttpServletRequest)` | 前端域名（依次取 `Origin` / `Referer` / 当前请求 URL） |
| `getFrontPort(HttpServletRequest)` | 前端端口 |
| `getDomainFromUrl(String)` | 从 URL 提取域名 |
| `getPortFromUrl(String)` | 从 URL 提取端口（未显式指定端口或无效时返回 null） |
| `getFrontPortalDomainPort(HttpServletRequest)` | 门户完整地址 `protocol://domain[:port]`，默认端口不拼接 |

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

        // 前端域名与端口
        String frontDomain = RequestHelper.getFrontDomain(request);
        Integer frontPort = RequestHelper.getFrontPort(request);

        // 门户地址（protocol://domain:port）
        String portal = RequestHelper.getFrontPortalDomainPort(request);

        // URL 路径匹配
        boolean isMatch = RequestHelper.match("/api/**", request.getRequestURI());

        Map<String, Object> result = new HashMap<>();
        result.put("params", params);
        result.put("frontDomain", frontDomain);
        result.put("frontPort", frontPort);
        result.put("portal", portal);
        result.put("isMatch", isMatch);
        return R.ok(result);
    }
}
```

### 4. ResponseHelper - 响应处理工具类

| 方法 | 说明 |
|------|------|
| `responseError(HttpServletResponse, R)` | 以 JSON 写出错误响应（清空时间戳字段，返回是否成功） |
| `responseExcel(HttpServletResponse, String)` | 以附件形式输出 Excel 文件（文件路径） |
| `responseExcel(HttpServletResponse, File)` | 以附件形式输出 Excel 文件（文件对象） |

文件名采用 RFC 5987 编码（`filename*=UTF-8''...`），支持中文文件名：

```java
import com.wkclz.web.helper.ResponseHelper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import java.io.File;

@RestController
public class ResponseDemoController {

    // 文件下载示例
    @GetMapping("/download/excel")
    public void downloadExcel(HttpServletResponse response) {
        File excelFile = generateExcelFile();
        ResponseHelper.responseExcel(response, excelFile);
    }
}
```

### 5. RestHelper - REST API 文档生成

自动扫描指定包路径下的 REST 接口并生成文档信息：

- 扫描 `@RestController` / `@Controller` 标注的类，提取类级 `@RequestMapping` 前缀
- 解析方法级 `@RequestMapping` / `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping`，提取 URI、HTTP 方法、`consumes` / `produces`
- 解析 Swagger 注解：类级 `@Tag`、方法级 `@Operation`（summary / description / deprecated）
- 解析方法参数（`@RequestBody` / `@PathVariable` / `@RequestParam` / `@Schema`）及返回值结构
- 扫描 `@Router`（sh-core，`module` / `prefix`）标注类，按包路径前缀为接口填充 `module` 与 `appCode`
- `writeFlag`：URI 包含 `/public/` 时为 1（写操作标记），否则为 0

**方法重载**：

| 方法 | 说明 |
|------|------|
| `getMappingStr(String packagePath, String appCode, String filter)` | 返回全部接口 JSON 字符串 |
| `getMapping()` | 全部接口（默认扫描二级包域） |
| `getMapping(String packagePath)` | 指定包路径 |
| `getMapping(String packagePath, String appCode)` | 指定包路径与应用编码 |
| `getMapping(String packagePath, String appCode, String filter)` | 指定包路径、应用编码、URI 过滤关键字 |

```java
import com.wkclz.web.helper.RestHelper;
import com.wkclz.web.bean.RestInfo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

// 使用 Swagger 注解标记接口信息
@RestController
@RequestMapping("/api/user")
@Tag(name = "用户管理", description = "用户相关接口")
public class UserController {

    @Operation(summary = "根据ID获取用户", description = "通过主键查询用户详情")
    @GetMapping("/{id}")
    public R<User> getUser(@PathVariable @Schema(description = "用户ID", example = "1") Long id) {
        // ...
    }
}
```

### 6. RestAnnotationHelper - REST 注解解析工具

配合 `RestHelper` 使用的注解解析工具类：

| 方法 | 说明 |
|------|------|
| `extractClassTag(Class<?>)` | 提取类级 `@Tag`，返回 `name - description` 组合（均空时返回 null） |
| `extractParameters(Method)` | 提取方法参数为 `List<RestParam>`（含注解类型、必填、默认值、泛型、复杂类型字段结构） |
| `extractReturnType(Method, RestInfo)` | 提取返回类型与泛型信息，`void` 返回置为 `void` |
| `extractReturnSchema(Method, RestInfo, Type)` | 提取返回值完整字段结构（JSON） |
| `convertFieldInfos(List<FieldInfo>)` | 将 `ClassTypeHelper.FieldInfo` 转换为 `List<RestField>`（递归） |
| `appendDesc(List<Class<?>>, List<RestInfo>)` | 按 `@Router` 的包前缀为接口填充 `module` / `appCode` |

### 7. IpHelper - IP 地址工具类

| 方法 | 说明 |
|------|------|
| `getUpstreamIp(HttpServletRequest)` | 上游地址：直接取 `request.getRemoteAddr()` |
| `getOriginIp(HttpServletRequest)` | 客户端真实 IP，按优先级依次取 `x-forwarded-for` → `Proxy-Client-IP` → `WL-Proxy-Client-IP` → `remoteAddr`；`remoteAddr` 为本机回环地址时取本机网卡 IP；多级代理时取第一个 IP |

```java
import com.wkclz.web.helper.IpHelper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
public class IpDemoController {

    @GetMapping("/ip-info")
    public R<Map<String, String>> getIpInfo(HttpServletRequest request) {
        // 获取客户端真实 IP（经过代理）
        String originIp = IpHelper.getOriginIp(request);

        // 获取上游服务器 IP（直接连接地址）
        String upstreamIp = IpHelper.getUpstreamIp(request);

        Map<String, String> ipInfo = new HashMap<>();
        ipInfo.put("originIp", originIp);
        ipInfo.put("upstreamIp", upstreamIp);
        ipInfo.put("remoteAddr", request.getRemoteAddr());
        return R.ok(ipInfo);
    }
}
```

### 8. LocalThreadHelper - 本地线程上下文工具类

基于 `ThreadLocal<ConcurrentHashMap>` 的多 Key 泛型线程上下文，用于请求级数据传递（如用户信息、traceId 等）：

| 方法 | 说明 |
|------|------|
| `set(String key, T value)` | 设置当前线程指定 key 的值 |
| `get(String key)` | 获取指定 key 的值，不存在返回 null |
| `getOrElse(String key, Supplier<T>)` | 获取值，不存在时使用默认值提供器 |
| `contains(String key)` | 是否存在指定 key |
| `remove(String key)` | 删除指定 key |
| `clear()` | 清除当前线程全部上下文（必须调用，防止内存泄漏） |
| `getContextMap()` | 当前线程上下文的只读快照 |

```java
import com.wkclz.web.helper.LocalThreadHelper;
import org.springframework.web.bind.annotation.*;

@RestController
public class ThreadContextController {

    @GetMapping("/user/profile")
    public R<UserProfile> getUserProfile() {
        // 获取线程变量
        String requestId = LocalThreadHelper.get("requestId");
        Long userId = LocalThreadHelper.get("userId");

        // 带默认值获取
        String traceId = LocalThreadHelper.getOrElse("traceId", () -> "default-trace");

        UserProfile profile = userService.getProfile(userId);
        return R.ok(profile);
    }
}
```

### 9. Bean 数据对象 - 请求响应基础类

sh-web 提供一组通用请求响应数据对象，位于 `com.wkclz.web.bean` 包下，用于标准化 API 请求和响应格式。

#### 9.1 IdReq - 主键 ID 请求

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
| id | Long | 是 | 主键ID（`@NotNull`） |

#### 9.2 PageReq - 分页请求

实现 `Pageable` 接口（sh-core），调用 `init()` 后 `current` / `size` 非法值回退默认值（默认 1 / 10）并计算 `offset`：

```java
import com.wkclz.web.bean.PageReq;
import com.wkclz.core.base.PageData;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @GetMapping("/list")
    public R<PageData<UserResponse>> getUserList(PageReq req) {
        req.init();
        PageData<UserEntity> page = userService.queryPage(req);
        return R.ok(PageData.convert(page, convertList(page.getRecords())));
    }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| current | Long | 否 | 分页页码，默认 1 |
| size | Long | 否 | 分页大小，默认 10 |
| offset | Long | - | 偏移量，由 `init()` 按 `(current - 1) * size` 计算（隐藏字段） |

**分页响应**使用 sh-core 的 `PageData<T>`：字段含 `current` / `size` / `offset` / `total` / `count` / `records`，提供 `of(...)`、`empty()`、`fromEntity(...)`、`convert(...)` 等静态方法。

#### 9.3 UpdateReq - 更新请求

包含乐观锁版本号：

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
| id | Long | 是 | 主键ID（`@NotNull`） |
| version | Integer | 是 | 数据版本（乐观锁，`@NotNull`） |

#### 9.4 RemoveReq - 删除请求

支持单条和批量删除，通过类级注解 `@AtLeastOneNotNull(fields = {"id", "ids"})` 校验 `id` 与 `ids` 至少填写一个：

```java
import com.wkclz.web.bean.RemoveReq;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @DeleteMapping("/remove")
    public R<Void> removeUser(@Valid @RequestBody RemoveReq req) {
        // getAllIds()：合并 id 与 ids，自动去重、忽略 null
        userService.remove(req.getAllIds());
        return R.ok();
    }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 二选一 | 单个主键ID |
| ids | List\<Long\> | 二选一 | 主键ID列表（批量删除） |

**验证规则：** `id` 和 `ids` 必须至少填写一个（`@AtLeastOneNotNull`，空串、空集合、空数组均视为无效）。

#### 9.5 EntityResp - 实体响应

通用实体响应基类，包含审计字段（含 `sort` 排序、`remark` 备注及姓名回填字段）：

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
| sort | Integer | 排序 |
| createTime | LocalDateTime | 创建时间 |
| createBy | String | 创建人code |
| createByName | String | 创建人姓名（由 `UserNameBodyAdvice` 回填） |
| updateTime | LocalDateTime | 更新时间 |
| updateBy | String | 更新人code |
| updateByName | String | 更新人姓名（由 `UserNameBodyAdvice` 回填） |
| remark | String | 备注 |
| version | Integer | 数据版本 |

#### 9.6 C 端基类 - ConsumerResp / ConsumerPageReq

位于 `com.wkclz.web.bean.customer` 包，面向小程序 / H5 / App 等消费者端，仅含主键 ID，避免带出审计字段：

```java
import com.wkclz.web.bean.customer.ConsumerResp;

// C 端实体响应
public class ConsumerUserResp extends ConsumerResp {
    private String nickname;
    private String avatar;
    // getter/setter
}
```

| 类 | 字段 | 说明 |
|------|------|------|
| `ConsumerResp` | id（Long） | C 端响应基类 |
| `ConsumerPageReq` | id（Long） | C 端请求基类 |

#### 9.7 RestInfo / RestParam / RestField - 接口元数据

用于描述 REST 接口文档的结构化元数据，由 `RestHelper` / `RestAnnotationHelper` 生成。

**RestInfo 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| clazz | Class\<?\> | 控制器类 |
| appCode | String | 应用编码 |
| code | String | 接口编码 |
| module | String | 模块名称（来自 `@Router`） |
| method | String | HTTP 方法（GET/POST/PUT/DELETE） |
| uri | String | 请求 URI |
| name | String | 接口名称 |
| desc | String | 接口描述 |
| writeFlag | Integer | 写操作标识（URI 含 `/public/` 为 1，否则 0） |
| parameters | List\<RestParam\> | 参数列表 |
| returnType | String | 返回类型（完整类名） |
| returnGenericInfo | String | 返回类型泛型信息（JSON） |
| tag | String | 类级 `@Tag` 描述 |
| operationSummary | String | 方法级 `@Operation(summary)` |
| operationDescription | String | 方法级 `@Operation(description)` |
| deprecated | Boolean | 是否废弃（`@Operation(deprecated)`） |
| returnSchema | String | 返回值完整结构（JSON，含字段注释与示例值） |
| consumes | String[] | 请求 Content-Type |
| produces | String[] | 响应 Content-Type |

**RestParam 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 参数名称 |
| type | String | 参数类型（完整类名） |
| annotationType | String | 注解类型（RequestBody / PathVariable / RequestParam / Parameter） |
| required | Boolean | 是否必需 |
| defaultValue | String | 参数默认值（仅 `@RequestParam` 支持） |
| genericTypes | List\<String\> | 泛型参数类型列表 |
| description | String | 参数描述（来自 `@Schema.description`） |
| example | String | 参数示例值（来自 `@Schema.example`） |
| requiredMode | String | 参数必填模式（来自 `@Schema.requiredMode`） |
| fields | List\<RestField\> | 复杂参数类型的字段结构（递归扫描） |

**RestField 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 字段名称 |
| type | String | 字段类型（完整类名） |
| description | String | 字段描述（来自 `@Schema.description`） |
| example | String | 示例值（来自 `@Schema.example`） |
| required | Boolean | 是否必填（来自 `@Schema.requiredMode`） |
| genericTypes | List\<String\> | 泛型参数类型列表 |
| fields | List\<RestField\> | 子字段（非简单类型递归扫描） |
| selfReferencing | Boolean | 是否自引用类型（防止无限递归） |
| simpleType | Boolean | 是否为简单类型 |

### 10. @AtLeastOneNotNull - 自定义校验注解

类级校验注解（`@Target({ElementType.TYPE})`），用于校验指定字段至少一个有效：

```java
@AtLeastOneNotNull(fields = {"id", "ids"}, message = "id 或 ids 必须填写其中一个")
public class RemoveReq implements Serializable { ... }
```

**校验规则：**
- `fields()` 声明需要校验的字段名数组
- 任一字段非空即通过；空串、空集合、空数组均视为无效
- 用于 `@Valid` / `@Validated` 校验流程，校验失败抛出 `ConstraintViolationException`（HTTP 400）

## 🎯 最佳实践

### 1. 统一异常处理实践

```java
import com.wkclz.core.exception.CommonException;

// 自定义业务异常继承 CommonException
public class OrderException extends CommonException {
    public OrderException(String message) {
        super(message);
    }

    public OrderException(int code, String message) {
        super(code, message);
    }
}

@Service
public class OrderService {

    public Order createOrder(OrderRequest request) {
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new OrderException(4001, "订单金额无效");
        }

        return orderRepository.save(convertToOrder(request));
    }
}
```

### 2. 请求日志记录

```java
import com.wkclz.web.helper.LocalThreadHelper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

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

            // 清理线程变量，防止内存泄漏
            LocalThreadHelper.clear();
        }
    }
}
```

### 3. 分页查询实践

```java
import com.wkclz.web.bean.PageReq;
import com.wkclz.core.base.PageData;

@Service
public class UserService {

    public PageData<User> queryPage(PageReq req) {
        req.init();
        List<User> records = userMapper.selectPage(req);
        Long total = userMapper.selectCount(req);
        return PageData.of(records, total, req.getCurrent(), req.getSize());
    }
}
```

### 4. 安全最佳实践

```java
import com.wkclz.web.helper.IpHelper;
import com.wkclz.core.exception.CommonException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
public class SecurityController {

    // IP 限流
    @GetMapping("/api/public/data")
    public R<String> getPublicData(HttpServletRequest request) {
        String clientIp = IpHelper.getOriginIp(request);

        // 检查 IP 访问频率
        if (rateLimitService.isRateLimited(clientIp)) {
            throw CommonException.of(429, "访问过于频繁，请稍后再试");
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

### 2. 异常告警邮件

ErrorHandler 在捕获到非 `UserException` 异常且开启告警时，自动发送异常通知邮件（配置见「ErrorHandler」章节）。

## 🐛 常见问题

### Q1: 异常堆栈会泄露给客户端吗？
**不会。** ErrorHandler 兜底处理时不向客户端暴露堆栈信息：未识别的异常返回通用错误消息（`message` 为空时返回 `Internal Server Error`），完整堆栈仅在服务端日志中记录；业务方可通过 `CommonException` / `UserException` 控制返回给客户端的错误消息。

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
| 最新 | - | 与 sh-web 当前源码同步：新增响应用户名回填（UserNameBodyAdvice）、RemoveReq 批量删除校验、REST 元数据扩展（RestParam/RestField/returnSchema）等 |

---

**提示**：本文档基于 sh-web 最新源码编写，具体 API 可能随版本更新而变化，请参考实际代码和版本说明。
