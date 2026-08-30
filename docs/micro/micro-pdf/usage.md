# PDF 功能使用

Micro-PDF 提供基于 Thymeleaf 模板 + 动态 JSON 数据的 PDF 生成能力：先把 `templateContext`（Thymeleaf HTML）与 `data`（JSON 字符串）渲染成 HTML，再通过 XHTMLRenderer 生成 PDF。PDF 模板通过数据库（`mdm_pdf_template` 表）+ Redis 缓存管理，业务侧只需注入 `PdfApi` 即可使用。

## 注入 Pdf API

在任意 Spring 组件中注入 `PdfApi`：

```java
@Service
public class YourService {

    @Autowired
    private PdfApi pdfApi;

}
```

`PdfApi` 位于 `com.wkclz.micro.pdf.api`，由 `PdfAutoConfig` 自动装配扫描，无需额外配置。

## 生成 PDF 并响应

使用 `PdfApi.responsePdf` 直接生成 PDF 并写入 `HttpServletResponse`，浏览器内联预览：

```java
public void preview(HttpServletResponse response) {
    String templateCode = "contract";
    String data = "{\"title\":\"采购合同\",\"partyA\":\"甲方公司\"}";
    pdfApi.responsePdf(templateCode, data, response);
}
```

说明：

- `templateCode`：PDF 模板编码，对应 `mdm_pdf_template` 表的 `templateCode` 字段；模板内容会从缓存（`PdfTemplateCache`）中按编码加载，若不存在会抛出 `ValidationException`（`error templateCode`）
- `data`：模板渲染所需的 JSON 字符串，会被解析为 Thymeleaf 上下文变量（key 即变量名）；非 JSON 格式会抛出 `ValidationException`
- `response`：方法内部设置 `Content-Disposition: inline; filename=xxx.pdf` 与 `Content-Type: application/pdf` 后，将生成的 PDF 文件内容写入响应输出流，因此浏览器可以直接内联预览

`responsePdf` 内部即 `writePdf` 生成临时文件 + `PdfHelper.pdfResponse` 写出，适用于无需保留文件的即时预览/下载场景。

## 生成 PDF 文件

使用 `PdfApi.writePdf` 生成 PDF 文件，返回生成的 PDF 临时文件路径：

```java
public String generatePdf() {
    String templateCode = "invoice";
    String data = "{\"invoiceNo\":\"INV-2026-0001\",\"amount\":\"1999.00\"}";
    String pdfPath = pdfApi.writePdf(templateCode, data);
    // pdfPath 形如：/tmp/pdf/pdf_1756xxxxxxx.pdf
    return pdfPath;
}
```

说明：

- 返回值为生成的 PDF 文件完整路径，由 `PdfHelper.pdfRenderer` 写入 `FileUtil.getTempPath("pdf")` 目录下，文件名形如 `pdf_<时间戳>.pdf`
- 生成流程：加载模板 → `PdfHelper.getContext(data)` 解析 JSON → `PdfHelper.thymeleafRenderer` 渲染 HTML → `PdfHelper.pdfRenderer` 生成 PDF
- 拿到路径后可自行上传到文件服务、发送邮件附件，或手动写入响应流等

## Thymeleaf 模板编写

`mdm_pdf_template.templateContext` 存放的是 Thymeleaf HTML 模板，`data`（JSON 字符串）中的字段会被解析为 Thymeleaf 上下文变量，通过 `th:text` 等指令动态填充。

渲染时若 HTML 包含 `<body>` 标签，会自动替换为：

```html
<body style="font-family: SimSun, sans-serif;">
```

即自动为正文指定宋体（SimSun）字体，保证中文正常显示；Linux 环境下还会从 `shrimp.pdf.simsun.path`（默认 `/usr/share/fonts/zh/simsun.ttf`）加载宋体字体文件嵌入 PDF。

### 模板示例

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8"/>
    <title>合同确认单</title>
    <style>
        body { padding: 40px; }
        h1 { text-align: center; font-size: 24px; }
        .info { line-height: 2; }
    </style>
</head>
<body>
    <h1 th:text="${title}">合同标题</h1>
    <div class="info">
        <p>合同编号：<span th:text="${contractNo}">CONTRACT-0000</span></p>
        <p>甲方：<span th:text="${partyA}">甲方名称</span></p>
        <p>乙方：<span th:text="${partyB}">乙方名称</span></p>
        <p>签署日期：<span th:text="${signDate}">2026-01-01</span></p>
        <p>合同金额：<span th:text="${amount}">0.00</span> 元</p>
    </div>
