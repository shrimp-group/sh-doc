# MQTT 消息队列模块

## 概述

sh-mqtt 是一个基于 Spring Boot 的 MQTT 客户端组件，提供了完整的 MQTT 消息发布/订阅功能。该模块采用注解驱动的设计模式，支持自动配置、SSL/TLS 单向认证、自动重连机制和延迟消息发送等功能。

## 核心价值

- **开箱即用**：通过 `MqttAutoConfigure` 自动扫描注册，零配置即可使用
- **注解驱动**：`@MqttController` + `@MqttTopicMapping` 声明式定义消息处理器
- **自动重连**：网络异常时自动恢复连接，重连成功后自动重新订阅
- **SSL/TLS 支持**：基于 CA 证书的单向认证，保障数据传输安全
- **延迟发送**：支持单条与批量延迟消息发送，默认 QoS 1
- **线程安全**：共享调度线程池管理延迟发送任务

## 快速开始

### 1. 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.framework</groupId>
    <artifactId>sh-mqtt</artifactId>
    <version>${revision}</version>
</dependency>
```

### 2. 基础配置

```yaml
shrimp:
  cloud:
    mqtt:
      enabled: true
      username: admin
      password: password123
      end-point: tcp://127.0.0.1:1883
      client-id-prefix: myapp
      keep-alive-interval: 60
```

### 3. 创建消息消费者

`@MqttController` 自带 `@Component` 注解，标注后即自动注册为 Spring Bean：

```java
@Slf4j
@MqttController("sensor")
public class SensorMessageHandler {

    @MqttTopicMapping("temperature")
    public void handleTemperature(MqttHexMsg msg) {
        String data = new String(msg.getPayload(), StandardCharsets.UTF_8);
        log.info("收到温度数据: {}", data);
    }

    @MqttTopicMapping("humidity")
    public void handleHumidity(MqttHexMsg msg) {
        String data = new String(msg.getPayload(), StandardCharsets.UTF_8);
        log.info("收到湿度数据: {}", data);
    }
}
```

### 4. 创建消息生产者

```java
@Component
@RequiredArgsConstructor
public class SensorDataSender {

    private final MqttProducer mqttProducer;

    @Scheduled(fixedRate = 5000)
    public void sendSensorData() {
        Map<String, Object> data = new HashMap<>();
        data.put("value", 25.5);
        data.put("timestamp", System.currentTimeMillis());

        mqttProducer.send("sensor/temperature", data, Qos.QOS_1);
    }
}
```

## 核心组件

### 1. 自动配置类

`MqttAutoConfigure` 通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 自动注册，扫描并装配 `com.wkclz.mqtt` 包下的全部组件：

```java
@AutoConfiguration
@ComponentScan(basePackages = {"com.wkclz.mqtt"})
public class MqttAutoConfigure {
}
```

### 2. 配置类

`MqttConfig`（`@Component`）负责创建 `MqttAsyncClient` Bean：

- **启用条件**：`shrimp.cloud.mqtt.enabled` 为 `true` 且 `end-point` 非空，否则不创建客户端（返回 null）
- **客户端 ID**：`clientId = {client-id-prefix}@{服务器IP}`，前缀为空时回退为 `server`
- **连接参数**：`cleanSession=true`、`connectionTimeout=30`、`automaticReconnect=true`、`keepAliveInterval` 取配置值（缺失或小于 0 时回退 60）
- **单向认证**：`end-point` 以 `ssl` 开头且 `ca-path` 非空时，加载 classpath 下的 CA 证书（BouncyCastle + X.509 信任库）构建 `SSLSocketFactory`
- **连接失败**：抛出 `MqttRemoteException`
- **重连回调**：内部类 `MqttReconnectCallback` 实现 `MqttCallbackExtended`，重连成功后自动重新订阅所有 Topic

### 3. 注解系统

#### `@MqttController`

类级别注解，指定一级父 Topic。元注解自带 `@Component`，无需额外标注：

- `String value()`：监听的父 Topic，必填

#### `@MqttTopicMapping`

方法级别注解，指定子 Topic，与父 Topic 共同组成完整订阅 Topic：

- `String value() default ""`：子 Topic，为空时订阅 `{parentTopic}/#`

### 4. 消息生产者

`MqttProducer`（`@Component`）通过 `@Autowired(required = false)` 注入 `MqttAsyncClient`，提供以下发送方法：

