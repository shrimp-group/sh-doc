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
│   │       │   ├── dto/              # 数据传输对象
│   │       │   └── vo/               # 视图对象
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
| model/dto | 数据传输对象 | 请求和响应的数据结构 |
| model/vo | 视图对象 | 面向视图层的数据结构 |
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
├── dto/              # 数据传输对象
│   ├── request/      # 请求参数对象
│   │   ├── UserCreateRequest.java
│   │   ├── UserUpdateRequest.java
│   │   ├── UserQueryRequest.java
│   │   └── OrderCreateRequest.java
│   └── response/     # 响应结果对象
│       ├── UserResponse.java
│       ├── UserDetailResponse.java
│       ├── OrderResponse.java
│       └── PageResponse.java
└── vo/               # 视图对象，用于前端展示
    ├── UserVO.java
    ├── UserSimpleVO.java
    ├── OrderVO.java
    └── DashboardVO.java
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

### DTO（数据传输对象）

| 类型 | 说明 | 示例 |
|------|------|------|
| Request | 接收前端请求参数 | `UserCreateRequest`、`UserQueryRequest` |
| Response | 返回给前端的数据 | `UserResponse`、`PageResponse` |

#### Request 对象规范

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| XxxCreateRequest | 创建请求 | 新增数据时使用 |
| XxxUpdateRequest | 更新请求 | 修改数据时使用 |
| XxxQueryRequest | 查询请求 | 分页列表、详情查询时使用 |
| XxxBatchRequest | 批量操作请求 | 批量删除、批量更新时使用 |

#### Response 对象规范

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| XxxResponse | 单个对象响应 | 详情接口 |
| XxxListResponse | 列表响应 | 列表接口（不带分页） |
| PageResponse | 分页响应 | 分页接口 |

**分页响应示例：**
```java
@Data
public class PageResponse<T> {
    private Integer current;   // 当前页码
    private Integer size;      // 每页条数
    private Integer page;     // 总页码数
    private Long total;       // 数据总条数
    private Long offset;      // 偏移量
    private List<T> rows;     // 数据列表
}
```

### VO（视图对象）

| 特点 | 说明 |
|------|------|
| 面向视图 | 主要用于前端展示 |
| 按需定制 | 根据页面需求定制字段 |
| 可以组合 | 可以组合多个 Entity 或 DTO 的字段 |

**示例：**
```java
@Data
public class UserVO {
    private Long id;
    private String userCode;
    private String username;
    private String nickname;
    private String email;
    private String phone;
    private String statusName;    // 状态中文名
    private String createTimeStr; // 格式化后的创建时间
    private List<String> roles;   // 用户角色列表
}
```

### Entity、DTO、VO 的区别

| 维度 | Entity | DTO | VO |
|------|--------|-----|-----|
| 用途 | 数据库映射 | 数据传输 | 视图展示 |
| 层次 | 数据访问层 | 服务层 | 控制层 |
| 字段 | 与表完全一致 | 按接口需求 | 按页面需求 |
| 业务 | 无 | 可有 | 可有 |
| 校验 | 无 | 有 | 无 |
