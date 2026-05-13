# 独立服务使用说明 - Generator-Server-Starter

Generator-Server-Starter 是代码生成系统的独立可执行版本，您可以直接下载运行，无需集成到现有应用中。

## 什么是 Generator-Server-Starter？

Generator-Server-Starter 是一个完整的、可独立运行的代码生成服务，它包含：
- **完整的Web应用**：基于Spring Boot的Web应用
- **内置数据库**：使用H2数据库（可选MySQL）
- **管理界面**：提供Web管理界面
- **RESTful API**：完整的API接口

## 使用场景

### 场景1：快速体验代码生成
想要快速体验代码生成功能，不需要复杂的部署。

### 场景2：团队协作平台
为团队提供统一的代码生成服务，所有成员共享模板和配置。

### 场景3：演示和培训
用于演示代码生成功能或进行培训。

### 场景4：CI/CD集成
在CI/CD流程中作为独立服务运行。

## 快速开始

### 1. 下载可执行文件

从以下地址下载最新版本：

```bash
# 方式1：从GitHub Releases下载
curl -L -o generator-server-starter.jar \
  https://github.com/shrimp-group/sh-generator/releases/latest/download/generator-server-starter.jar

# 方式2：从Maven中央仓库下载（如果已发布）
# 或从项目构建产物获取
```

### 2. 运行服务

```bash
# 最简单的运行方式（使用默认配置）
java -jar generator-server-starter.jar

# 指定端口运行
java -jar generator-server-starter.jar --server.port=8080

# 使用外部配置文件
java -jar generator-server-starter.jar --spring.config.location=application.yml
```

### 3. 访问服务

服务启动后，访问以下地址：

- **管理界面**：`http://localhost:8080`（请将 `localhost` 替换为实际服务器地址）
- **API文档**：`http://localhost:8080/swagger-ui.html`（请将 `localhost` 替换为实际服务器地址）
- **健康检查**：`http://localhost:8080/actuator/health`（请将 `localhost` 替换为实际服务器地址）

### 4. 初始登录

首次访问时，使用默认账号登录：
- **用户名**：admin
- **密码**：admin123

**重要**：首次登录后请立即修改密码！

## 详细配置

### 1. 配置文件

创建 `application.yml` 文件进行配置：

```yaml
# 服务配置
server:
  port: 8080
  servlet:
    context-path: /
  compression:
    enabled: true
    mime-types: text/html,text/xml,text/plain,text/css,text/javascript,application/javascript,application/json
    min-response-size: 1024

# 数据库配置（默认使用H2，生产环境建议使用MySQL）
spring:
  # H2数据库配置（开发环境）
  datasource:
    url: jdbc:h2:file:./data/generator;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    username: sa
    password: 
    driver-class-name: org.h2.Driver
  
  # H2控制台（开发环境启用）
  h2:
    console:
      enabled: true
      path: /h2-console
  
  # JPA配置
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        use_sql_comments: true

# 代码生成配置
generator:
  # 临时文件路径
  temp-path: ./temp
  
  # 上传配置
  upload:
    max-file-size: 10MB
    max-request-size: 100MB
  
  # 安全配置
  security:
    # 是否启用安全认证
    enabled: true
    # 默认用户（首次启动时创建）
    default-users:
      - username: admin
        password: admin123
        roles: ADMIN
      - username: user
        password: user123
        roles: USER

# 日志配置
logging:
  level:
    com.wkclz.generator: INFO
  file:
    name: logs/generator.log
  pattern:
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{50} - %msg%n"
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{50} - %msg%n"
```

### 2. 使用MySQL数据库（生产环境）

生产环境建议使用MySQL数据库：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/generator_db?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
    username: generator
    password: your_password
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
      maximum-pool-size: 10
      minimum-idle: 5
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    database-platform: org.hibernate.dialect.MySQL8Dialect
    properties:
      hibernate:
        jdbc.batch_size: 20
        order_inserts: true
        order_updates: true

# 初始化数据库（首次运行）
spring:
  sql:
    init:
      mode: always
      schema-locations: classpath:sql/schema-mysql.sql
      data-locations: classpath:sql/data-mysql.sql
```

### 3. 高级配置

```yaml
# 缓存配置（可选）
spring:
  cache:
    type: redis
    redis:
      time-to-live: 60000
      cache-null-values: false
  
  redis:
    host: localhost
    port: 6379
    password: 
    database: 0

# 邮件配置（用于发送通知）
spring:
  mail:
    host: smtp.example.com
    port: 587
    username: your-email@example.com
    password: your-password
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

# 监控配置
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
```

## 部署方式

### 1. 本地运行（开发环境）

```bash
# 直接运行
java -jar generator-server-starter.jar

# 后台运行
nohup java -jar generator-server-starter.jar > generator.log 2>&1 &
```

### 2. Docker部署

创建 `Dockerfile`：

```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY generator-server-starter.jar app.jar
COPY application.yml application.yml
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

构建和运行：

```bash
# 构建镜像
docker build -t generator-server .

# 运行容器
docker run -d \
  --name generator-server \
  -p 8080:8080 \
  -v ./data:/app/data \
  -v ./logs:/app/logs \
  -v ./temp:/app/temp \
  generator-server
```

