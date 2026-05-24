# 功能使用

## 注入 Fileos API

```java
@Autowired
private FileosUploadApi fileosUploadApi;

@Autowired
private FileosSignApi fileosSignApi;

@Autowired
private FileosDownloadApi fileosDownloadApi;

@Autowired
private FileosDeleteApi fileosDeleteApi;

@Autowired
private FileosPresignUploadApi fileosPresignUploadApi;
```

## 文件上传（服务端代理）

使用 `FileosUploadApi` 进行文件上传。

### 私有文件上传

私有文件上传后需要签名才能访问，这是默认且推荐的方式。

```java
// 简单上传（使用默认 Bucket）
MdmFileosRecordDto dto = fileosUploadApi.upload(file);

// 指定业务分类
MdmFileosRecordDto dto = fileosUploadApi.upload(file, "avatar");

// 指定业务分类和 Bucket
MdmFileosRecordDto dto = fileosUploadApi.upload(file, "avatar", "my-bucket");

// 指定业务分类、Bucket、是否公开
MdmFileosRecordDto dto = fileosUploadApi.upload(file, "avatar", "my-bucket", false);

// 使用 FileosUploadRequest 精细控制
FileosUploadRequest request = new FileosUploadRequest();
request.setCategory("avatar");
request.setBucketName("my-bucket");
request.setIsPublic(false);
request.setImageProcess("{\"resize\":{\"width\":200,\"height\":200,\"mode\":\"lfit\"}}");
MdmFileosRecordDto dto = fileosUploadApi.upload(file, request);
```

返回结果：

```java
public class MdmFileosRecordDto {
    private Long id;
    private String fileId;       // 文件唯一ID，如：sh-fileos/prod/avatar/20240115/xxx.jpg
    private String fileName;     // 文件名
    private String fileType;     // 文件类型
    private Long fileSize;       // 文件大小
    private String fileHash;     // 文件Hash
    private String contentType;  // Content-Type
    private String category;     // 业务分类
    private String dirPath;      // 目录路径
    private Integer isPublic;    // 是否公开
    private String ossSp;        // 存储服务商，如：ALI_OSS
    private String bucketName;   // Bucket名称
    private String uploadType;   // 上传方式，如：SIMPLE
    private String uploadId;     // 分片上传ID
    private String uploadStatus; // 上传状态，如：COMPLETED
    private String imageProcess; // 图片处理参数
    private String previewUrl;   // 预览URL（临时签名，10分钟有效）
    private Integer sort;
    private LocalDateTime createTime;
    private String createBy;
}
```

### 公有文件上传（慎用）

公有文件上传后无需签名即可直接访问，请谨慎使用。

```java
// 公有文件上传
MdmFileosRecordDto dto = fileosUploadApi.upload(file, "public_assets", "public-bucket", true);
```

**适用场景**：
- 网站 Logo
- 公共资源
- 无需权限控制的静态文件

### 分片上传

适用于大文件上传，支持断点续传。

```java
// 1. 初始化分片上传
MultipartUploadInitRequest initRequest = new MultipartUploadInitRequest();
initRequest.setFileName("large-video.mp4");
initRequest.setFileSize(1024L * 1024 * 500); // 500MB
initRequest.setContentType("video/mp4");
initRequest.setCategory("video");
initRequest.setBucketName("media-bucket");
initRequest.setPartCount(100);
MultipartUploadInitResponse initResponse = fileosUploadApi.initMultipartUpload(initRequest);
// initResponse 包含 uploadId、fileId、各分片预签名 URL

// 2. 上传各个分片（前端可使用预签名 URL 直接上传到 OSS）
// ...

// 3. 完成分片上传
MultipartCompleteRequest completeRequest = new MultipartCompleteRequest();
completeRequest.setUploadId(initResponse.getUploadId());
completeRequest.setFileId(initResponse.getFileId());
completeRequest.setBucketName("media-bucket");
completeRequest.setOssSp(initResponse.getOssSp());
completeRequest.setFileName("large-video.mp4");
completeRequest.setFileSize(1024L * 1024 * 500);
completeRequest.setCategory("video");
List<CompletedPartInfo> parts = new ArrayList<>();
parts.add(new CompletedPartInfo() {{ setPartNumber(1); setETag("etag-1"); }});
// ... 添加更多分片信息
completeRequest.setParts(parts);
MdmFileosRecordDto dto = fileosUploadApi.completeMultipartUpload(completeRequest);

// 4. 中止分片上传（可选）
fileosUploadApi.abortMultipartUpload(uploadId, fileId, bucketName, ossSp);
```

