# MQTT 消息队列模块

## 概述

sh-mqtt 是一个基于 Spring Boot 的 MQTT 客户端组件，提供了完整的 MQTT 消息发布/订阅功能。该模块采用注解驱动的设计模式，支持自动配置、SSL/TLS 安全连接、自动重连机制和延迟消息发送等功能。

## 核心价值

- **开箱即用**：零代码配置即可使用
- **注解驱动**：声明式定义消息处理器
- **自动重连**：网络异常时自动恢复连接
- **SSL/TLS 支持**：保障数据传输安全
- **延迟发送**：支持定时任务和延迟通知
- **线程安全**：使用线程池管理异步任务

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

`MqttAutoConfigure` 自动扫描并注册 MQTT 相关组件，实现零配置集成。

### 2. 配置类

`MqttConfig` 负责：
- 创建和管理 `MqttAsyncClient` 实例
- 支持 SSL/TLS 连接
- 自动重连机制
- 客户端 ID 自动生成

### 3. 注解系统

#### `@MqttController`
- **作用**: 类级别注解，指定父 Topic
- **示例**: `@MqttController("sensor")`

#### `@MqttTopicMapping`
- **作用**: 方法级别注解，指定子 Topic
- **示例**: `@MqttTopicMapping("temperature")`

### 4. 消息生产者

`MqttProducer` 提供多种发送方法：

```java
// 发送对象（自动转为 JSON）
void send(String topic, Object msg);
void send(String topic, Object msg, Qos qos);

// 延迟发送
void sendDelay(String topic, String msg, Integer delay);
void sendDelay(String topic, String msg, Integer delay, Qos qos);
```

### 5. 消息模型

#### `MqttHexMsg`
```java
public class MqttHexMsg {
    private String topic;        // 完整 Topic
    private String parentTopic;  // 父 Topic
    private String subTopic;     // 子 Topic
    private Integer id;          // 消息 ID
    private Integer qos;         // QoS 级别
    private byte[] payload;      // 消息负载
}
```

#### `Qos` 枚举
- `QOS_0`: 最多一次，无离线消息
- `QOS_1`: 至少一次，保证可达
- `QOS_2`: 恰好一次，保证只推一次

### 8. 异常处理

组件提供以下异常类，用于处理不同的错误场景：

#### `MqttBeansException`
- **触发条件**: MQTT 未启用或配置错误时尝试发送消息
- **示例**: `throw new MqttBeansException("mqtt is disabled!");`

#### `MqttRemoteException`
- **触发条件**: MQTT 连接或通信错误
- **示例**: 连接服务器失败、认证失败等

#### `MqttSendException`
- **触发条件**: 消息发送失败
- **示例**: 网络异常导致消息发送失败

#### `MqttTimeoutException`
- **触发条件**: 操作超时
- **示例**: 等待响应超时

**异常处理示例**:
```java
try {
    mqttProducer.send("topic/data", message);
} catch (MqttBeansException e) {
    log.error("MQTT 未启用或配置错误: {}", e.getMessage());
    // 处理配置错误
} catch (MqttSendException e) {
    log.error("消息发送失败: {}", e.getMessage());
    // 重试或记录失败消息
} catch (MqttRemoteException e) {
    log.error("MQTT 通信错误: {}", e.getMessage());
    // 检查网络连接或服务器状态
}
```

## 高级功能

### 1. SSL/TLS 安全连接

```yaml
shrimp:
  cloud:
    mqtt:
      end-point: ssl://mqtt.example.com:8883
      ca-path: certs/ca.crt
```

### 2. 自动重连机制

组件内置自动重连机制，连接断开时自动尝试重连，重连成功后自动重新订阅所有 Topic。

### 3. 延迟消息发送