```java
// 同步发送（Object 自动序列化为 JSON）
void send(String topic, Object msg);
void send(String topic, Object msg, Qos qos);
void send(String topic, byte[] msg);
void send(String topic, byte[] msg, Qos qos);

// 延迟发送（毫秒）
void sendDelay(String topic, String msg, Integer delay);
void sendDelay(String topic, String msg, Qos qos);
void sendDelay(String topic, String msg, Integer delay, Qos qos);

// 批量延迟发送（List<String>，多条消息按 delay 依次累加调度）
void sendDelay(String topic, List<String> msgs, Integer delay);
void sendDelay(String topic, List<String> msgs, Qos qos);
void sendDelay(String topic, List<String> msgs, Integer delay, Qos qos);
```

行为约定：

- 延迟发送默认 `delay=500`（毫秒）、默认 `Qos.QOS_1`
- 延迟发送使用静态共享调度线程池 `ScheduledThreadPoolExecutor(2)`，线程名前缀 `mqtt-delay-`，拒绝策略 `CallerRunsPolicy`
- MQTT 未启用（`mqttAsyncClient` 为 null）时发送消息抛出 `MqttBeansException("mqtt is disabled!")`
- `send` 系列中 Object 类型经 fastjson2 序列化为 JSON 后发送

### 5. 消息模型

#### `MqttHexMsg`

消费端唯一注入的参数类型：

```java
public class MqttHexMsg {
    private String topic;        // 完整 Topic
    private String parentTopic;  // 父 Topic（一级）
    private String subTopic;     // 子 Topic
    private Integer id;          // 消息 ID
    private Integer qos;         // QoS 级别
    private byte[] payload;      // 消息负载
}
```

#### `Qos` 枚举

- `QOS_0(0)`：无离线消息，在线消息只尝试推一次
- `QOS_1(1)`：在线消息保证可达；cleanSession=false 时离线消息也保证可达
- `QOS_2(2)`：在线消息保证只推一次（cleanSession=false 暂不支持）

提供 `getValue()` / `getLabel()` 方法。

#### `MqttMessage`（请求消息）

- `syncFlag`：是否需要同步返回，默认 true
- `mId`：消息 ID（构造时生成）
- `replyTopic`：客户端返回消息的 Topic
- `data`：发送数据

#### `MqttResponse`（响应消息）

- 状态码：`OK=20000`、`TIMEOUT=40001`（客户端超时未处理）、`CANCEL=40002`（服务端主动取消）
- `mStatus`：状态码，默认 `OK`
- `mId`：消息 ID
- `messageResult`：收到的消息体
- `errorMessage`：状态非成功时的错误信息

### 6. 异常处理

| 异常类 | 父类 | 触发场景 |
|--------|------|----------|
| `MqttBeansException` | `org.springframework.beans.BeansException` | MQTT 未启用时发送消息、Topic 重复定义 |
| `MqttSendException` | `org.springframework.beans.BeansException` | 消息发送失败 |
| `MqttRemoteException` | `RuntimeException` | 连接/通信错误（如连接服务器失败） |
| `MqttTimeoutException` | `MqttRemoteException` | 等待响应超时 |

各异常均提供 `error(String msg)` 静态工厂方法。

**异常处理示例**:
```java
try {
    mqttProducer.send("topic/data", message);
} catch (MqttBeansException e) {
    log.error("MQTT 未启用或配置错误: {}", e.getMessage());
    // 处理配置错误
} catch (MqttRemoteException e) {
    log.error("MQTT 通信错误: {}", e.getMessage());
    // 检查网络连接或服务器状态
}
```

## 高级功能

### 1. SSL/TLS 单向认证

```yaml
shrimp:
  cloud:
    mqtt:
      end-point: ssl://mqtt.example.com:8883
      ca-path: certs/ca.crt
```

`end-point` 以 `ssl` 开头且 `ca-path` 非空时生效，CA 证书从 classpath 加载。

### 2. 自动重连机制

组件内置自动重连机制（`automaticReconnect=true`），连接断开时自动尝试重连，重连成功后自动重新订阅所有 Topic。

### 3. 延迟消息发送

```java
// 延迟 1 秒后发送
mqttProducer.sendDelay("topic/alert", "警告消息", 1000);

// 批量延迟发送（多条消息按 delay 依次累加调度）
List<String> messages = Arrays.asList("消息1", "消息2", "消息3");
mqttProducer.sendDelay("topic/batch", messages, 500, Qos.QOS_1);
```