## 文件签名访问

使用 `FileosSignApi` 为私有文件生成临时访问签名 URL。

### 单文件签名

```java
// 默认10分钟有效期
String signedUrl = fileosSignApi.sign(fileId);

// 自定义有效期（30分钟）
String signedUrl = fileosSignApi.sign(fileId, 30, TimeUnit.MINUTES);

// 自定义有效期（1小时）
String signedUrl = fileosSignApi.sign(fileId, 1, TimeUnit.HOURS);
```

### 批量文件签名

```java
// List 批量签名
List<String> fileIds = Arrays.asList("file1", "file2", "file3");
List<String> signedUrls = fileosSignApi.sign(fileIds);

// 自定义过期时间批量签名
List<String> signedUrls = fileosSignApi.sign(fileIds, 30, TimeUnit.MINUTES);
```

### 对象属性签名

对 Java 对象中的文件 ID 字段进行签名：

```java
// 单个对象签名
User user = userService.getById(1L);
fileosSignApi.sign(user, User::getAvatar, User::setAvatarUrl);
// 执行后：user.getAvatarUrl() 得到签名后的 URL

// 批量对象签名
List<User> userList = userService.list();
fileosSignApi.sign(userList, User::getAvatar, User::setAvatarUrl);
```

### 富文本内容签名

自动提取富文本中的文件 URL 并签名替换：

```java
// 原始 HTML 内容
String htmlContent = "<p>用户头像：<img src='sh-fileos/prod/avatar/20240115/a1b2c3d4.jpg'/></p>" +
                     "<p>订单截图：<img src='sh-fileos/prod/order_attach/20240115/e5f6g7h8.png'/></p>";

// 签名替换
String signedContent = fileosSignApi.signContent(htmlContent);

// 结果：
// <p>用户头像：<img src='https://xxx.aliyuncs.com/sh-fileos/prod/avatar/20240115/a1b2c3d4.jpg?OSSAccessKeyId=...'/></p>
// <p>订单截图：<img src='https://xxx.aliyuncs.com/sh-fileos/prod/order_attach/20240115/e5f6g7h8.png?OSSAccessKeyId=...'/></p>
```

### 基于文件记录签名

```java
// 根据 MdmFileosRecord 对象签名
MdmFileosRecord fileRecord = fileRecordService.getById(1L);
String signedUrl = fileosSignApi.sign(fileRecord);

// 根据 MdmFileosRecord 对象签名（自定义过期时间）
String signedUrl = fileosSignApi.sign(fileRecord, 30, TimeUnit.MINUTES);

// 批量签名
List<MdmFileosRecord> fileRecords = fileRecordService.list();
List<String> signedUrls = fileosSignApi.sign(fileRecords);
```

## 文件下载

使用 `FileosDownloadApi` 下载文件。

### 全量下载

```java
// 全量下载
InputStream inputStream = fileosDownloadApi.download(fileId);
```

### 范围下载（断点续传）

```java
// 范围下载
InputStream inputStream = fileosDownloadApi.download(fileId, offset, length);
```

## 文件删除

使用 `FileosDeleteApi` 删除文件。

### 单文件删除

```java
// 根据 fileId 删除
Integer deletedCount = fileosDeleteApi.delete("sh-fileos/prod/avatar/20240115/a1b2c3d4.jpg");

// 删除时会同时：
// 1. 从存储后端删除文件
// 2. 从数据库删除记录
```

### 批量删除

