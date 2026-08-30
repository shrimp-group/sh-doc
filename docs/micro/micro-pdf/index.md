# PDF 服务

Micro-PDF 是完整的 PDF 生成与模板管理微服务模块，基于 Spring Boot 实现，通过 Thymeleaf 将 JSON 数据填充到 HTML 模板中渲染页面，再借助 Flying Saucer（flying-saucer-pdf-itext5）将 HTML 转换为 PDF。支持基于 `mdm_pdf_template` 表的模板增删改查管理、中文字体（宋体）支持、Mock 在线预览以及 Redis 变更通知 + 定时刷新的本地模板缓存。

## 功能特性

- **模板管理**：基于 `mdm_pdf_template` 表提供模板的分页查询、详情、新增、修改、删除接口，支持模板编码、模板名称、模板内容、模拟数据等字段
- **Thymeleaf 动态渲染**：支持通过 JSON 数据填充 HTML 模板（Thymeleaf 语法），将 `templateContext` 模板内容与数据上下文渲染为 HTML 页面
- **中文字体支持**：内置 SimSun 宋体支持，HTML 中自动指定 `font-family: SimSun`，Unix 环境下自动注册宋体字体文件（默认路径 `/usr/share/fonts/zh/simsun.ttf`，可通过 `shrimp.pdf.simsun.path` 配置）
- **Mock 在线预览**：提供模板 Mock 接口，传入模板内容与模拟数据即可在线生成 PDF 预览效果，新增/修改模板时也会校验模拟数据 JSON 格式合法性
- **模板本地缓存**：PDF 模板采用本地内存缓存，支持 Redis 变更通知 + 定时自动刷新（`autoReflash`），模板变更后立即清除并重建缓存

## 适用场景

- 合同、发票、单据等业务文档的 PDF 生成
- 数据报表导出
- 模板化 PDF 批量输出

## 技术栈

- Java 25
- Spring Boot
- Thymeleaf
- Flying Saucer（flying-saucer-pdf-itext5 9.7.2）
- MyBatis
- Redis

## 快速导航

- [设计思路](./design) - 了解架构设计和核心原理
- [功能集成](./integration) - 了解如何集成到项目中
- [使用指南](./usage) - 详细的功能使用示例
