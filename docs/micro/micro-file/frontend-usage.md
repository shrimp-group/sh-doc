# 前端使用指南

## 文件上传接口

### 私有文件上传

```http
POST /common/upload
Content-Type: multipart/form-data
```

**请求参数**：

| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| file | File | 是 | 要上传的文件 |
| busnessType | String | 是 | 业务类型，如：user_avatar, order_attach |
| bucket | String | 否 | 指定 Bucket，不传使用默认 Bucket |
| fileName | String | 否 | 自定义文件名，不传使用原文件名 |

**请求示例**：

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('busnessType', 'user_avatar');

fetch('/common/upload', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log(data);
});
```

**响应示例**：

```json
{
  "code": 1,
  "data": {
    "previewUrl": "https://xxx.aliyuncs.com/user_avatar/20240115/xxx.jpg?OSSAccessKeyId=...",
    "fileSize": 12345,
    "busnessType": "user_avatar",
    "fileName": "avatar.jpg",
    "fileType": "jpg",
    "ossSp": "ALI_OSS",
    "bucket": "my-bucket",
    "fileId": "user_avatar/20240115/a1b2c3d4.jpg"
  }
}
```

**字段说明**：

| 字段名 | 说明 |
|--------|------|
| previewUrl | 临时预览 URL（10分钟有效） |
| fileId | 文件唯一标识，用于后续签名访问 |
| fileSize | 文件大小（字节） |
| fileName | 文件名 |
| fileType | 文件类型 |

### 公有文件上传

```http
POST /common/upload/public
Content-Type: multipart/form-data
```

**请求参数**：与私有文件上传相同

**响应示例**：与私有文件上传相同

**注意**：公有文件上传后无需签名即可直接访问，请谨慎使用。

## 文件访问

### 私有文件访问

私有文件需要通过后端签名后才能访问。

**流程**：

1. 前端保存文件上传返回的 `fileId`
2. 需要访问文件时，调用后端接口获取签名 URL
3. 使用签名 URL 访问文件

**后端签名接口示例**：

```javascript
// 获取单文件签名 URL
fetch(`/api/file/sign?fileId=${fileId}`)
  .then(response => response.json())
  .then(data => {
    const signedUrl = data.data; // 签名后的 URL
    // 使用 signedUrl 显示图片或下载文件
  });

// 批量获取签名 URL
fetch('/api/file/sign/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileIds: ['fileId1', 'fileId2'] })
})
  .then(response => response.json())
  .then(data => {
    const signedUrls = data.data; // 签名后的 URL 数组
  });
```

### 公有文件访问

公有文件可直接使用外网 Endpoint + fileId 访问：

```
https://{外网Endpoint}/{fileId}

示例：
https://my-bucket.oss-cn-hangzhou.aliyuncs.com/public/logo/20240115/xxx.png
```

## 完整示例

### 用户头像上传组件

```vue
<template>
  <div class="avatar-upload">
    <img v-if="avatarUrl" :src="avatarUrl" class="avatar" />
    <input type="file" @change="handleFileChange" accept="image/*" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      avatarUrl: '',
      fileId: ''
    };
  },
  methods: {
    async handleFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;

      // 上传文件
      const formData = new FormData();
      formData.append('file', file);
      formData.append('busnessType', 'user_avatar');

      try {
        const response = await fetch('/common/upload', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();

        if (result.code === 1) {
          this.fileId = result.data.fileId;
          this.avatarUrl = result.data.previewUrl; // 临时预览

          // 保存 fileId 到用户信息
          await this.saveUserAvatar(result.data.fileId);
        }
      } catch (error) {
        console.error('上传失败:', error);
      }
    },

    async saveUserAvatar(fileId) {
      // 调用后端接口保存头像
      await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: fileId })
      });
    },

    async loadUserAvatar() {
      // 获取用户信息（包含签名后的头像 URL）
      const response = await fetch('/api/user/info');
      const result = await response.json();

      if (result.code === 1) {
        this.avatarUrl = result.data.avatarUrl; // 签名后的 URL
      }
    }
  },
  mounted() {
    this.loadUserAvatar();
  }
};
</script>
```

### 富文本编辑器文件上传

```javascript
// 在富文本编辑器中集成文件上传
const editorConfig = {
  // ... 其他配置
  uploadImage: {
    async customUpload(file, insertFn) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('busnessType', 'article_image');

      try {
        const response = await fetch('/common/upload', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();

        if (result.code === 1) {
          // 插入图片到编辑器
          // 注意：这里插入的是 fileId，不是 previewUrl
          insertFn(result.data.fileId, result.data.fileName, result.data.previewUrl);
        }
      } catch (error) {
        console.error('上传失败:', error);
      }
    }
  }
};

// 获取文章时，后端会自动对内容中的 fileId 进行签名
async function loadArticle(id) {
  const response = await fetch(`/api/article/${id}`);
  const result = await response.json();

  if (result.code === 1) {
    // result.data.content 中的图片 URL 已经被签名
    editor.setHtml(result.data.content);
  }
}
```

## 注意事项

1. **文件大小限制**：上传前可在前端进行文件大小检查，避免不必要的上传请求
2. **文件类型限制**：建议在前端限制可选择的文件类型
3. **签名 URL 过期**：私有文件的预览 URL 只有 10 分钟有效期，不要长期保存
4. **保存 fileId**：数据库中应保存 fileId，而不是 previewUrl
5. **公有文件慎用**：公有文件可被任何人访问，敏感文件请使用私有上传
