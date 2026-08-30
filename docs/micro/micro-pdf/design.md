# 设计思路

Micro-PDF 是 PDF 生成微服务模块，核心思路：**模板与数据分离**。模板（HTML + Thymeleaf 语法）存于数据库，业务方只传 JSON 数据，模块内部完成「数据 → Context → HTML → PDF」的转换链路，并通过本地缓存 + Redis 通知实现模板配置的热更新。

整体技术栈：Java 25、Spring Boot、Thymeleaf、Flying Saucer（xhtmlrenderer-pdf-itext5）、MyBatis、Redis、fastjson2。

## 设计要点

### PDF 生成链路

生成链路是一个纯粹的「数据 + 模板 → 文件/响应」的流水线，入口统一在 `PdfApi`，具体渲染逻辑封装在 `PdfHelper`：

```
┌────────────┐   templateCode/data   ┌──────────────┐
│  业务调用方  │ ─────────────────────▶ │   PdfApi     │
└────────────┘                       │ (生成入口)     │
                                     └──────┬───────┘
                                            │ 1. 按 templateCode 取模板（缓存）
                                            ▼
                                     ┌──────────────┐
                                     │  MdmPdfTemplate（templateContext）│
                                     └──────┬───────┘
                                            │ 2. getContext(data)：JSON→Context
                                            ▼
                                     ┌──────────────┐
                                     │ thymeleafRenderer│ 3. Thymeleaf 渲染 HTML
                                     │   body 强制宋体   │    并给 <body> 加 SimSun 样式
                                     └──────┬───────┘
                                            │ 4. pdfRenderer：Flying Saucer 渲染 PDF
                                            │    （字体注册 + PDF 1.7 + 临时文件）
                                            ▼
                                     ┌──────────────┐
                                     │ pdfResponse    │ 5. 输出到 HttpServletResponse
                                     │   (inline)     │    (或直接返回文件路径)
                                     └──────────────┘
```

链路各步骤说明：

1. **取模板**：`PdfApi.writePdf` 通过 `pdfTemplateCache.getPdfTemplate(templateCode)` 获取 `MdmPdfTemplate`，模板为空或 `templateContext` 为空时抛出 `ValidationException`。
2. **数据转 Context**：`PdfHelper.getContext(data)` 用 fastjson2 将 JSON 字符串解析为 `JSONObject`，遍历所有 key 通过 `context.setVariable` 注入 Thymeleaf `Context`；空数据直接返回空 Context；非 JSON 格式抛出「mock 数据不是 json 格式」异常。
3. **HTML 渲染**：`PdfHelper.thymeleafRenderer(templateContext, context)` 新建 `TemplateEngine` 并 `process` 渲染出 HTML；若结果包含 `<body>`，自动替换为 `<body style="font-family: SimSun, sans-serif;">`，在 HTML 层面兜底指定宋体。
4. **PDF 渲染**：`pdfHelper.pdfRenderer(htmlContent)` 使用 Flying Saucer 的 `ITextRenderer`：
   - 注册 SimSun 中文字体（Unix 系统且配置了字体路径时，见「中文字体处理」）；
   - `renderer.setPDFVersion(PdfWriter.VERSION_1_7)` 指定 PDF 版本 1.7；
   - `setDocumentFromString(htmlContent)` + `layout()` + `createPDF(os)`，输出到临时文件 `FileUtil.getTempPath("pdf")/pdf_{时间戳}.pdf`，返回文件全路径。
5. **响应输出**：`PdfHelper.pdfResponse(response, pdfPath, pdfName)` 设置 `Content-Disposition: inline; filename=xxx.pdf`（浏览器内联预览而非下载）与 `Content-Type: application/pdf`，通过 `Files.copy` 将临时文件写入 `response.getOutputStream()`。

> 入口有两个对外形态：`responsePdf(templateCode, data, response)` 一步到位输出到 HTTP 响应；`writePdf(templateCode, data)` 只生成 PDF 临时文件并返回路径，供调用方二次处理。

### 模板缓存机制

