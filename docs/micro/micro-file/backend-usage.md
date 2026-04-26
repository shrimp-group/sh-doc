# 后端使用指南

## 注入 API

### API 结构

```java
// 上传 API
@Autowired
private FileUploadApi fileUploadApi;

// 签名 API
@Autowired
private FileSignApi fileSignApi;

// 删除 API
@Autowired
private FileDeleteApi fileDeleteApi;
```

## 文件上传

使用 `FileUploadApi` 进行文件上传：

### 私有文件上传

私有文件上传后需要签名才能访问，这是默认且推荐的方式。

```java
// 简单上传（使用默认 Bucket 和业务类型）
MdmFileRecordDto dto = fileUploadApi.upload(file);

// 指定业务类型
MdmFileRecordDto dto = fileUploadApi.upload(file, "user_avatar");

// 指定业务类型和 Bucket
MdmFileRecordDto dto = fileUploadApi.upload(file, "user_avatar", "my-bucket");
```

返回结果：

```java
public class MdmFileRecordDto {
    private String fileId;       // 文件唯一ID，如：user_avatar/20240115/a1b2c3d4.jpg
    private String ossSp;        // 存储服务商，如：ALI_OSS
    private String bucket;       // Bucket名称
    private String previewUrl;   // 预览URL（临时签名，10分钟有效）
    private String fileName;     // 文件名
    private String fileType;     // 文件类型
    private Long fileSize;       // 文件大小
}
```

### 公有文件上传（慎用）

公有文件上传后无需签名即可直接访问，请谨慎使用。

```java
// 公有文件上传
MdmFileRecordDto dto = fileUploadApi.uploadPublic(file, "public_assets");

// 指定 Bucket
MdmFileRecordDto dto = fileUploadApi.uploadPublic(file, "public_assets", "public-bucket");
```

**适用场景**：
- 网站 Logo
- 公共资源
- 无需权限控制的静态文件

## 文件签名访问

使用 `FileSignApi` 进行文件签名：

### 单文件签名

```java
// 默认10分钟有效期
String signedUrl = fileSignApi.sign(fileId);

// 自定义有效期（30分钟）
String signedUrl = fileSignApi.sign(fileId, 30, TimeUnit.MINUTES);

// 自定义有效期（1小时）
String signedUrl = fileSignApi.sign(fileId, 1, TimeUnit.HOURS);
```

### 批量文件签名

```java
// List 批量签名
List<String> fileIds = Arrays.asList("file1", "file2", "file3");
List<String> signedUrls = fileSignApi.sign(fileIds);

// 逗号分隔的文件ID签名
String signedUrls = fileSignApi.signs("file1,file2,file3");
// 返回: "url1,url2,url3"

// 数组签名
String[] fileIdArray = {"file1", "file2"};
String[] signedUrlArray = fileSignApi.sign(fileIdArray);
```

### 对象属性签名

对 Java 对象中的文件 ID 字段进行签名：

```java
// 单个对象签名
User user = userService.getById(1L);
fileSignApi.sign(user, User::getAvatar, User::setAvatarUrl);
// 执行后：user.getAvatarUrl() 得到签名后的 URL

// 批量对象签名
List<User> userList = userService.list();
fileSignApi.sign(userList, User::getAvatar, User::setAvatarUrl);
```

### 富文本内容签名

自动提取富文本中的文件 URL 并签名替换：

```java
// 原始 HTML 内容
String htmlContent = "<p>用户头像：<img src='user_avatar/20240115/a1b2c3d4.jpg'/></p>" +
                     "<p>订单截图：<img src='order_attach/20240115/e5f6g7h8.png'/></p>";

// 签名替换
String signedContent = fileSignApi.signContent(htmlContent);

// 结果：
// <p>用户头像：<img src='https://xxx.aliyuncs.com/user_avatar/20240115/a1b2c3d4.jpg?OSSAccessKeyId=...'/></p>
// <p>订单截图：<img src='https://xxx.aliyuncs.com/order_attach/20240115/e5f6g7h8.png?OSSAccessKeyId=...'/></p>
```

### 基于文件记录签名

```java
// 根据 MdmFileRecord 对象签名
MdmFileRecord fileRecord = fileRecordService.getById(1L);
String signedUrl = fileSignApi.sign(fileRecord);

// 根据 MdmFileRecord 对象签名（自定义过期时间）
String signedUrl = fileSignApi.sign(fileRecord, 30, TimeUnit.MINUTES);

// 批量签名
List<MdmFileRecord> fileRecords = fileRecordService.list();
List<String> signedUrls = fileSignApi.sign(fileRecords);
```

## 文件删除

使用 `FileDeleteApi` 进行文件删除：

### 单文件删除

```java
// 根据 fileId 删除
Integer deletedCount = fileDeleteApi.delete("user_avatar/20240115/a1b2c3d4.jpg");

// 删除时会同时：
// 1. 从存储后端删除文件
// 2. 从数据库删除记录
```

### 批量删除

```java
// 批量删除
List<String> fileIds = Arrays.asList(
    "user_avatar/20240115/a1b2c3d4.jpg",
    "user_avatar/20240115/e5f6g7h8.jpg"
);
Integer deletedCount = fileDeleteApi.delete(fileIds);
```

## Bucket 缓存管理

```java
@Autowired
private BucketCache bucketCache;

// 手动刷新缓存（配置变更后调用）
bucketCache.clearCache();

// 获取默认 Bucket
MdmFileBucket bucket = bucketCache.get();

// 获取指定 Bucket
MdmFileBucket bucket = bucketCache.get("my-bucket");
```

## 完整使用示例

### 用户头像上传场景

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;
    @Autowired
    private FileSignApi fileSignApi;
    @Autowired
    private FileUploadApi fileUploadApi;

    /**
     * 上传用户头像
     */
    public String uploadAvatar(Long userId, MultipartFile file) {
        // 1. 上传文件
        MdmFileRecordDto dto = fileUploadApi.upload(file, "user_avatar");

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
            String avatarUrl = fileSignApi.sign(user.getAvatar());
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
        fileSignApi.sign(vos, UserVo::getAvatar, UserVo::setAvatarUrl);

        return vos;
    }
}
```

### 富文本编辑器场景

```java
@Service
public class ArticleService {

    @Autowired
    private FileUploadApi fileUploadApi;
    @Autowired
    private FileSignApi fileSignApi;
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
        String signedContent = fileSignApi.signContent(article.getContent());
        vo.setContent(signedContent);

        return vo;
    }
}
```
