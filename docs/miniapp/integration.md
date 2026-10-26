# 功能集成

sh-miniapp 后端由业务模块 `sh-miniapp-biz` 与启动器 `sh-miniapp-starter` 组成：业务模块以 Spring Boot 自动配置方式接入，启动器用于独立部署。

## 添加依赖

在业务工程的 `pom.xml` 中添加依赖（parent 为 `com.wkclz.framework:sh-parent`，版本由 `${revision}` 统一管理）：

```xml
<dependency>
    <groupId>com.wkclz.miniapp</groupId>
    <artifactId>sh-miniapp-biz</artifactId>
    <version>${revision}</version>
</dependency>
```

模块的传递依赖：

| 依赖 | 说明 |
|--------|------|
| `com.wkclz.framework:sh-mybatis` | 数据访问框架 |
| `com.wkclz.iam:iam-session` | 登录会话与鉴权 |
| `com.github.binarywang:weixin-java-miniapp` | WxJava 微信小程序 SDK |
| `com.wkclz.microapp:micro-fileos` | 文件上传与签名 URL |

依赖引入即生效：`sh-miniapp-biz` 通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 注册 `ShMiniappBizAutoConfig`，完成 `@ComponentScan("com.wkclz.miniapp")` 与 `@MapperScan("com.wkclz.miniapp.mapper")` 装配，无需额外配置类。

## 启动器引入

独立部署时引入启动器模块，内含启动类 `com.wkclz.miniapp.MiniappApplication` 与各环境配置（`application.yml` / `-dev` / `-prod`）：

```xml
<dependency>
    <groupId>com.wkclz.miniapp</groupId>
    <artifactId>sh-miniapp-starter</artifactId>
    <version>${revision}</version>
</dependency>
```

启动器为可运行 jar（spring-boot-maven-plugin 打包），仅承担装配职责，install/deploy 均已跳过；集成到已有工程时无需引入。

## 数据库初始化

模块不自动建表，需按 DDL 手工创建 `miniapp_` 前缀的数据表（用户、Banner、通知、快捷入口、内容流、分类、热门搜索、消息、消息模板、推送记录、用户消息、收藏、浏览记录、登录记录、微信配置），DDL 见 sh-miniapp 工程 `docs/design/database-ddl.md`。

## 配置项

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/sh_miniapp?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver
  data:
    redis:
      host: localhost
      port: 6379

iam:
  session:
    token:
      secret-key: change-me-in-real-env
    white-list: /miniapp/public/**,/admin/public/**

miniapp:
  wx-config:
    secret-key: change-me-in-real-env
```

| 配置项 | 是否必填 | 默认值 | 说明 |
|--------|----------|--------|------|
| `spring.datasource.*` | 是 | - | MySQL 数据源 |
| `spring.data.redis.*` | 是 | - | Redis；WxMaService 的 access_token 存储于此，集群节点共享 |
| `iam.session.token.secret-key` | 是 | - | iam-session 令牌密钥 |
| `iam.session.white-list` | 否 | - | 免鉴权路径，需放行 `/miniapp/public/**`（登录、公开配置、微信回调） |
| `miniapp.wx-config.secret-key` | 否 | 空串 | 微信 appSecret 的 AES 加解密密钥（`WxConfigProperties`），缺省为空串保持明文兼容 |

### 微信小程序配置

微信 appId / secret 不写在配置文件中，而是存于 `miniapp_wx_config` 表，通过管理端 `/miniapp-admin/wx-config/*` 按租户维护：

| 字段 | 说明 |
|------|------|
| `tenantCode` | 租户编码，一套后端按租户托管多个小程序实例 |
| `appId` / `appSecret` | 小程序凭证；appSecret 以上述 `secret-key` 加密存储，接口统一返回掩码 `******` |
| `token` / `encodingAesKey` | 消息推送回调验签参数（微信后台配置），明文存储 |

配置由 `WxMaServiceManager` 按 `tenantCode` 懒加载构建 WxMaService 实例；配置变更后失效对应租户的实例缓存并重建。

## SPI 扩展：UserInfoExtSpi

外部系统实现 `com.wkclz.miniapp.spi.UserInfoExtSpi` 并注册为 Spring Bean（`@Component`），即可向用户概览接口 `GET /miniapp/user/overview` 的返回结果追加自定义键值对，用于补充积分、会员等级等外部系统数据：

- 内置字段：`avatarModified`、`mobileBound`、`unreadMsgCount`、`cartCount`（cartCount 默认 0，预留给 SPI 覆盖）
- 同名键以 SPI 返回值为准；覆盖内置字段时后端记录 warn 日志
- 返回 null 忽略；单个 SPI 抛异常时隔离跳过，不阻断接口

示例代码：

```java
/**
 * 用户概览扩展：追加积分信息
 */
@Component
public class PointUserInfoExtSpi implements UserInfoExtSpi {

    @Autowired
    private PointService pointService;

    @Override
    public Map<String, Object> extend(MiniappUser user) {
        Map<String, Object> ext = new HashMap<>();
        ext.put("pointCount", pointService.countByUserCode(user.getUserCode()));
        return ext;
    }
}
```

## 注意事项

1. 技术栈为 Java 25 / Spring Boot / MyBatis / WxJava，接入工程需与 sh-parent 体系版本对齐
2. 回调路径 `/miniapp/public/callback/{appId}` 必须保持在 iam 白名单内，否则微信服务器无法回调
3. 多小程序托管时，每个租户需在管理端维护一条微信配置；access_token 的 Redis key 为 `wx:ma:token:{tenantCode}`
