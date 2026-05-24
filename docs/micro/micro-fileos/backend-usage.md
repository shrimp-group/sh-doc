# 后端使用指南

## 注入 API

### API 结构

```java
// 文件上传 API
@Autowired
private FileosUploadApi fileosUploadApi;

// 签名 URL API
@Autowired
private FileosSignApi fileosSignApi;

// 文件下载 API
@Autowired
private FileosDownloadApi fileosDownloadApi;

// 文件删除 API
@Autowired
private FileosDeleteApi fileosDeleteApi;

// 预签名上传 API
@Autowired
private FileosPresignUploadApi fileosPresignUploadApi;
```

## 1. FileosUploadApi — 文件上传

`FileosUploadApi` 提供服务端直传上传能力，适用于后端接收文件后直接存储到 OSS 的场景。

### 简单上传

简单上传是最常用的方式，支持多种参数组合：

```java
// 简单上传 — 仅传文件，使用默认 Bucket
// 返回文件记录信息，包含 fileId、previewUrl 等
MdmFileosRecordDto record = fileosUploadApi.upload(multipartFile);

// 简单上传 — 指定业务分类
// category 用于区分不同业务场景，便于文件管理和统计
MdmFileosRecordDto record = fileosUploadApi.upload(multipartFile, "avatar");

// 简单上传 — 指定分类和 Bucket
// bucketName 用于指定使用哪个存储空间
MdmFileosRecordDto record = fileosUploadApi.upload(multipartFile, "avatar", "my-bucket");

// 简单上传 — 指定分类、Bucket、是否公开读
// isPublic 为 true 时文件公开可读，无需签名即可访问
MdmFileosRecordDto record = fileosUploadApi.upload(multipartFile, "avatar", "my-bucket", true);
```

### 精细控制上传

使用 `FileosUploadRequest` 进行更精细的上传控制：

```java
// 使用 FileosUploadRequest 精细控制
FileosUploadRequest request = new FileosUploadRequest();
// 业务分类，用于区分不同业务场景
request.setCategory("avatar");
// 指定存储空间
request.setBucketName("my-bucket");
// 是否公开读，公开读的文件无需签名即可访问
request.setIsPublic(true);
// 图片处理参数，支持缩放、裁剪、水印等 OSS 图片处理能力
request.setImageProcess("{\"resize\":{\"width\":200,\"height\":200,\"mode\":\"lfit\"}}");
// 执行上传
MdmFileosRecordDto record = fileosUploadApi.upload(multipartFile, request);
```

**返回结果说明**：

```java
public class MdmFileosRecordDto {
    private Long id;               // 记录主键 ID
    private String fileId;         // 文件唯一标识，如：avatar/20240524/a1b2c3d4.jpg
    private String fileName;       // 原始文件名
    private String fileType;       // 文件扩展名，如：jpg
    private Long fileSize;         // 文件大小（字节）
    private String fileHash;       // 文件 Hash 值，用于去重
    private String contentType;    // MIME 类型，如：image/jpeg
    private String category;       // 业务分类
    private String dirPath;        // 所属目录路径
    private Integer isPublic;      // 是否公开读（0=私有，1=公开）
    private String ossSp;         // OSS 服务商（ALI_OSS/AWS_S3/S3_COMPATIBLE）
    private String bucketName;     // Bucket 名称
    private String uploadType;     // 上传方式（SIMPLE/MULTIPART/PRESIGN）
    private String uploadId;      // 分片上传 ID（分片上传时返回）
    private String uploadStatus;   // 上传状态（UPLOADING/COMPLETED/ABORTED）
    private String imageProcess;   // 图片处理参数
    private String previewUrl;     // 预览 URL（临时签名，10分钟有效）
}
```

### 分片上传

分片上传适用于大文件（建议 > 50MB），将文件拆分为多个分片并行上传，提高上传速度和可靠性：

```java
// 分片上传 — 初始化
// 创建分片上传任务，获取上传 ID 和各分片的预签名 URL
MultipartUploadInitRequest initRequest = new MultipartUploadInitRequest();
// 文件名
initRequest.setFileName("large-video.mp4");
// 文件总大小（字节）
initRequest.setFileSize(1024L * 1024 * 500);
// MIME 类型
initRequest.setContentType("video/mp4");
// 业务分类
initRequest.setCategory("video");
// 指定 Bucket
initRequest.setBucketName("media-bucket");
// 分片总数
initRequest.setPartCount(10);
// 初始化分片上传，返回 uploadId、fileId、各分片预签名 URL
MultipartUploadInitResponse initResponse = fileosUploadApi.initMultipartUpload(initRequest);
// initResponse.getUploadId() — 分片上传 ID
// initResponse.getFileId() — 文件唯一标识
// initResponse.getParts() — 各分片的预签名 URL 列表
```