### 3. Docker Compose部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  generator-server:
    image: shrimp/generator-server:latest
    container_name: generator-server
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/generator_db
      - SPRING_DATASOURCE_USERNAME=generator
      - SPRING_DATASOURCE_PASSWORD=your_password
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./temp:/app/temp
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    container_name: generator-mysql
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=generator_db
      - MYSQL_USER=generator
      - MYSQL_PASSWORD=your_password
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  mysql-data:
```

启动服务：

```bash
docker-compose up -d
```

### 4. Kubernetes部署

创建 `generator-deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: generator-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: generator-server
  template:
    metadata:
      labels:
        app: generator-server
    spec:
      containers:
      - name: generator-server
        image: shrimp/generator-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: SPRING_DATASOURCE_URL
          valueFrom:
            configMapKeyRef:
              name: generator-config
              key: datasource.url
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        - name: logs-volume
          mountPath: /app/logs
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: generator-data-pvc
      - name: logs-volume
        emptyDir: {}
```

## 管理功能

### 1. 用户管理

服务启动后，您可以通过管理界面管理用户：

- **添加用户**：为团队成员创建账号
- **修改密码**：定期更新密码
- **分配角色**：分配不同的权限
- **禁用用户**：禁用不再需要的账号

### 2. 数据备份

#### 备份数据库
```bash
# H2数据库备份
cp ./data/generator.mv.db ./backup/generator_$(date +%Y%m%d_%H%M%S).mv.db

# MySQL数据库备份
mysqldump -u generator -p generator_db > backup/generator_$(date +%Y%m%d_%H%M%S).sql
```

#### 备份配置文件
```bash
# 备份配置文件
cp application.yml backup/application_$(date +%Y%m%d_%H%M%S).yml

# 备份模板文件
tar -czf backup/templates_$(date +%Y%m%d_%H%M%S).tar.gz ./templates/
```

### 3. 日志管理

服务日志位于 `logs/` 目录：

```bash
# 查看实时日志
tail -f logs/generator.log

# 查看错误日志
grep "ERROR" logs/generator.log

# 按日期分割日志
logrotate -f /etc/logrotate.d/generator
```

### 4. 性能监控

通过以下端点监控服务性能：

```bash
# 健康检查
curl http://<server>:8080/actuator/health

# 性能指标
curl http://<server>:8080/actuator/metrics

# Prometheus指标
curl http://<server>:8080/actuator/prometheus
```

## 使用示例

### 示例1：创建数据源

通过管理界面创建数据源：
1. 登录管理界面
2. 点击【数据源管理】
3. 点击【新增数据源】
4. 填写数据库连接信息
5. 点击【测试连接】
6. 点击【保存】

### 示例2：创建模板

1. 点击【模板管理】
2. 点击【新增模板】
3. 填写模板信息
4. 编写模板内容
5. 点击【保存】

### 示例3：创建项目并生成代码

1. 点击【项目管理】
2. 点击【新增项目】
3. 配置项目信息
4. 点击【任务配置】添加生成任务
5. 点击【生成代码】
6. 下载生成的代码包

## 常见问题

### Q: 服务启动失败怎么办？
**排查步骤：**
1. 检查Java版本（需要JDK 17+）
2. 检查端口是否被占用
3. 检查配置文件格式
4. 查看启动日志

### Q: 忘记密码怎么办？
**解决方法：**
1. 停止服务
2. 删除数据库文件（H2）或重置密码（MySQL）
3. 重新启动服务
4. 使用默认密码登录
5. 立即修改密码

### Q: 如何升级版本？
**升级步骤：**
1. 备份当前数据和配置
2. 停止旧版本服务
3. 下载新版本JAR文件
4. 启动新版本服务
5. 验证功能正常

### Q: 性能不佳怎么办？
**优化建议：**
1. 增加JVM内存：`java -Xmx2g -jar generator-server-starter.jar`
2. 使用MySQL替代H2数据库
3. 启用缓存
4. 调整连接池参数

### Q: 如何配置HTTPS？
**配置步骤：**
```yaml
server:
  port: 8443
  ssl:
    key-store: classpath:keystore.jks
    key-store-password: your_password
    key-alias: tomcat
    key-store-type: JKS
```

## 安全建议

### 1. 生产环境安全配置
- **修改默认密码**：首次启动后立即修改
- **启用HTTPS**：配置SSL证书
- **配置防火墙**：限制访问IP
- **定期备份**：定期备份重要数据

### 2. 访问控制
- **使用强密码**：密码复杂度要求
- **定期更换密码**：定期更新密码
- **限制登录尝试**：防止暴力破解
- **记录访问日志**：记录所有操作

### 3. 数据安全
- **数据库加密**：敏感数据加密存储
- **文件权限**：设置合适的文件权限
- **网络隔离**：生产环境网络隔离
- **安全审计**：定期安全审计

## 维护与监控

### 1. 日常维护
```bash
# 检查服务状态
curl -f http://<server>:8080/actuator/health

# 查看磁盘空间
df -h

# 查看内存使用
free -h

# 查看日志大小
du -sh logs/
```

### 2. 监控告警

配置监控告警规则：
- **服务可用性**：HTTP响应码监控
- **性能指标**：响应时间、内存使用
- **错误率**：错误日志数量
- **磁盘空间**：磁盘使用率

### 3. 故障处理

**常见故障处理：**
1. **服务不可用**：检查进程状态、端口占用
2. **数据库连接失败**：检查数据库服务、网络连接
3. **磁盘空间不足**：清理临时文件、日志文件
4. **内存溢出**：增加JVM内存、优化配置

## 相关资源

- [GitHub仓库](https://github.com/shrimp-group/sh-generator)
- [Docker镜像](https://hub.docker.com/r/shrimp/generator-server)

---

**提示**：生产环境部署前，请务必阅读[安全建议](#安全建议)部分。