### 4. 心跳保活

```yaml
shrimp:
  cloud:
    mqtt:
      keep-alive-task: 1
      keep-alive-interval: 30
```

`keep-alive-task` 为 `1` 时启用模块内置的心跳 Demo（`MqttProducerDemo`），每 12 秒向 `keepalive/breath` 发送心跳消息（QoS 0），由 `MqttConsumerDemo` 接收并打印。

## 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shrimp.cloud.mqtt.enabled` | String | `true` | 是否启用 MQTT（非 `true` 时不创建客户端） |
| `shrimp.cloud.mqtt.username` | String | 空 | MQTT 服务器用户名 |
| `shrimp.cloud.mqtt.password` | String | 空 | MQTT 服务器密码 |
| `shrimp.cloud.mqtt.ca-path` | String | 空 | CA 证书路径（classpath），配合 ssl 端点启用单向认证 |
| `shrimp.cloud.mqtt.end-point` | String | 空 | MQTT 服务器地址，如 `tcp://127.0.0.1:1883`；为空则不启用 MQTT |
| `shrimp.cloud.mqtt.client-id-prefix` | String | 空（缺省回退 `server`） | 客户端 ID 前缀，实际 clientId 为 `{前缀}@{服务器IP}` |
| `shrimp.cloud.mqtt.keep-alive-interval` | Integer | `60` | 心跳间隔（秒），缺失或小于 0 时回退 60 |
| `shrimp.cloud.mqtt.keep-alive-task` | Integer | `0` | 心跳任务开关，`1` 时启用内置心跳 Demo |
| `shrimp.cloud.mqtt.instance-id` | String | 空 | 阿里云实例 ID（仅注入，未使用） |
| `shrimp.cloud.mqtt.access-key` | String | 空 | 阿里云 AccessKey（仅注入，未使用） |
| `shrimp.cloud.mqtt.secret-key` | String | 空 | 阿里云 SecretKey（仅注入，未使用） |

## 消息订阅与分发

### 1. 处理器注册

`MqttBeanPostProcessor`（`BeanPostProcessor`）在 Bean 初始化后扫描 `@MqttController` 类：

- 将父 Topic 注册进 `MqttHandlerFactory` 的父 Topic 集合
- 每个 `@MqttTopicMapping` 方法注册完整 Topic：`{parentTopic}/{subTopic}`，子 Topic 为空时注册 `{parentTopic}/#`
- 连续 `/` 归一化、末尾 `/` 去除
- 同一 Topic 重复定义时抛出 `MqttBeansException`

### 2. 订阅与消息分发

- `MqttApplicationListener` 监听 `ContextRefreshedEvent`（仅根容器），应用启动完成后以 QoS 1 订阅全部 `{parentTopic}/#`
- 消息到达后优先按完整 Topic 匹配处理器；未命中时退化为一级父 Topic + `/#` 匹配；仍未命中记录 warn 日志
- 处理器方法仅注入 `MqttHexMsg` 类型参数，其余参数为 null，通过反射调用

## 日志配置

```yaml
logging:
  level:
    com.wkclz.mqtt: DEBUG
```

## 设计原理

### 1. 注解驱动机制

`MqttBeanPostProcessor` 扫描所有 `@MqttController` 注解的类，将 Topic 与处理方法映射注册进 `MqttHandlerFactory`（ConcurrentHashMap）。

### 2. 消息分发流程

1. `MqttBeanPostProcessor` 扫描并注册处理器
2. 应用启动后 `MqttApplicationListener` 触发订阅所有父 Topic
3. 收到消息时按完整 Topic → 一级父 Topic 的优先级查找处理方法
4. 反射调用处理方法，注入 `MqttHexMsg`

### 3. 自动重连

`MqttReconnectCallback` 实现 `MqttCallbackExtended`，连接断开时自动重连，重连成功后重新订阅 Topic。

## 📝 版本历史

### v1.0.0 (初始版本)
- 基础 MQTT 客户端功能
- 注解驱动消息处理器
- 自动配置和重连机制

### v1.1.0
- 添加 SSL/TLS 支持
- 添加延迟消息发送功能
- 优化线程池管理

### v1.2.0
- 添加心跳保活功能
- 性能优化和 bug 修复

## 相关资源

- [MQTT 协议规范](https://mqtt.org/)
- [Paho MQTT 客户端](https://www.eclipse.org/paho/)
- [Spring Boot 文档](https://spring.io/projects/spring-boot)