</body>
</html>
```

### 对应 mockData JSON

```json
{
    "title": "采购合同确认单",
    "contractNo": "CONTRACT-2026-0001",
    "partyA": "华东科技有限公司",
    "partyB": "华南贸易有限公司",
    "signDate": "2026-08-30",
    "amount": "1999.00"
}
```

模板编写要点：

- 变量通过 `${变量名}` 引用，`data` 中 JSON 的 key 即变量名
- 支持 Thymeleaf 的 `th:text`、`th:each`、条件判断等全部表达式能力
- `<body>` 标签会自动附加宋体样式，无需手动指定字体
- 建议先通过 `## Mock 在线预览` 接口快速验证模板效果，再保存为正式模板

## 模板管理 REST 接口

模板管理接口统一以 `/micro-pdf` 为前缀，支持分页查询、详情、新增、修改、删除、Mock 预览。所有请求参数与响应字段均以源码为准。

### 1. 分页查询模板

```http
GET /micro-pdf/template/page
```

**请求参数**（Query）：
- `templateCode`：模板编码（模糊匹配，可选）
- `templateName`：模板名称（模糊匹配，可选）
- `current` / `size`：分页参数（继承 `PageReq`）

**请求示例**：

```bash
curl "http://localhost:8080/micro-pdf/template/page?templateCode=contract&current=1&size=10"
```

**响应**：`R<PageData<PdfTemplatePageResp>>`，列表项包含 `templateCode`、`templateName` 及基础字段。

### 2. 查询模板详情

```http
GET /micro-pdf/template/info?id=1
```

**请求参数**（Query）：`id`（模板主键 ID）

**请求示例**：

```bash
curl "http://localhost:8080/micro-pdf/template/info?id=1"
```

**响应**：`R<PdfTemplateInfoResp>`，包含 `templateCode`、`templateName`、`templateContext`（完整模板 HTML）、`mockData`。

### 3. 新增模板

```http
POST /micro-pdf/template/create
Content-Type: application/json
```

**请求参数**（Body，JSON）：
- `templateCode`：模板编码（可选，建议填写，作为 `writePdf`/`responsePdf` 的入参）
- `templateName`：模板名称（必填）
- `templateContext`：模板内容（必填，Thymeleaf HTML）
- `mockData`：模拟数据（可选，JSON 字符串，创建时会校验必须是合法 JSON）
- `sort`：排序（可选）
- `remark`：备注（可选）

**请求示例**：

```bash
curl -X POST "http://localhost:8080/micro-pdf/template/create" \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "contract",
    "templateName": "合同确认单",
    "templateContext": "<html><body><h1 th:text=\"${title}\">合同标题</h1></body></html>",
    "mockData": "{\"title\":\"采购合同确认单\"}",
    "sort": 1,
    "remark": "采购合同模板"
  }'
```

**响应**：`R<PdfTemplateInfoResp>`，返回创建后的模板完整信息。

> 说明：`templateCode` 唯一，重复新增会抛出 `ValidationException`（`RECORD_DUPLICATE`）。

### 4. 修改模板

```http
POST /micro-pdf/template/update
Content-Type: application/json
```

**请求参数**（Body，JSON）：
- `id`：模板主键 ID（必填，继承 `UpdateReq`）
- `version`：数据版本（必填，乐观锁，继承 `UpdateReq`）
- `templateName`：模板名称（必填）
- `templateContext`：模板内容（必填）
- `mockData`：模拟数据（可选，JSON 字符串，修改时会校验必须是合法 JSON）
- `sort` / `remark`：排序 / 备注（可选）

**请求示例**：

```bash
curl -X POST "http://localhost:8080/micro-pdf/template/update" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "version": 0,
    "templateName": "合同确认单（2026版）",
    "templateContext": "<html><body><h1 th:text=\"${title}\">合同标题</h1></body></html>",
    "mockData": "{\"title\":\"采购合同确认单（2026）\"}"
  }'
```

**响应**：`R<PdfTemplateInfoResp>`，返回修改后的模板完整信息。

### 5. 删除模板

```http
POST /micro-pdf/template/remove
Content-Type: application/json
```

**请求参数**（Body，JSON）：`id`（模板主键 ID）或 `ids`（主键 ID 清单，与 `id` 二选一，继承 `RemoveReq`）

**请求示例**：