```java
// 分片上传 — 完成
// 当所有分片上传完成后，调用此方法合并分片
MultipartCompleteRequest completeRequest = new MultipartCompleteRequest();
// 分片上传 ID（初始化时返回）
completeRequest.setUploadId(initResponse.getUploadId());
// 文件唯一标识
completeRequest.setFileId(initResponse.getFileId());
// Bucket 名称
completeRequest.setBucketName("media-bucket");
// OSS 服务商
completeRequest.setOssSp(initResponse.getOssSp());
// 文件名
completeRequest.setFileName("large-video.mp4");
// 文件总大小
completeRequest.setFileSize(1024L * 1024 * 500);
// 业务分类
completeRequest.setCategory("video");
// 已完成分片信息列表
List<CompletedPartInfo> parts = new ArrayList<>();
// 每个分片上传完成后会返回 ETag，需要记录分片序号和 ETag
parts.add(new CompletedPartInfo() {{ setPartNumber(1); setETag("etag-1"); }});
parts.add(new CompletedPartInfo() {{ setPartNumber(2); setETag("etag-2"); }});
// ... 其他分片
completeRequest.setParts(parts);
// 完成分片上传，返回文件记录
MdmFileosRecordDto record = fileosUploadApi.completeMultipartUpload(completeRequest);
```

```java
// 分片上传 — 中止
// 当分片上传失败或需要取消时，调用此方法中止上传并清理已上传的分片
fileosUploadApi.abortMultipartUpload(uploadId, fileId, bucketName, ossSp);
```

## 2. FileosSignApi — 签名 URL 生成

`FileosSignApi` 用于为私有文件生成临时访问签名 URL，支持单文件、批量、泛型签名。

### 单文件签名

```java
// 单文件签名 — 使用默认过期时间（10分钟）
// 直接传入文件路径即可
String url = fileosSignApi.sign("path/to/file.jpg");

// 单文件签名 — 自定义过期时间
// expireMinutes 指定过期时间，支持分钟级别精度
String url = fileosSignApi.sign("path/to/file.jpg", 60, TimeUnit.MINUTES);

// 单文件签名 — 使用小时单位
String url = fileosSignApi.sign("path/to/file.jpg", 1, TimeUnit.HOURS);
```

### 批量签名

```java
// 批量签名 — 使用默认过期时间
// 一次签名多个文件，提高效率
List<String> urls = fileosSignApi.sign(List.of("file1.jpg", "file2.png"));

// 批量签名 — 自定义过期时间
List<String> urls = fileosSignApi.sign(List.of("file1.jpg", "file2.png"), 30, TimeUnit.MINUTES);
```

### 内容签名

内容签名用于签名后可以直接访问文件内容：

```java
// 内容签名（签名 URL 用于内容访问）
// 适用于 HTML、JSON 等需要浏览器直接访问的内容
String contentUrl = fileosSignApi.signContent("path/to/content.html");
```

### 泛型签名

泛型签名支持对 Java 对象中的文件 ID 字段自动签名并回填 URL：

```java
// 泛型签名 — 对实体中的 fileId 字段自动签名并回填
// 使用方法引用指定 fileId 字段和 URL 字段
// 执行后 User 对象的 avatarUrl 字段会被自动填充为签名后的 URL
fileosSignApi.sign(userEntity, User::getAvatarFileId, User::setAvatarUrl);

// 泛型签名 — 批量实体
// 一次对列表中所有对象的 fileId 进行签名并回填
fileosSignApi.sign(userList, User::getAvatarFileId, User::setAvatarUrl);
```

**使用示例**：

```java
// 定义实体类
public class User {
    private Long id;
    private String name;
    private String avatarFileId;   // 存储 fileId
    private String avatarUrl;       // 存储签名后的 URL（由 API 自动填充）
    // getters and setters
}

// 获取用户
User user = userService.getById(1L);

// 签名头像 URL
// 执行后 user.getAvatarUrl() 得到签名后的访问 URL
fileosSignApi.sign(user, User::getAvatarFileId, User::setAvatarUrl);
```

## 3. FileosDownloadApi — 文件下载

`FileosDownloadApi` 提供服务端文件流下载，适用于后端需要读取文件内容的场景。

### 全量下载

