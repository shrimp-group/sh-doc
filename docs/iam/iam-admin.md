# 管理后台

IAM-Admin 是 4A 权限系统的管理端模块，负责 RBAC 治理（用户 / 角色 / 菜单 / 应用）与 API 权限治理（API 路由、访问密钥、字段级响应控制），同时是权限缓存体系的变更发布入口。

- 依赖坐标：`com.wkclz.iam:iam-admin`（版本随工程 `${revision}` 管理）
- 自动装配：`IamAdminAutoConfig` 声明 `@AutoConfiguration`，扫描 `com.wkclz.iam.admin` 包与 `admin.mapper`，引入依赖即生效
- 依赖模块：`iam-portal`（传递会话鉴权等基础能力）

```xml
<dependency>
    <groupId>com.wkclz.iam</groupId>
    <artifactId>iam-admin</artifactId>
</dependency>
```

## 路由前缀

对外接口统一通过 `@Router(module = "iam-admin", prefix = "/iam-admin")` 暴露，全部路由常量集中在 `Route` 接口维护，前缀为 `/iam-admin`。

## 功能矩阵

| 功能域 | 能力说明 |
| ---- | ---- |
| 用户管理 | 分页 / 详情 / 创建 / 更新 / 删除（`/user/*`） |
| 用户认证方式 | 用户认证方式列表 / 详情 / CRUD；重置密码（`/user-auth/*`） |
| 应用管理 | 应用分页 / 详情 / 创建 / 更新 / 删除 / 选项列表（`/app/*`） |
| 角色管理 | 列表 / 树形 / 详情 / 创建 / 更新 / 删除；roleCode 创建后不可修改；存在子角色时禁止删除（提示"请先删除子角色"）（`/role/*`） |
| 用户角色关联 | 用户角色列表 / 绑定 / 解绑 / 用户角色树 / 用户菜单来源查询（`/user-role/*`） |
| 角色用户关联 | 角色下用户分页 / 绑定 / 解绑（`/role-user/*`） |
| 菜单管理 | 列表 / 树形 / 详情 / 详情页（含绑定角色、绑定用户）/ 创建 / 更新 / 删除 / 导出 / 导入（`/menu/*`）；导出支持勾选子树（递归含子孙）或按应用全量；导入按 menuCode 存在即更新、不存在新增，绑定关系全量快照重建，全程无删除 |
| 角色菜单关联 | 角色菜单列表 / 保存（全量快照）/ 查询菜单已绑定角色（`/role-menu/*`） |
| 用户菜单 | 查询当前登录用户的菜单列表 / 菜单树，userCode 取自登录上下文（`/user-menu/*`） |
| 角色数据权限 | 角色数据权限列表 / 绑定 / 解绑（`/role-data/*`） |
| 数据权限维度 | 分页 / 详情 / 创建 / 更新 / 删除 / 选项列表 / 导出 / 导入；导入按 dimensionCode 幂等，全程无删除（`/data-dim/*`） |
| API 路由管理 | 分页 / 详情 / 详情页 / 创建 / 更新 / 删除 / 选项列表（`/api/*`）；自动扫描同步（`/api/sync`，启动与手动同步共用 `RestfulScan`）；按条件扫描运行时 REST 接口并标记是否已在库（`/api/scan`）；批量新增（逐条校验 method+uri 全局唯一）；复制 / 粘贴；接口文档查询（`/api/doc`）；导出（勾选项或按筛选全量）/ 导入（按 apiCode 幂等，全程无删除）；白名单标识（writeFlag，免登录可直接访问）；字段级响应控制 HIDDEN / MASK / READ_ONLY |
| API 字段权限 | 按接口查询字段权限 / 字段创建 / 更新 / 删除；action 为 MASK 时 maskRule 必填（`/api-field/*`） |
| 菜单-API 关联 | 菜单绑定 API 列表 / 绑定 / 解绑 / 已绑定清单（`/menu-api/*`） |
| 实体字段分析 | 解析实体字段树，供字段权限配置使用（`/entity-field/resolve`） |
| 菜单字段关系 | 菜单字段列表 / 绑定 / 保存 / 解绑（`/menu-field/*`） |
| 访问密钥管理 | AK 分页 / 详情 / 创建 / 更新 / 删除（`/access-key/*`） |
| 访问密钥-API 关联 | AK 授权 API 列表 / 绑定 / 解绑（`/access-key-api/*`） |
| 审计日志 | 登录日志分页 / 详情（`/login-record/*`）；请求日志分页 / 详情（`/request-record/*`） |

## 配置说明

```yaml
iam:
  api:
    scan:
      enabled: 0    # API 自动扫描开关，1 开启，默认 0 关闭
      insert: 0     # 扫描结果是否入库，1 入库，默认 0 仅打印待插入 SQL 清单
```

- `RestfulScan` 实现 `ApplicationRunner`：启用后应用启动时将运行时 REST 映射与 `iam_api` 表比对（key = method_uri），完成新增、更新（接口名 / 模块）与过期清理；管理端"API 同步"接口复用同一逻辑
- `insert = 0` 时扫描结果不入库，仅日志输出待插入 SQL 清单，供人工确认

## 权限缓存与权限判断

管理端是权限数据的唯一维护入口，也是权限缓存失效的变更发布源：

- 角色、菜单、API、字段、应用、用户角色等 Service 在 create / update / remove / import 等变更操作事务提交后（AFTER_COMMIT）发布 `PermissionChangeEvent`
- 事件经 Redis 双写（Pub/Sub + 变更日志）通知各应用清理权限缓存，指令带时间戳去重，多实例幂等
- 变更粒度两类：`APP_STATIC`（应用静态资源：角色 / 菜单 / API / 字段 / 应用信息）、`USER`（用户角色绑定，精确到用户）
- 运行侧三级权限缓存与按 URL 权限判断由 iam-session 承担（`AuthCacheManager` / `AuthPermissionService`），管理端不参与运行期判定

## 数据权限维度

- 维度模型（`iam_data_dimension`）：应用编码 + 维度编码 + 维度名称 + 维度数据 JSON（优先于脚本）+ 维度脚本（优先级低）
- 授权方式：通过角色数据权限关联（`/role-data/bind|unbind`）将维度绑定到角色，按"角色 + 维度"控制数据范围
- 维度定义支持导出 / 导入，跨环境迁移按 dimensionCode 幂等
