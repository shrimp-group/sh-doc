# K8s 服务

Micro-K8s 是 Kubernetes 管理微服务模块，提供 K8s 资源管理功能。

## 功能特性

- 集群管理：多集群配置管理
- 资源操作：Pod、Service、Deployment 管理
- 配置管理：ConfigMap、Secret 管理
- 日志查看：容器日志实时查看

## 快速开始

### 添加依赖

```xml
<dependency>
    <groupId>com.wkclz.micro</groupId>
    <artifactId>micro-k8s</artifactId>
</dependency>
```

### 配置集群

```yaml
k8s:
  clusters:
    - name: default
      kubeConfig: ~/.kube/config
```
