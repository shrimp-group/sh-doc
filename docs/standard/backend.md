# 后端规范

## 项目结构

### 标准项目结构

```
backend/                              # Maven 父工程
├── pom.xml                           # 父工程依赖管理
├── README.md
├── module-client/                    # 客户端模块（可选）
│   ├── src/main/java/com/example/
│   │   └── client/
│   │       ├── bean/                 # 请求/响应数据对象
│   │       │   ├── Request.java
│   │       │   └── Response.java
│   │       ├── exception/            # 异常定义
│   │       │   └── ClientException.java
│   │       ├── helper/               # 业务辅助类
│   │       │   └── ClientHelper.java
│   │       ├── utils/                # 工具类
│   │       │   └── ClientUtils.java
│   │       └── Client.java           # 客户端入口
│   └── pom.xml
├── module-server/                    # 服务端核心模块
│   ├── src/main/java/com/example/
│   │   └── server/
│   │       ├── config/               # 配置类
│   │       │   ├── WebConfig.java
│   │       │   ├── SecurityConfig.java
│   │       │   └── OpenApiConfig.java
│   │       ├── constant/             # 常量定义
│   │       │   └── BusinessConstant.java
│   │       ├── enumeration/          # 枚举类
│   │       │   └── StatusEnum.java
│   │       ├── exception/            # 异常处理
│   │       │   ├── BusinessException.java
│   │       │   └── GlobalExceptionHandler.java
│   │       ├── helper/               # 业务辅助类
│   │       │   └── BusinessHelper.java
│   │       ├── interceptor/          # 拦截器
│   │       │   ├── AuthInterceptor.java
│   │       │   └── LogInterceptor.java
│   │       ├── mapper/               # 数据访问层（MyBatis）
│   │       │   ├── UserMapper.java
│   │       │   └── OrderMapper.java
│   │       ├── model/                # 数据模型
│   │       │   ├── entity/           # 数据库实体
│   │       │   ├── req/              # 请求对象
│   │       │   └── resp/             # 响应对象
│   │       ├── rest/                 # REST 控制层
│   │       ├── service/              # 业务逻辑层
│   │       ├── util/                 # 工具类
│   │       └── ServerConfig.java     # 服务端配置
│   ├── src/main/resources/
│   │   ├── META-INF/spring/
│   │   ├── mapper/                   # MyBatis XML
│   │   └── application.yml
│   └── pom.xml
└── module-starter/                   # 启动器模块（可选）
    ├── src/main/java/com/example/
    │   └── starter/
    │       └── Application.java
    └── pom.xml
```

### 目录职责说明

| 目录/包名 | 职责 | 说明 |
|-----------|------|------|
| bean | 请求/响应对象 | 客户端模块的数据传输对象 |
| config | 配置类 | Spring 配置类，如 WebConfig、SecurityConfig |
| constant | 常量定义 | 业务常量、错误码常量 |
| enumeration | 枚举类 | 状态枚举、业务枚举 |
| exception | 异常处理 | 自定义异常和全局异常处理器 |
| helper | 业务辅助类 | 封装复杂业务逻辑的辅助方法 |
| interceptor | 拦截器 | 请求拦截、权限校验、日志记录 |
| mapper | 数据访问层 | MyBatis Mapper 接口 |
| model/entity | 数据库实体 | 与数据库表直接映射的实体类 |
| model/req | 请求对象 | 接收前端请求参数的数据结构 |
| model/resp | 响应对象 | 返回给前端响应结果的数据结构 |
| rest | REST 控制层 | REST API 控制器，处理 HTTP 请求 |
| service | 业务逻辑层 | 业务接口定义和实现 |
| util | 工具类 | 通用工具方法，如加密、日期处理 |

### 核心包结构详解

#### 1. config 包

```
config/
├── WebConfig.java        # Web 配置（跨域、拦截器等）
├── SecurityConfig.java   # 安全配置
└── OpenApiConfig.java    # Swagger/OpenAPI 配置
```

#### 2. service 包