```java
// 批量删除
List<String> fileIds = Arrays.asList(
    "sh-fileos/prod/avatar/20240115/a1b2c3d4.jpg",
    "sh-fileos/prod/avatar/20240115/e5f6g7h8.jpg"
);
Integer deletedCount = fileosDeleteApi.delete(fileIds);
```

## 预签名上传（前端直传）

使用 `FileosPresignUploadApi` 生成预签名 URL，让前端直接上传到 OSS。

### 预签名简单上传

```java
// 1. 获取预签名 URL
PresignUploadRequest request = new PresignUploadRequest();
request.setFileName("photo.jpg");
request.setFileSize(1024L * 100);
request.setContentType("image/jpeg");
request.setCategory("avatar");
request.setBucketName("my-bucket");
request.setIsPublic(false);
request.setExpireMinutes(30);
PresignUploadResponse response = fileosPresignUploadApi.presignUpload(request);
// response.getPresignUrl() 交给前端 PUT 上传
// response.getFileId() 用于后续确认

// 2. 前端上传完成后，后端确认上传
PresignCompleteRequest completeRequest = new PresignCompleteRequest();
completeRequest.setFileId(response.getFileId());
completeRequest.setOssSp(response.getOssSp());
completeRequest.setBucketName(response.getBucketName());
completeRequest.setFileName("photo.jpg");
completeRequest.setFileSize(1024L * 100);
completeRequest.setCategory("avatar");
completeRequest.setIsPublic(false);
MdmFileosRecordDto dto = fileosPresignUploadApi.presignComplete(completeRequest);
```

### 预签名批量简单上传

```java
// 批量获取预签名 URL
List<PresignUploadRequest> requests = new ArrayList<>();
// ... 添加多个请求
List<PresignUploadResponse> responses = fileosPresignUploadApi.presignUploadBatch(requests);

// 批量确认上传
List<PresignCompleteRequest> completeRequests = new ArrayList<>();
// ... 添加多个确认请求
List<MdmFileosRecordDto> records = fileosPresignUploadApi.presignCompleteBatch(completeRequests);
```

### 预签名分片上传

```java
// 1. 初始化分片上传，获取各分片的预签名 URL
MultipartUploadInitRequest initRequest = new MultipartUploadInitRequest();
initRequest.setFileName("big-file.zip");
initRequest.setFileSize(1024L * 1024 * 200);
initRequest.setContentType("application/zip");
initRequest.setCategory("archive");
initRequest.setPartCount(40);
initRequest.setExpireMinutes(60);
MultipartUploadInitResponse initResponse = fileosPresignUploadApi.initMultipartUpload(initRequest);
// initResponse.getParts() 包含每个分片的预签名 URL

// 2. 前端使用预签名 URL 上传各个分片
// ...

// 3. 完成分片上传
MultipartCompleteRequest completeRequest = new MultipartCompleteRequest();
completeRequest.setUploadId(initResponse.getUploadId());
completeRequest.setFileId(initResponse.getFileId());
completeRequest.setBucketName("my-bucket");
completeRequest.setOssSp(initResponse.getOssSp());
completeRequest.setFileName("big-file.zip");
completeRequest.setFileSize(1024L * 1024 * 200);
completeRequest.setParts(completedParts);
MdmFileosRecordDto dto = fileosPresignUploadApi.completeMultipartUpload(completeRequest);

// 4. 中止分片上传（可选）
fileosPresignUploadApi.abortMultipartUpload(uploadId, fileId, bucketName, ossSp);
```

## Bucket 缓存管理

```java
@Autowired
private BucketCache bucketCache;

// 手动刷新缓存（配置变更后调用）
bucketCache.clearCache();

// 获取默认 Bucket
MdmFileosBucket bucket = bucketCache.get();

// 获取指定 Bucket
MdmFileosBucket bucket = bucketCache.get("my-bucket");
```

## REST API 接口

模块提供了 REST 接口供前端直接调用。所有接口前缀为 `/micro-fileos`。

### 文件上传接口

```http
POST /micro-fileos/upload/simple
Content-Type: multipart/form-data

参数:
- file: 文件 (必填)
- category: 业务分类 (可选)
- bucketName: 指定 Bucket (可选)
```