```java
// 全量下载 — 下载整个文件
// 返回 InputStream，可自行处理文件流
InputStream inputStream = fileosDownloadApi.download("path/to/file.pdf");

// 处理下载的文件
byte[] bytes = inputStream.readAllBytes();
inputStream.close();
```

### 范围下载

范围下载支持断点续传，适用于大文件分段下载或恢复下载：

```java
// 范围下载 — 下载文件的指定字节范围
// start 和 end 是字节偏移量，从 0 开始
// 支持断点续传：记录已下载位置，从断点处继续下载
InputStream inputStream = fileosDownloadApi.download("path/to/file.pdf", 1024, 4096);
// 从第 1024 字节开始，下载到第 4096 字节

// 断点续传示例：假设已下载 1024 字节，继续下载后续内容
long downloadedBytes = 1024;
long fileSize = 10240; // 假设文件总大小
InputStream remainingStream = fileosDownloadApi.download("path/to/file.pdf", downloadedBytes, fileSize - 1);
```

## 4. FileosDeleteApi — 文件删除

`FileosDeleteApi` 提供单文件和批量删除能力。

### 单文件删除

```java
// 单文件删除
// 删除时会同时：
// 1. 从存储后端（OSS）删除文件
// 2. 从数据库删除文件记录
Integer count = fileosDeleteApi.delete("path/to/file.jpg");
// 返回删除的文件数量（通常为 1）
```

### 批量删除

```java
// 批量删除
// 一次删除多个文件，提高效率
List<String> fileIds = List.of("file1.jpg", "file2.png", "file3.doc");
Integer count = fileosDeleteApi.delete(fileIds);
// 返回删除的文件总数
```

## 5. FileosPresignUploadApi — 预签名上传

`FileosPresignUploadApi` 提供客户端直传能力，后端仅生成预签名 URL，文件由前端/客户端直接上传到 OSS，减轻服务端带宽压力。

### 预签名简单上传

```java
// 预签名简单上传
// 生成预签名 URL，交给前端 PUT 上传
PresignUploadRequest request = new PresignUploadRequest();
// 文件名
request.setFileName("photo.jpg");
// 文件大小（字节）
request.setFileSize(1024L * 100);
// MIME 类型
request.setContentType("image/jpeg");
// 业务分类
request.setCategory("avatar");
// 指定 Bucket
request.setBucketName("my-bucket");
// 是否公开读
request.setIsPublic(false);
// 预签名 URL 过期时间（分钟）
request.setExpireMinutes(30);
// 生成预签名 URL
PresignUploadResponse response = fileosPresignUploadApi.presignUpload(request);
// response.getPresignUrl() — 预签名上传 URL，交给前端 PUT 上传
// response.getFileId() — 文件唯一标识，用于后续确认
// response.getOssSp() — OSS 服务商
// response.getBucketName() — Bucket 名称
```

**前端上传流程**：

```javascript
// 1. 前端获取预签名 URL
const { fileId, presignUrl, ossSp, bucketName } = response;

// 2. 前端直接 PUT 文件到 OSS
fetch(presignUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: file
});

// 3. 上传完成后调用确认接口（见下方"预签名简单上传完成确认"）
```

### 预签名批量简单上传

```java
// 预签名批量简单上传
// 一次生成多个文件的预签名 URL
List<PresignUploadRequest> requestList = new ArrayList<>();
// 添加第一个文件的请求
PresignUploadRequest req1 = new PresignUploadRequest();
req1.setFileName("photo1.jpg");
req1.setFileSize(1024L * 100);
req1.setContentType("image/jpeg");
req1.setCategory("photos");
requestList.add(req1);
// 添加更多文件...
// 生成批量预签名 URL
List<PresignUploadResponse> responses = fileosPresignUploadApi.presignUploadBatch(requestList);
```

### 预签名分片上传

预签名分片上传适用于大文件，支持并行上传多个分片：

```java
// 预签名分片上传 — 初始化
// 创建分片上传任务，获取各分片的预签名 URL
MultipartUploadInitRequest initRequest = new MultipartUploadInitRequest();
// 文件名
initRequest.setFileName("big-file.zip");
// 文件总大小
initRequest.setFileSize(1024L * 1024 * 200);
// MIME 类型
initRequest.setContentType("application/zip");
// 业务分类
initRequest.setCategory("archive");
// 分片总数
initRequest.setPartCount(20);
// 预签名 URL 过期时间
initRequest.setExpireMinutes(60);
// 初始化分片上传
MultipartUploadInitResponse initResponse = fileosPresignUploadApi.initMultipartUpload(initRequest);
// initResponse.getParts() — 包含每个分片的预签名 URL 和序号
// initResponse.getUploadId() — 分片上传 ID
// initResponse.getFileId() — 文件唯一标识
```