```bash
curl -X POST "http://localhost:8080/micro-pdf/template/remove" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

**响应**：`R<Void>`。

### 6. Mock 在线预览

```http
POST /micro-pdf/template/mock
Content-Type: application/json
```

**请求参数**（Body，JSON）：
- `templateContext`：模板内容（必填，Thymeleaf HTML）
- `mockData`：模拟数据（可选，JSON 字符串）

**请求示例**：

```bash
curl -X POST "http://localhost:8080/micro-pdf/template/mock" \
  -H "Content-Type: application/json" \
  -d '{
    "templateContext": "<html><body><h1 th:text=\"${title}\">合同标题</h1><p th:text=\"${partyA}\">甲方</p></body></html>",
    "mockData": "{\"title\":\"采购合同\",\"partyA\":\"华东科技有限公司\"}"
  }' \
  -o preview.pdf
```

**响应**：直接返回 PDF 流（`application/pdf`），`Content-Disposition: inline`，文件名形如 `Mock_<时间戳>.pdf`。

Mock 接口用于"所见即所得"地验证模板效果，无需保存模板即可即时生成 PDF 预览：

- 传入 `templateContext`（Thymeleaf HTML）与 `mockData`（JSON 数据），接口内部完成「解析数据 → 渲染 HTML → 生成 PDF → 写入响应」
- 与正式模板的唯一区别是：`mock` 直接使用请求中传入的 `templateContext`，而 `writePdf`/`responsePdf` 通过 `templateCode` 从缓存加载模板内容
- 非常适合模板调试：编辑模板时先用 mock 验证渲染效果，确认无误后再通过 create/update 保存
- `mockData` 必须是合法 JSON，否则抛出 `ValidationException`（`mock 数据不是 json 格式，请修正后重试`）

## 完整业务接入场景示例

以下示例演示在一个 Service 中注入 `PdfApi`，实现「根据模板生成 PDF → 上传到文件服务 → 输出下载链接」，以及「直接在线预览 PDF」两种常见场景：

```java
@Service
public class ContractPdfService {

    @Autowired
    private PdfApi pdfApi;
    @Autowired
    private FileosUploadApi fileosUploadApi;

    /**
     * 生成合同 PDF 并上传到文件服务，返回可下载/预览的文件记录
     *
     * @param contractNo 合同编号
     */
    public MdmFileosRecordDto generateContractPdf(String contractNo) {
        // 1. 组装模板渲染数据（JSON 字符串）
        String data = JSON.toJSONString(new HashMap<String, Object>() {{
            put("contractNo", contractNo);
            put("title", "采购合同确认单");
            put("partyA", "华东科技有限公司");
            put("partyB", "华南贸易有限公司");
            put("signDate", "2026-08-30");
            put("amount", "1999.00");
        }});

        // 2. 根据模板编码生成 PDF 临时文件
        String pdfPath = pdfApi.writePdf("contract", data);

        // 3. 读取 PDF 文件并上传到文件服务（分类：pdf）
        try (InputStream in = Files.newInputStream(Paths.get(pdfPath))) {
            MultipartFile file = ...; // 将 InputStream 包装为 MultipartFile
            return fileosUploadApi.upload(file, "pdf");
        } catch (IOException e) {
            throw new RuntimeException("合同 PDF 上传失败", e);
        }
    }

    /**
     * 在线预览合同 PDF（浏览器内联展示）
     *
     * @param contractNo 合同编号
     * @param response   HTTP 响应，用于输出 PDF 流
     */
    public void previewContractPdf(String contractNo, HttpServletResponse response) {
        String data = "{\"contractNo\":\"" + contractNo
                + "\",\"title\":\"采购合同确认单\",\"partyA\":\"华东科技有限公司\",\"partyB\":\"华南贸易有限公司\"}";
        // 直接写入响应，浏览器内联预览（Content-Disposition: inline）
        pdfApi.responsePdf("contract", data, response);
    }
}
```

接入流程小结：

1. 先在管理端（或直接调用 create 接口）维护好 `templateCode` 对应的 PDF 模板
2. Service 注入 `PdfApi`
3. 需要下载/留档时调用 `writePdf` 获取 PDF 临时文件路径，自行处理上传、发送等后续操作
4. 需要在线预览时调用 `responsePdf` 直接将 PDF 写入 `HttpServletResponse`
5. 模板内容修改后，`PdfTemplateCache` 会自动刷新缓存（定时 12 秒），无需重启服务