模板内容保存在数据库，为避免每次生成 PDF 都查库，采用「**本地 Map 缓存 + Redis 变更时间戳 + 定时刷新**」的多级方案：

```
┌──────────────┐   写 Redis 时间戳     ┌──────────────┐
│ 管理后台      │ ────────────────────▶ │    Redis      │
│ (增/删/改模板)│   key=sh:micro:pdf:   │ (变更通知通道)  │
└──────────────┘    cache:time         └──────┬───────┘
                                              │ 每 12 秒轮询
                                              ▼
                                     ┌──────────────┐
                                     │ PdfTemplateCache │
                                     │ 本地 Map：      │
                                     │  templateCode→  │
                                     │  MdmPdfTemplate │
                                     └──────────────┘
```

核心数据结构（`PdfTemplateCache` 静态成员）：

- `CACHE_ITEM`：本地缓存，`Map<String, MdmPdfTemplate>`，key 为 `templateCode`；
- `CACHE_TIME`：本地缓存加载时间戳，用于防抖与新旧比较；
- `CLEAR_FLAG`：缓存变更标记，供 `getClearFlag()` 消费（读后复位）；
- Redis key `sh:micro:pdf:cache:time`：记录模板最近一次变更的时间戳。

刷新/清理的四种触发路径：

1. **手动清理 `clearCache()`**：将当前时间戳写入 Redis（TTL 1 分钟），置空 `CACHE_TIME`，立即执行 `init()` 重建缓存——用于模板新增/修改/删除后的主动同步。
2. **定时刷新 `autoReflash()`**：`@Scheduled(fixedDelay = 12_000, initialDelay = 40_000)`，应用启动 40 秒后每 12 秒执行一次：
   - 本地缓存为空则直接 `init()`；
   - 读 Redis 变更时间，若本地缓存时间比 Redis 更新（差值 > 1 秒）说明是本地刚刷过，跳过；
   - 变更时间距现在超过 60 秒则跳过，防止 Redis 残留的时间戳导致无意义刷新；
   - 否则执行 `init()`。
3. **未命中触发**：`getPdfTemplate(templateCode)` 在本地未命中时主动调用 `init()` 后重查。
4. **防抖保护 `init()`**：方法加 `synchronized`，若距上次加载不足 5 秒直接返回，避免高并发下重复全量加载数据库。

**防穿透设计**：`getPdfTemplate` 未命中时，会向 `CACHE_ITEM` 放入一个空对象 `new MdmPdfTemplate()` 作为占位，后续再次查询同一 `templateCode` 命中空对象即返回 null（`dto.getTemplateCode() == null`），避免不存在的模板反复触发数据库查询。

> 注意：本地缓存无 TTL，自身永不主动过期，靠 Redis 时间戳 + 12 秒轮询实现跨实例的最终一致，属于「最终一致、秒级延迟」的取舍。

### 中文字体处理

Flying Saucer 默认不包含中文字体，直接渲染中文 HTML 会乱码。Micro-PDF 从「HTML 样式」和「PDF 字体」两层处理：

- **HTML 层**：`thymeleafRenderer` 渲染后强制给 `<body>` 注入 `font-family: SimSun, sans-serif;` 样式，让 CSS 指定宋体。
- **PDF 层**：`pdfRenderer` 通过 `ITextFontResolver.addFont(path, BaseFont.IDENTITY_H, BaseFont.EMBEDDED)` 注册 SimSun 字体：
  - `IDENTITY_H`：按 Unicode 编码方式使用字体，支持中文；
  - `EMBEDDED`：将字体嵌入 PDF 文件，保证不同终端显示一致。

字体路径由 `PdfConfig` 提供：

```java
@Value("${shrimp.pdf.simsun.path:/usr/share/fonts/zh/simsun.ttf}")
private String simsunPath;
```