```java
// 预签名分片上传 — 完成
// 当所有分片上传完成后，调用此方法合并分片
MultipartCompleteRequest completeRequest = new MultipartCompleteRequest();
completeRequest.setUploadId(initResponse.getUploadId());
completeRequest.setFileId(initResponse.getFileId());
completeRequest.setBucketName("my-bucket");
completeRequest.setOssSp(initResponse.getOssSp());
completeRequest.setFileName("big-file.zip");
completeRequest.setFileSize(1024L * 1024 * 200);
completeRequest.setParts(completedParts);
MdmFileosRecordDto record = fileosPresignUploadApi.completeMultipartUpload(completeRequest);
```

```java
// 预签名分片上传 — 中止
// 当分片上传失败或需要取消时，调用此方法中止上传
fileosPresignUploadApi.abortMultipartUpload(uploadId, fileId, bucketName, ossSp);
```

### 预签名简单上传完成确认

前端完成 PUT 上传后，需要调用此方法确认上传完成，生成文件记录：

```java
// 预签名简单上传 — 完成确认
// 前端 PUT 完成后调用此方法，确认上传并生成文件记录
PresignCompleteRequest completeRequest = new PresignCompleteRequest();
// 文件唯一标识（预签名时返回）
completeRequest.setFileId(response.getFileId());
// OSS 服务商（预签名时返回）
completeRequest.setOssSp(response.getOssSp());
// Bucket 名称（预签名时返回）
completeRequest.setBucketName(response.getBucketName());
// 文件名
completeRequest.setFileName("photo.jpg");
// 文件大小
completeRequest.setFileSize(1024L * 100);
// 业务分类
completeRequest.setCategory("avatar");
// 是否公开读
completeRequest.setIsPublic(false);
// 确认上传完成，返回文件记录
MdmFileosRecordDto record = fileosPresignUploadApi.presignComplete(completeRequest);
```

### 预签名批量完成确认

```java
// 预签名批量完成确认
// 批量确认多个文件上传完成
List<PresignCompleteRequest> completeRequests = new ArrayList<>();
// 添加每个文件的确认请求...
List<MdmFileosRecordDto> records = fileosPresignUploadApi.presignCompleteBatch(completeRequests);
```

## 6. 完整使用场景示例

### 用户头像上传场景

此场景展示完整的用户头像上传流程，包括上传、存储和签名访问：

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;
    @Autowired
    private FileosUploadApi fileosUploadApi;
    @Autowired
    private FileosSignApi fileosSignApi;

    /**
     * 上传用户头像
     * 后端接收前端上传的头像文件，存储到 OSS，并更新用户信息
     */
    public String uploadAvatar(Long userId, MultipartFile file) {
        // 1. 上传文件，使用 avatar 分类标识头像
        MdmFileosRecordDto dto = fileosUploadApi.upload(file, "avatar");

        // 2. 更新用户头像字段，存储 fileId
        User user = new User();
        user.setId(userId);
        user.setAvatarFileId(dto.getFileId());
        userMapper.updateById(user);

        // 3. 返回预览 URL（临时签名，10分钟有效）
        return dto.getPreviewUrl();
    }

    /**
     * 获取用户信息（包含签名后的头像 URL）
     * 用户头像默认私有，需要签名后才能访问
     */
    public UserVo getUserInfo(Long userId) {
        // 1. 获取用户信息
        User user = userMapper.selectById(userId);
        UserVo vo = new UserVo();
        BeanUtils.copyProperties(user, vo);

        // 2. 签名头像 URL，使前端可以访问私有文件
        if (StringUtils.isNotBlank(user.getAvatarFileId())) {
            // 生成带签名的临时访问 URL，默认 10 分钟有效
            String avatarUrl = fileosSignApi.sign(user.getAvatarFileId());
            vo.setAvatarUrl(avatarUrl);
        }

        return vo;
    }

    /**
     * 批量获取用户信息（批量签名头像）
     * 批量操作时使用泛型签名，提高效率
     */
    public List<UserVo> listUserInfo() {
        // 1. 批量获取用户列表
        List<User> users = userMapper.selectList();
        List<UserVo> vos = users.stream()
            .map(user -> {
                UserVo vo = new UserVo();
                BeanUtils.copyProperties(user, vo);
                return vo;
            })
            .collect(Collectors.toList());

        // 2. 批量签名头像 URL
        // 自动对列表中每个用户的 avatarFileId 签名并回填到 avatarUrl
        fileosSignApi.sign(vos, UserVo::getAvatarFileId, UserVo::setAvatarUrl);

        return vos;
    }
}