```java
// 延迟 1 秒后发送
mqttProducer.sendDelay("topic/alert", "警告消息", 1000);

// 批量延迟发送
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

## 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shrimp.cloud.mqtt.enabled` | Boolean | `true` | 是否启用 MQTT |
| `shrimp.cloud.mqtt.username` | String | - | MQTT 服务器用户名 |
| `shrimp.cloud.mqtt.password` | String | - | MQTT 服务器密码 |
| `shrimp.cloud.mqtt.end-point` | String | - | MQTT 服务器地址 |
| `shrimp.cloud.mqtt.client-id-prefix` | String | `"server"` | 客户端 ID 前缀 |
| `shrimp.cloud.mqtt.keep-alive-interval` | Integer | `60` | 心跳间隔（秒） |
| `shrimp.cloud.mqtt.keep-alive-task` | Integer | `0` | 心跳任务开关 |
| `shrimp.cloud.mqtt.ca-path` | String | - | CA 证书路径 |

## 最佳实践

### 1. Topic 设计规范

**推荐格式**: `{领域}/{设备类型}/{设备ID}/{操作}`

**示例**:
- `iot/sensor/temperature/001/read`
- `iot/actuator/light/002/control`
- `system/log/error`

### 2. 消息处理器设计

```java
@Slf4j
@MqttController("iot")
public class IotMessageHandler {
    
    private final ExecutorService executor = Executors.newFixedThreadPool(10);
    
    @MqttTopicMapping("sensor/#")
    public void handleSensorData(MqttHexMsg msg) {
        executor.submit(() -> {
            try {
                // 异步处理消息
                processMessage(msg);
            } catch (Exception e) {
                log.error("处理消息失败", e);
            }
        });
    }
}
```

### 3. 错误处理

```java
@Slf4j
@MqttController("system")
public class SystemMessageHandler {
    
    @MqttTopicMapping("error")
    public void handleError(MqttHexMsg msg) {
        try {
            String errorMsg = new String(msg.getPayload(), StandardCharsets.UTF_8);
            log.error("系统错误: {}", errorMsg);
            // 记录错误日志
            saveErrorLog(errorMsg);
        } catch (Exception e) {
            log.error("处理错误消息失败", e);
        }
    }
}
```

## 监控与调试

### 1. 日志配置

```yaml
logging:
  level:
    com.wkclz.mqtt: DEBUG
```

### 2. 健康检查

```bash
curl http://localhost:8080/actuator/health
```

### 3. 监控指标

- `mqtt.connections.active`: 活跃连接数
- `mqtt.messages.sent`: 发送消息数
- `mqtt.messages.received`: 接收消息数
- `mqtt.errors.count`: 错误次数

## 常见问题

### 1. 连接失败

**解决方案**:
1. 检查服务器地址和端口
2. 检查用户名和密码
3. 检查网络连接
4. 检查防火墙设置

### 2. 消息丢失

**解决方案**:
1. 使用更高的 QoS 级别
2. 检查 Topic 是否正确
3. 检查消息处理器是否注册成功
4. 查看日志确认消息发送状态

### 3. 性能问题

**解决方案**:
1. 使用异步处理
2. 增加线程池大小
3. 优化消息处理逻辑
4. 考虑使用批量处理

## 设计原理

### 1. 注解驱动机制

组件通过 `BeanPostProcessor` 扫描所有 `@MqttController` 注解的类，注册 Topic 与处理方法的映射关系。

### 2. 消息分发流程

1. BeanPostProcessor 扫描并注册处理器
2. 应用启动后订阅所有父 Topic
3. 收到消息时根据 Topic 查找对应的处理方法
4. 反射调用处理方法

### 3. 自动重连

组件实现 `MqttCallbackExtended` 接口，在连接断开时自动重连，重连成功后重新订阅 Topic。

## 版本历史

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
- 添加监控指标
- 性能优化和 bug 修复

## 相关资源

- [MQTT 协议规范](https://mqtt.org/)
- [Paho MQTT 客户端](https://www.eclipse.org/paho/)
- [Spring Boot 文档](https://spring.io/projects/spring-boot)