**请求示例**：

```bash
curl -X POST http://localhost:8080/micro-fileos/upload/simple \
  -F "file=@/path/to/avatar.jpg" \
  -F "category=avatar"
```

**响应示例**：

```json
{
    "code": 1,
    "data": {
        "previewUrl": "https://xxx.aliyuncs.com/sh-fileos/prod/avatar/20240115/xxx.jpg?OSSAccessKeyId=...",
        "fileSize": 12345,
        "category": "avatar",
        "fileName": "avatar.jpg",
        "fileType": "jpg",
        "ossSp": "ALI_OSS",
        "bucketName": "my-bucket",
        "fileId": "sh-fileos/prod/avatar/20240115/a1b2c3d4.jpg"
    }
}
```

### 公有文件上传接口

```http
POST /micro-fileos/upload/simple/public
Content-Type: multipart/form-data

参数:
- file: 文件 (必填)
- category: 业务分类 (可选)
- bucketName: 指定 Bucket (可选)
```

### 签名 URL 接口

```http
GET /micro-fileos/sign/url?fileId=xxx&expireMinutes=30
```

```http
POST /micro-fileos/sign/urls
Content-Type: application/json

["file1", "file2", "file3"]
```

### 完整接口列表

详见 [功能集成](./integration.md) 文档。

## 完整使用示例

### 用户头像上传场景

```java
@Service
public class UserService {
    
    @Autowired
    private FileosUploadApi fileosUploadApi;
    @Autowired
    private FileosSignApi fileosSignApi;
    @Autowired
    private UserMapper userMapper;
    
    /**
     * 上传用户头像
     */
    public String uploadAvatar(Long userId, MultipartFile file) {
        // 1. 上传文件
        MdmFileosRecordDto dto = fileosUploadApi.upload(file, "avatar");
        
        // 2. 更新用户头像
        User user = new User();
        user.setId(userId);
        user.setAvatar(dto.getFileId());
        userMapper.updateById(user);
        
        // 3. 返回预览 URL
        return dto.getPreviewUrl();
    }
    
    /**
     * 获取用户信息（包含签名后的头像 URL）
     */
    public UserVo getUserInfo(Long userId) {
        User user = userMapper.selectById(userId);
        UserVo vo = new UserVo();
        BeanUtils.copyProperties(user, vo);
        
        // 签名头像 URL
        if (StringUtils.isNotBlank(user.getAvatar())) {
            String avatarUrl = fileosSignApi.sign(user.getAvatar());
            vo.setAvatarUrl(avatarUrl);
        }
        
        return vo;
    }
    
    /**
     * 批量获取用户信息（批量签名头像）
     */
    public List<UserVo> listUserInfo() {
        List<User> users = userMapper.selectList();
        List<UserVo> vos = users.stream()
            .map(user -> {
                UserVo vo = new UserVo();
                BeanUtils.copyProperties(user, vo);
                return vo;
            })
            .collect(Collectors.toList());
        
        // 批量签名头像
        fileosSignApi.sign(vos, UserVo::getAvatar, UserVo::setAvatarUrl);
        
        return vos;
    }
}
```

### 富文本编辑器场景

```java
@Service
public class ArticleService {
    
    @Autowired
    private FileosSignApi fileosSignApi;
    @Autowired
    private ArticleMapper articleMapper;
    
    /**
     * 保存文章（处理内容中的文件）
     */
    public void saveArticle(Article article) {
        // 保存原始内容（存储 fileId）
        articleMapper.insert(article);
    }
    
    /**
     * 获取文章（返回签名后的内容）
     */
    public ArticleVo getArticle(Long id) {
        Article article = articleMapper.selectById(id);
        ArticleVo vo = new ArticleVo();
        BeanUtils.copyProperties(article, vo);
        
        // 对内容中的文件 URL 进行签名
        String signedContent = fileosSignApi.signContent(article.getContent());
        vo.setContent(signedContent);
        
        return vo;
    }
}
```