// VO 对象定义
public class UserVo {
    private Long id;
    private String name;
    private String avatarFileId;   // 原始 fileId
    private String avatarUrl;       // 签名后的访问 URL
    // getters and setters
}
```

### 富文本编辑器场景

此场景展示在富文本编辑器中使用文件上传和签名功能：

```java
@Service
public class ArticleService {

    @Autowired
    private FileosUploadApi fileosUploadApi;
    @Autowired
    private FileosSignApi fileosSignApi;
    @Autowired
    private ArticleMapper articleMapper;

    /**
     * 保存文章（处理内容中的文件）
     * 富文本编辑器中可能包含多个图片，需要统一处理
     */
    public void saveArticle(Article article) {
        // 保存原始文章内容（包含 fileId）
        // 前端上传图片时会将 fileId 嵌入到内容中
        articleMapper.insert(article);
    }

    /**
     * 获取文章（返回签名后的内容）
     * 读取文章时需要将内容中的 fileId 替换为签名后的访问 URL
     */
    public ArticleVo getArticle(Long id) {
        // 1. 获取文章内容
        Article article = articleMapper.selectById(id);
        ArticleVo vo = new ArticleVo();
        BeanUtils.copyProperties(article, vo);

        // 2. 对内容中的文件 URL 进行签名
        // 富文本内容中可能包含多个图片的 fileId
        // signContent 会自动提取内容中的 fileId，生成签名 URL 并替换
        String signedContent = fileosSignApi.signContent(article.getContent());
        vo.setContent(signedContent);

        return vo;
    }

    /**
     * 批量处理文章列表
     */
    public List<ArticleVo> listArticles() {
        List<Article> articles = articleMapper.selectList();
        return articles.stream()
            .map(article -> {
                ArticleVo vo = new ArticleVo();
                BeanUtils.copyProperties(article, vo);
                // 签名内容中的文件
                vo.setContent(fileosSignApi.signContent(article.getContent()));
                return vo;
            })
            .collect(Collectors.toList());
    }
}

// 文章实体定义
public class Article {
    private Long id;
    private String title;
    private String content;         // 富文本内容，包含 fileId
    private LocalDateTime createTime;
}

// 文章 VO 定义
public class ArticleVo {
    private Long id;
    private String title;
    private String content;         // 签名后的内容
    private LocalDateTime createTime;
}
```

### 大文件分片上传场景

此场景展示大文件（如视频）如何进行分片上传：

```java
@Service
public class VideoService {

    @Autowired
    private FileosPresignUploadApi fileosPresignUploadApi;
    @Autowired
    private VideoMapper videoMapper;

    /**
     * 初始化视频上传
     * 后端生成预签名 URL，交给前端上传
     */
    public VideoUploadInitResponse initUpload(VideoUploadRequest request) {
        // 1. 创建分片上传任务
        MultipartUploadInitRequest initRequest = new MultipartUploadInitRequest();
        initRequest.setFileName(request.getFileName());
        initRequest.setFileSize(request.getFileSize());
        initRequest.setContentType(request.getContentType());
        initRequest.setCategory("video");
        initRequest.setPartCount(request.getPartCount());
        initRequest.setExpireMinutes(60);  // 分片 URL 有效期

        // 2. 初始化分片上传
        MultipartUploadInitResponse initResponse = fileosPresignUploadApi.initMultipartUpload(initRequest);

        // 3. 保存视频记录
        Video video = new Video();
        video.setFileId(initResponse.getFileId());
        video.setFileName(request.getFileName());
        video.setFileSize(request.getFileSize());
        video.setUploadStatus("UPLOADING");
        videoMapper.insert(video);

        // 4. 返回上传信息给前端
        return new VideoUploadInitResponse()
            .setUploadId(initResponse.getUploadId())
            .setFileId(initResponse.getFileId())
            .setParts(initResponse.getParts());  // 各分片的预签名 URL
    }