- 默认值 `/usr/share/fonts/zh/simsun.ttf`（Linux 服务端路径），可通过配置项 `shrimp.pdf.simsun.path` 覆盖。
- **仅 Unix 系统注册**：通过 `PdfHelper.isUnix()`（`os.name` 含 `nix`/`nux`/`aix`）判断，Mac/Windows 本地调试时不注册系统字体，避免本地路径不存在时报错。
- 字体注册失败只记录 `log.error("add font error: ...")`，不中断生成流程——这会导致生成的 PDF 中文乱码，生产环境需保证字体文件存在。

### 模板管理

模板数据落库在 `mdm_pdf_template` 表，核心字段：

| 字段 | 说明 |
|------|------|
| template_code | 模板编码（业务唯一标识，作为缓存 key） |
| template_name | 模板名称 |
| template_context | 模板内容（HTML + Thymeleaf 表达式） |
| mock_data | 模拟数据（JSON 字符串，用于预览/校验） |
| sort / remark / version | 排序、备注、乐观锁版本 |

**`MdmPdfTemplateService`**（继承 `BaseService`）提供的操作：

- **分页查询** `getPdfTemplatePage`：`PageQuery.page(entity, mapper::getPdfTemplateList)`，Mapper 按 `template_code`、`template_name` 模糊查询，`deleted = 0` 过滤逻辑删除，`ORDER BY id DESC`。
- **新增** `create`：先 `duplicateCheck` 唯一性校验，再 `insert`。
- **修改** `update`：`duplicateCheck` 校验 → `selectById` 校验记录存在（不存在抛 `RECORD_NOT_EXIST`）→ `copyIfNotNull` 只覆盖非空字段 → `updateByIdSelective` 选择性更新。
- **删除** `deleteById`：逻辑删除（`deleted = 1`）。
- **唯一性校验 `duplicateCheck`**：`templateCode` 为空直接通过；按 `templateCode` 查出记录时，若记录 id 与当前实体 id 不同则抛 `RECORD_DUPLICATE`，保证编码不重复。

**REST 接口**（`PdfTemplateRest`，前缀 `/micro-pdf`）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/template/page` | 模板分页 |
| GET | `/template/info` | 模板详情 |
| POST | `/template/create` | 新增模板 |
| POST | `/template/update` | 修改模板 |
| POST | `/template/remove` | 删除模板 |
| POST | `/template/mock` | 在线预览（Mock） |

管理侧细节：

- **Mock 数据校验**：新增/修改接口在落库前先执行 `PdfHelper.getContext(mockData)`，确保 `mockData` 是合法 JSON。
- **Mock 预览**：`/template/mock` 不依赖数据库，直接用请求体中的 `templateContext` + `mockData` 走完整渲染链路，输出文件名 `Mock_{时间戳}.pdf`，便于模板编写时即时预览效果。
- **缓存联动**：模板增删改后调用 `clearCache()` 通知所有实例刷新（见「模板缓存机制」）。

## 核心组件速查

| 组件 | 职责 |
|------|------|
| PdfApi | PDF 生成入口，编排「取模板 → Context → HTML → PDF 文件 → HTTP 响应」完整链路 |
| PdfHelper | 核心渲染工具：`getContext`（JSON→Thymeleaf Context）、`thymeleafRenderer`（渲染 HTML 并强制宋体）、`pdfRenderer`（Flying Saucer 生成 PDF 临时文件）、`pdfResponse`（写入响应流）、`isUnix`（系统判断） |
| PdfTemplateCache | 模板本地 Map 缓存 + Redis 变更时间戳通知 + 12 秒定时刷新 + 5 秒防抖 + 空对象防穿透 |
| PdfConfig | 配置项注入：SimSun 字体路径（`shrimp.pdf.simsun.path`） |
| MdmPdfTemplateService | 模板单表服务：分页/新增/修改/删除 + templateCode 唯一性校验 |
| MdmPdfTemplateMapper | MyBatis Mapper：`getPdfTemplateList` 分页查询、`get4Cache` 全量缓存查询 |
| PdfTemplateRest | REST 控制器：模板增删改查 + Mock 预览接口 |
| Route | 路由常量定义（前缀 `/micro-pdf` 及各模板接口路径） |
