# micro-pdf 功能集成文档

## 1. Maven 依赖引入

在主应用的 `pom.xml` 中添加以下依赖：

```xml
<dependency>
    <groupId>com.wkclz.microapp</groupId>
    <artifactId>micro-pdf</artifactId>
</dependency>
```

模块引入后，`PdfAutoConfig` 通过 Spring Boot 自动配置机制自动扫描组件和 Mapper，无需手动配置：

- `PdfAutoConfig` 通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 注册为自动配置类
- 自动配置类上标注 `@ComponentScan(basePackages = {"com.wkclz.micro.pdf"})` 扫描 REST、Service、Cache、Helper 等组件
- 自动配置类上标注 `@MapperScan({"com.wkclz.micro.pdf.mapper"})` 扫描 MyBatis Mapper 接口

---

## 2. 数据库表结构

### 2.1 mdm_pdf_template — PDF 模板表

```sql
CREATE TABLE `mdm_pdf_template` (
  `id`               bigint       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `template_code`    varchar(127) DEFAULT NULL COMMENT '模板编码',
  `template_name`    varchar(255) NOT NULL COMMENT '模板名称',
  `template_context` text         NOT NULL COMMENT '模板内容',
  `mock_data`        text         DEFAULT NULL COMMENT '模拟数据',
  `sort`             int          DEFAULT 0  COMMENT '排序',
  `create_time`      datetime     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by`        varchar(31)  DEFAULT NULL COMMENT '创建人',
  `update_time`      datetime     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by`        varchar(31)  DEFAULT NULL COMMENT '更新人',
  `remark`           varchar(255) DEFAULT NULL COMMENT '备注',
  `version`          int          DEFAULT 0  COMMENT '乐观锁',
  `deleted`          varchar(24)  DEFAULT '0' COMMENT '逻辑删除(0=未删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='PDF模板';
```

说明：

- `template_context` 为 Thymeleaf 模板内容（HTML），渲染后生成 PDF
- `mock_data` 为 JSON 格式的模拟数据，用于接口 Mock 预览
- `uk_template_code` 唯一索引：同一 `template_code` 在未删除（`deleted = 0`）记录中唯一，业务侧 `MdmPdfTemplateService.duplicateCheck` 亦做了模板编码重复校验

---

## 3. REST API 接口清单

所有接口前缀：`/micro-pdf`

### 3.1 模板管理

| # | 方法 | 路径 | 说明 | 参数 | 返回值 |
|---|------|------|------|------|--------|
| 1 | GET | `/template/page` | PDF 模板分页查询 | `templateCode`(可选), `templateName`(可选) + 分页参数 `current`/`size` | `R<PageData<PdfTemplatePageResp>>` |
| 2 | GET | `/template/info` | PDF 模板详情 | `id` (Long) | `R<PdfTemplateInfoResp>` |
| 3 | POST | `/template/create` | 新增 PDF 模板 | `templateName`(必填), `templateContext`(必填), `templateCode`(可选), `mockData`(可选), `sort`(可选), `remark`(可选) | `R<PdfTemplateInfoResp>` |
| 4 | POST | `/template/update` | 修改 PDF 模板 | `id`(必填), `version`(必填), `templateName`(必填), `templateContext`(必填), `mockData`(可选), `sort`(可选), `remark`(可选) | `R<PdfTemplateInfoResp>` |
| 5 | POST | `/template/remove` | 删除 PDF 模板 | `id`(Long) 或 `ids`(Long 数组) 二选一 | `R<Void>` |
| 6 | POST | `/template/mock` | Mock 预览 PDF 模板 | `templateContext`(必填), `mockData`(可选) | PDF 文件流 (`application/pdf`) |

---

## 4. 初始化配置

### 4.1 application.yml 配置

```yaml
shrimp:
  pdf:
    simsun:
      path: /usr/share/fonts/zh/simsun.ttf
```

说明：

- `shrimp.pdf.simsun.path`：PDF 渲染时使用的宋体字体文件路径，默认值为 `/usr/share/fonts/zh/simsun.ttf`，可自定义为任意的 TTF 字体路径。注意源码通过 `@Value("${shrimp.pdf.simsun.path:...}")` 精确匹配属性名，YAML 必须使用嵌套形式 `simsun.path`
- 仅在 Unix/Linux 环境下生效（`PdfHelper` 通过 `isUnix()` 判断），渲染时会将该字体嵌入 PDF，保证中文正常显示
- 若服务器字体路径不同，请将该配置覆盖为实际路径

---

## 5. 验证集成的方法

### 5.1 检查模块加载

启动应用后，检查控制台日志，确认 `PdfAutoConfig` 自动装配成功（组件扫描与 Mapper 扫描均基于该配置类）。

### 5.2 验证模板分页接口

通过以下命令验证接口连通性：

```bash
# 查询 PDF 模板分页
curl "http://localhost:8080/micro-pdf/template/page?current=1&size=10"

# 创建测试模板
curl -X POST http://localhost:8080/micro-pdf/template/create \
  -H 'Content-Type: application/json' \
  -d '{
    "templateCode": "test-template",
    "templateName": "测试模板",
    "templateContext": "<html><body>你好，<span th:text=\"${name}\">世界</span></body></html>",
    "mockData": "{\"name\":\"World\"}"
  }'
```

### 5.3 检查缓存日志

模板缓存 `PdfTemplateCache` 首次加载（或更新）时会输出日志，确认出现以下内容即表示缓存与 Mapper 均正常：

```
micro-pdf: PDF模板更新成功 N 项
```

### 5.4 Mock 预览验证

```bash
# 使用 mock 接口预览模板渲染效果（返回 PDF 文件流）
curl -X POST http://localhost:8080/micro-pdf/template/mock \
  -H 'Content-Type: application/json' \
  -d '{
    "templateContext": "<html><body>你好，<span th:text=\"${name}\">世界</span></body></html>",
    "mockData": "{\"name\":\"World\"}"
  }' -o mock.pdf
```

### 5.5 常见问题排查

1. **中文显示为方块**：检查 `shrimp.pdf.simsun-path` 配置的字体路径是否正确，且服务器为 Unix/Linux 环境
2. **模板无法创建/修改**：检查 `mdm_pdf_template` 表是否存在，`template_code` 是否与已有记录重复（会触发 `RECORD_DUPLICATE`）
3. **Mock 预览报错**：确认 `mockData` 为合法 JSON 格式（否则抛出 "mock 数据不是 json 格式"），`templateContext` 为合法的 Thymeleaf HTML
4. **缓存未更新**：模板更新后缓存由 `PdfTemplateCache.autoReflash` 定时刷新（启动 40s 后每 12s 轮询一次），如需立即生效请稍候或重启应用