    /**
     * 完成视频上传
     * 前端上传完所有分片后调用此方法
     */
    public MdmFileosRecordDto completeUpload(CompleteUploadRequest request) {
        // 1. 构建分片完成信息
        MultipartCompleteRequest completeRequest = new MultipartCompleteRequest();
        completeRequest.setUploadId(request.getUploadId());
        completeRequest.setFileId(request.getFileId());
        completeRequest.setFileName(request.getFileName());
        completeRequest.setFileSize(request.getFileSize());
        completeRequest.setCategory("video");
        completeRequest.setParts(request.getCompletedParts());  // 各分片的 ETag

        // 2. 完成分片上传
        MdmFileosRecordDto record = fileosPresignUploadApi.completeMultipartUpload(completeRequest);

        // 3. 更新视频记录状态
        Video video = new Video();
        video.setId(request.getVideoId());
        video.setUploadStatus("COMPLETED");
        videoMapper.updateById(video);

        return record;
    }

    /**
     * 中止视频上传
     * 上传失败时清理已上传的分片
     */
    public void abortUpload(String uploadId, String fileId, String bucketName, String ossSp) {
        // 中止分片上传并清理
        fileosPresignUploadApi.abortMultipartUpload(uploadId, fileId, bucketName, ossSp);

        // 更新视频记录状态
        Video video = new Video();
        video.setFileId(fileId);
        video.setUploadStatus("ABORTED");
        videoMapper.update(video);
    }
}
```

### 批量文件管理场景

此场景展示如何批量处理文件上传和删除：

```java
@Service
public class DocumentService {

    @Autowired
    private FileosUploadApi fileosUploadApi;
    @Autowired
    private FileosDeleteApi fileosDeleteApi;
    @Autowired
    private FileosSignApi fileosSignApi;
    @Autowired
    private DocumentMapper documentMapper;

    /**
     * 批量上传文档
     */
    public List<DocumentDto> uploadDocuments(List<MultipartFile> files) {
        List<DocumentDto> results = new ArrayList<>();

        for (MultipartFile file : files) {
            // 1. 上传文件，分类为 document
            MdmFileosRecordDto record = fileosUploadApi.upload(file, "document");

            // 2. 保存文档记录
            Document doc = new Document();
            doc.setFileId(record.getFileId());
            doc.setFileName(record.getFileName());
            doc.setFileSize(record.getFileSize());
            documentMapper.insert(doc);

            // 3. 构建返回结果
            results.add(new DocumentDto()
                .setId(doc.getId())
                .setFileId(record.getFileId())
                .setFileName(record.getFileName())
                .setPreviewUrl(record.getPreviewUrl()));
        }

        return results;
    }

    /**
     * 批量删除文档
     */
    public int deleteDocuments(List<Long> documentIds) {
        // 1. 查询要删除的文档
        List<Document> documents = documentMapper.selectBatchIds(documentIds);

        // 2. 提取 fileId 列表
        List<String> fileIds = documents.stream()
            .map(Document::getFileId)
            .collect(Collectors.toList());

        // 3. 批量删除文件
        Integer deletedCount = fileosDeleteApi.delete(fileIds);

        // 4. 删除文档记录（文件记录由 FileosDeleteApi 自动删除）

        return deletedCount;
    }

    /**
     * 获取文档列表（批量签名）
     */
    public List<DocumentVo> listDocuments() {
        // 1. 查询文档列表
        List<Document> documents = documentMapper.selectList();
        List<DocumentVo> vos = documents.stream()
            .map(doc -> {
                DocumentVo vo = new DocumentVo();
                vo.setId(doc.getId());
                vo.setFileId(doc.getFileId());
                vo.setFileName(doc.getFileName());
                vo.setFileSize(doc.getFileSize());
                return vo;
            })
            .collect(Collectors.toList());

        // 2. 批量签名文档访问 URL
        fileosSignApi.sign(vos, DocumentVo::getFileId, DocumentVo::setAccessUrl);

        return vos;
    }
}

// 请求和响应 DTO
public class DocumentDto {
    private Long id;
    private String fileId;
    private String fileName;
    private String previewUrl;
}

public class DocumentVo {
    private Long id;
    private String fileId;
    private String fileName;
    private Long fileSize;
    private String accessUrl;  // 签名后的访问 URL
}

public class VideoUploadRequest {
    private String fileName;
    private Long fileSize;
    private String contentType;
    private Integer partCount;
}

public class VideoUploadInitResponse {
    private String uploadId;
    private String fileId;
    private List<PresignedPartInfo> parts;
}

public class CompleteUploadRequest {
    private Long videoId;
    private String uploadId;
    private String fileId;
    private String fileName;
    private Long fileSize;
    private List<CompletedPartInfo> completedParts;
}
```