```
service/
├── UserService.java      # 接口定义
├── OrderService.java
└── impl/                # 实现类
    ├── UserServiceImpl.java
    └── OrderServiceImpl.java
```

#### 3. rest 包

```
rest/
├── UserController.java   # 用户相关接口
└── OrderController.java  # 订单相关接口
```

#### 4. model 包

详细内容请查看：[Model 模型详解](#model-模型详解)

## 代码风格

### 文件命名

- **类名**：使用 PascalCase
- **方法名**：使用 camelCase
- **变量名**：使用 camelCase
- **常量名**：使用 CONSTANT_CASE
- **包名**：使用小写字母，多级包用 `.` 分隔

### 代码缩进

- 使用 **4 个空格**进行缩进
- 避免使用 Tab 字符

### 文件编码

- 统一使用 **UTF-8** 编码

## 接口设计

接口设计规范请查看：[API 规范 - 接口命名规范](./api.md#接口命名规范)

## 异常处理

### 自定义异常

- 定义业务异常类 `BusinessException`
- 统一异常处理使用 `@RestControllerAdvice` 全局拦截

### 错误响应格式

```json
{
  "code": 500,
  "message": "Internal Server Error",
  "detail": "具体错误信息",
  "timestamp": 1620000000000
}
```

## 日志记录

- 使用 **SLF4J + Logback** 作为日志框架
- 合理使用日志级别：DEBUG、INFO、WARN、ERROR
- 避免记录敏感信息（密码、Token 等）
- 在关键业务节点记录日志

## 最佳实践

- 遵循单一职责原则，每个类只负责一项功能
- 使用 DTO 进行数据传输，避免直接暴露实体
- 参数校验使用 `@Valid` 注解
- 事务管理使用 `@Transactional` 注解
- 编写单元测试和集成测试
- 使用 Lombok 简化代码
- 遵循依赖倒置原则，依赖抽象而非具体实现

## Model 模型详解

### model 包结构

```
model/
├── entity/           # 数据库实体，与表结构一一对应
│   ├── UserEntity.java
│   └── OrderEntity.java
├── req/              # 请求对象，接收前端请求参数
│   ├── UserCreateReq.java
│   ├── UserUpdateReq.java
│   ├── UserQueryReq.java
│   └── OrderCreateReq.java
└── resp/             # 响应对象，返回给前端的数据
    ├── UserResp.java
    ├── UserDetailResp.java
    ├── OrderResp.java
    └── PageResp.java
```

### Entity（实体类）

| 特点 | 说明 |
|------|------|
| 与表对应 | 一个 Entity 类对应数据库中的一张表 |
| 属性对应列 | 类的属性对应表中的列 |
| 使用注解 | 使用 MyBatis-Plus 或 JPA 注解映射 |
| 不包含业务 | 仅包含数据，不包含业务逻辑 |

**示例：**
```java
@Data
@TableName("sys_user")
public class UserEntity {
    private Long id;
    private String userCode;
    private String username;
    private String nickname;
    private String email;
    private String phone;
    private Integer status;
    private Integer sort;
    private Long createBy;
    private LocalDateTime createTime;
    private Long updateBy;
    private LocalDateTime updateTime;
    private String remark;
    private Integer version;
}
```

### Req（请求对象）

请求对象用于接收前端传入的参数，统一存放在 `model/req` 包下。

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| XxxCreateReq | 创建请求 | 新增数据时使用 |
| XxxUpdateReq | 更新请求 | 修改数据时使用 |
| XxxQueryReq | 查询请求 | 分页列表、详情查询时使用 |
| XxxBatchReq | 批量操作请求 | 批量删除、批量更新时使用 |

**Req 对象命名规范：**
- 类名以 `Req` 结尾，如 `UserCreateReq`
- 统一放在 `model/req` 包下
- 必须添加参数校验注解

**Req 对象继承规范：**

请求对象应优先继承 sh-web 提供的基础类：

| 基础类 | 包路径 | 适用场景 |
|--------|--------|----------|
| `IdReq` | `com.wkclz.web.bean.IdReq` | 根据ID查询详情 |
| `PageReq` | `com.wkclz.web.bean.PageReq` | 分页查询 |
| `UpdateReq` | `com.wkclz.web.bean.UpdateReq` | 更新操作（含乐观锁） |
| `RemoveReq` | `com.wkclz.web.bean.RemoveReq` | 删除操作（支持批量） |

**示例：**
```java
import com.wkclz.web.bean.UpdateReq;
import jakarta.validation.constraints.NotBlank;

@Data
public class UserUpdateReq extends UpdateReq {

    @NotBlank(message = "用户名不能为空")
    private String username;

    private String email;

    private String phone;
}
```

### Resp（响应对象）

响应对象用于返回给前端的数据，统一存放在 `model/resp` 包下。

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| XxxResp | 单个对象响应 | 详情接口 |
| XxxListResp | 列表响应 | 列表接口（不带分页） |
| PageResp | 分页响应 | 分页接口 |

**Resp 对象命名规范：**
- 类名以 `Resp` 结尾，如 `UserResp`
- 统一放在 `model/resp` 包下

**Resp 对象继承规范：**

响应对象应优先继承 sh-web 提供的基础类：

| 基础类 | 包路径 | 适用场景 |
|--------|--------|----------|
| `EntityResp` | `com.wkclz.web.bean.EntityResp` | 实体响应（含审计字段） |

**示例：**
```java
import com.wkclz.web.bean.EntityResp;

@Data
public class UserResp extends EntityResp {

    private String userCode;
    private String username;
    private String nickname;
    private String email;
    private String phone;
    private String statusName;
}
```

**分页响应示例：**
```java
@Data
public class PageResp<T> {
    private Integer current;   // 当前页码
    private Integer size;      // 每页条数
    private Integer page;     // 总页码数
    private Long total;       // 数据总条数
    private Long offset;      // 偏移量
    private List<T> rows;     // 数据列表
}
```

### Entity、Req、Resp 的区别

| 维度 | Entity | Req | Resp |
|------|--------|-----|------|
| 用途 | 数据库映射 | 接收请求参数 | 返回响应数据 |
| 层次 | 数据访问层 | 控制层 | 控制层 |
| 字段 | 与表完全一致 | 按接口输入需求 | 按接口输出需求 |
| 业务 | 无 | 可有 | 可有 |
| 校验 | 无 | 必须有 | 无 |
| 继承 | - | 优先继承 sh-web 的 Req 类 | 优先继承 sh-web 的 Resp 类 |

### sh-web Bean 类使用规范

所有请求和响应对象必须遵循以下规范：

**Req 对象：**
1. 查询详情接口：优先直接使用 `IdReq` 或继承它
2. 分页查询接口：优先直接使用 `PageReq` 或继承它
3. 更新接口：必须继承 `UpdateReq`（自动包含 id 和 version）
4. 删除接口：优先直接使用 `RemoveReq`（支持单条和批量）
5. 新增接口：根据业务需求自定义，无需继承基础类

**Resp 对象：**
1. 实体查询响应：必须继承 `EntityResp`（自动包含审计字段）
2. 列表响应：根据业务需求自定义
3. 分页响应：使用 `PageResp<T>` 泛型

**使用示例：**

```java
// Controller 示例
@RestController
@RequestMapping("/api/user")
public class UserController {

    @GetMapping("/detail")
    public R<UserResp> getUserDetail(@Valid IdReq req) {
        UserEntity user = userService.getById(req.getId());
        return R.ok(convertToResp(user));
    }

    @GetMapping("/list")
    public R<PageResp<UserResp>> getUserList(UserQueryReq req) {
        Page<UserEntity> page = userService.queryPage(req);
        return R.ok(convertToPageResp(page));
    }

    @PutMapping("/update")
    public R<UserResp> updateUser(@Valid @RequestBody UserUpdateReq req) {
        UserEntity user = userService.update(req);
        return R.ok(convertToResp(user));
    }

    @DeleteMapping("/remove")
    public R<Void> removeUser(@Valid @RequestBody RemoveReq req) {
        userService.remove(req);
        return R.ok();
    }
}
```
