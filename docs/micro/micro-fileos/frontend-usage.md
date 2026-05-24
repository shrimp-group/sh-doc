# micro-fileos 前端使用指南

## 1. FileosUploader 组件设计

### 1.1 Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'simple' \| 'presign' \| 'multipart'` | `'presign'` | 上传模式 |
| `accept` | `string` | — | 允许的文件类型 |
| `multiple` | `boolean` | `false` | 是否允许多文件 |
| `maxSize` | `number` | `50` (MB) | 单文件最大大小 |
| `category` | `string` | — | 业务分类 |
| `bucketName` | `string` | — | 指定 Bucket |
| `isPublic` | `boolean` | `false` | 是否公开读 |
| `autoUpload` | `boolean` | `true` | 选择后自动上传 |
| `chunkSize` | `number` | `5` (MB) | 分片大小 |
| `concurrency` | `number` | `3` | 并发上传数 |
| `imageProcess` | `object` | — | 图片处理参数 |

### 1.2 Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `upload-start` | `{ file, fileId }` | 上传开始 |
| `upload-progress` | `{ fileId, loaded, total, percent }` | 上传进度 |
| `upload-success` | `{ fileId, record }` | 上传成功 |
| `upload-error` | `{ fileId, error }` | 上传失败 |
| `upload-complete` | `{ results }` | 全部上传完成 |

### 1.3 返回数据结构

```javascript
interface FileosRecord {
  id: number
  fileId: string
  fileName: string
  fileType: string
  fileSize: number
  fileHash: string
  contentType: string
  category: string
  dirPath: string
  isPublic: number
  ossSp: string
  bucketName: string
  uploadType: string
  uploadId: string
  uploadStatus: string
  imageProcess: string
  previewUrl: string
}
```

### 1.4 ImageProcess 类型说明

图片处理参数，用于上传组件的 `imageProcess` 属性，支持缩放、裁剪、水印等 OSS 图片处理能力。

```javascript
interface ImageProcess {
  resize?: {
    width?: number
    height?: number
    mode?: 'fit' | 'fill' | 'exact'
  }
  crop?: {
    x?: number
    y?: number
    width?: number
    height?: number
  }
  watermark?: {
    text?: string
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity?: number
    fontSize?: number
  }
}
```

## 2. 简单上传流程（预签名模式）

推荐使用预签名模式，文件由前端直传 OSS，不经过后端服务器。

```
┌────────┐     ①请求预签名URL     ┌────────┐
│  前端   │ ──────────────────→  │  后端   │
│        │ ←──────────────────  │        │
│        │     presignUrl+fileId │        │
│        │                       └────────┘
│        │
│        │     ② PUT文件到OSS     ┌────────┐
│        │ ──────────────────→  │  OSS    │
│        │ ←──────────────────  │        │
│        │     200 OK            └────────┘
│        │
│        │     ③确认上传完成      ┌────────┐
│        │ ──────────────────→  │  后端   │
│        │ ←──────────────────  │        │
│        │     record            └────────┘
└────────┘
```

```javascript
// ① 请求预签名 URL
const presignResp = await fetch('/micro-fileos/presign/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
    category: 'avatar',
    bucketName: 'my-bucket',
    isPublic: false,
    expireMinutes: 30
  })
})
const { data } = await presignResp.json()
const { fileId, presignUrl, ossSp, bucketName } = data

// ② PUT 文件到 OSS
const uploadResp = await fetch(presignUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file
})

// ③ 确认上传完成
const completeResp = await fetch('/micro-fileos/presign/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileId,
    ossSp,
    bucketName,
    fileName: file.name,
    fileSize: file.size,
    category: 'avatar',
    isPublic: false
  })
})
const record = (await completeResp.json()).data
```

## 3. 分片上传流程

适用于大文件（>50MB），将文件拆分为多个分片并行上传。

```
┌────────┐  ①初始化分片上传   ┌────────┐
│  前端   │ ──────────────→  │  后端   │
│        │ ←──────────────  │        │
│        │  uploadId+parts   └────────┘
│        │
│        │  ②逐片PUT到OSS    ┌────────┐
│        │ ──────────────→  │  OSS    │
│        │ ←──────────────  │        │
│        │  eTag             └────────┘
│        │  (重复②直到所有分片完成)
│        │
│        │  ③完成分片上传     ┌────────┐
│        │ ──────────────→  │  后端   │
│        │ ←──────────────  │        │
│        │  record           └────────┘
└────────┘
```

```javascript
const CHUNK_SIZE = 5 * 1024 * 1024

// ① 初始化分片上传
const file = document.getElementById('fileInput').files[0]
const partCount = Math.ceil(file.size / CHUNK_SIZE)

const initResp = await fetch('/micro-fileos/presign/multipart/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
    category: 'video',
    bucketName: 'media-bucket',
    partCount,
    expireMinutes: 60
  })
})
const { uploadId, fileId, ossSp, bucketName, parts } = (await initResp.json()).data

// ② 逐片上传
const completedParts = []
for (const part of parts) {
  const start = (part.partNumber - 1) * CHUNK_SIZE
  const end = Math.min(start + CHUNK_SIZE, file.size)
  const chunk = file.slice(start, end)

  const partResp = await fetch(part.presignUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: chunk
  })
  const eTag = partResp.headers.get('ETag')
  completedParts.push({ partNumber: part.partNumber, eTag })
}

// ③ 完成分片上传
const completeResp = await fetch('/micro-fileos/presign/multipart/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploadId,
    fileId,
    bucketName,
    ossSp,
    fileName: file.name,
    fileSize: file.size,
    category: 'video',
    parts: completedParts
  })
})
const record = (await completeResp.json()).data
```

## 4. 断点续传流程

分片上传天然支持断点续传，核心思路是记录已完成的分片信息，恢复时跳过已上传的分片。

```javascript
// 上传进度持久化（localStorage / IndexedDB）
function saveProgress(fileId, completedParts) {
  localStorage.setItem(`fileos_upload_${fileId}`, JSON.stringify({
    fileId,
    uploadId,
    completedParts,
    timestamp: Date.now()
  }))
}

function loadProgress(fileId) {
  const data = localStorage.getItem(`fileos_upload_${fileId}`)
  return data ? JSON.parse(data) : null
}

// 恢复上传
async function resumeUpload(file) {
  const progress = loadProgress(file.id)
  if (!progress) {
    return startNewUpload(file)
  }

  const { uploadId, fileId, completedParts } = progress

  // 重新获取分片预签名 URL（原 URL 可能已过期）
  const initResp = await fetch('/micro-fileos/presign/multipart/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      partCount: Math.ceil(file.size / CHUNK_SIZE),
      expireMinutes: 60
    })
  })
  const { parts } = (await initResp.json()).data

  // 过滤已完成的分片
  const completedNumbers = new Set(completedParts.map(p => p.partNumber))
  const pendingParts = parts.filter(p => !completedNumbers.has(p.partNumber))

  // 仅上传未完成的分片
  for (const part of pendingParts) {
    const start = (part.partNumber - 1) * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    const partResp = await fetch(part.presignUrl, {
      method: 'PUT',
      body: chunk
    })
    const eTag = partResp.headers.get('ETag')
    completedParts.push({ partNumber: part.partNumber, eTag })
    saveProgress(fileId, completedParts)
  }

  // 完成上传
  await completeMultipartUpload(uploadId, fileId, completedParts)
}
```

## 5. 其他组件说明

### 5.1 FileosDirectoryBrowser — 目录浏览组件

用于浏览和管理文件目录结构，支持文件选择、预览和删除操作。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `action` | `string` | — | API 基础路径，如 `/micro-fileos` |
| `bucket` | `string` | — | 指定 Bucket |
| `selectable` | `boolean` | `false` | 是否可选择文件 |
| `multiple` | `boolean` | `false` | 是否多选 |
| `accept` | `string` | — | 可选择的文件类型过滤 |
| `showPreview` | `boolean` | `true` | 是否显示文件预览 |
| `onDelete` | `boolean` | `false` | 是否允许删除文件 |

### 5.2 FileosImageUploader — 图片上传组件

专门用于图片上传，带预览、裁剪、压缩功能。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `action` | `string` | — | API 基础路径，如 `/micro-fileos` |
| `bucket` | `string` | — | 指定 Bucket |
| `category` | `string` | — | 业务分类 |
| `accept` | `string` | `'image/*'` | 允许的文件类型 |
| `maxSize` | `number` | `10` (MB) | 单文件最大大小 |
| `maxCount` | `number` | `9` | 最大上传数量 |
| `multiple` | `boolean` | `true` | 是否允许多文件 |
| `compress` | `boolean` | `true` | 是否启用压缩 |
| `compressQuality` | `number` | `0.8` | 压缩质量（0-1） |
| `crop` | `boolean` | `false` | 是否启用裁剪 |
| `cropRatio` | `number` | — | 裁剪比例，如 `1/1`、`4/3`、`16/9` |
| `imageProcess` | `ImageProcess` | — | 图片处理参数（缩放、水印） |
| `listType` | `'text' \| 'picture' \| 'picture-card'` | `'picture-card'` | 文件列表展示样式 |
| `disabled` | `boolean` | `false` | 是否禁用 |

### 5.3 FileosDragUploader — 拖拽上传组件

支持拖拽文件到区域上传，适用于批量文件上传场景。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `action` | `string` | — | API 基础路径，如 `/micro-fileos` |
| `bucket` | `string` | — | 指定 Bucket |
| `category` | `string` | — | 业务分类 |
| `accept` | `string` | — | 允许的文件类型 |
| `maxSize` | `number` | `50` (MB) | 单文件最大大小 |
| `maxCount` | `number` | `5` | 最大上传数量 |
| `multiple` | `boolean` | `true` | 是否允许多文件 |
| `isPublic` | `boolean` | `false` | 是否公开读 |
| `imageProcess` | `ImageProcess` | — | 图片处理参数（缩放、水印） |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `dragAreaText` | `string` | `'将文件拖到此处，或点击上传'` | 拖拽区域提示文字 |
| `dragAreaIcon` | `string` | — | 拖拽区域图标 |

### 5.4 FileosChunkUploader — 大文件分片上传组件

专门用于大文件上传，支持分片、断点续传。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `action` | `string` | — | API 基础路径，如 `/micro-fileos` |
| `bucket` | `string` | — | 指定 Bucket |
| `category` | `string` | — | 业务分类 |
| `accept` | `string` | — | 允许的文件类型 |
| `maxSize` | `number` | `500` (MB) | 单文件最大大小 |
| `chunkSize` | `number` | `5` (MB) | 分片大小 |
| `chunkThreshold` | `number` | `10` (MB) | 触发分片上传的阈值 |
| `concurrent` | `number` | `3` | 并发上传数 |
| `retryCount` | `number` | `3` | 失败重试次数 |
| `isPublic` | `boolean` | `false` | 是否公开读 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `showProgress` | `boolean` | `true` | 是否显示上传进度 |
| `showSpeed` | `boolean` | `true` | 是否显示上传速度 |

## 6. 前端完整使用示例

### 6.1 基础使用 — 简单文件上传

```javascript
async function uploadSimpleFile(file) {
  const presignResp = await fetch('/micro-fileos/presign/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      category: 'document',
      isPublic: false
    })
  })

  const { data: { fileId, presignUrl, ossSp, bucketName } } = await presignResp.json()

  const uploadResp = await fetch(presignUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  })

  const completeResp = await fetch('/micro-fileos/presign/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      ossSp,
      bucketName,
      fileName: file.name,
      fileSize: file.size,
      category: 'document',
      isPublic: false
    })
  })

  const { data: record } = await completeResp.json()
  console.log('上传成功:', record)
  return record
}
```

### 6.2 进阶使用 — 带进度显示的分片上传

```javascript
const CHUNK_SIZE = 5 * 1024 * 1024

async function uploadWithProgress(file, onProgress) {
  const partCount = Math.ceil(file.size / CHUNK_SIZE)

  const initResp = await fetch('/micro-fileos/presign/multipart/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      category: 'video',
      partCount,
      expireMinutes: 60
    })
  })

  const { data: { uploadId, fileId, ossSp, bucketName, parts } } = await initResp.json()

  const completedParts = []
  let uploadedSize = 0

  for (const part of parts) {
    const start = (part.partNumber - 1) * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    const partResp = await fetch(part.presignUrl, {
      method: 'PUT',
      body: chunk
    })

    const eTag = partResp.headers.get('ETag')
    completedParts.push({ partNumber: part.partNumber, eTag })

    uploadedSize += chunk.size
    onProgress({
      loaded: uploadedSize,
      total: file.size,
      percent: Math.round((uploadedSize / file.size) * 100)
    })
  }

  const completeResp = await fetch('/micro-fileos/presign/multipart/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId,
      fileId,
      bucketName,
      ossSp,
      fileName: file.name,
      fileSize: file.size,
      category: 'video',
      parts: completedParts
    })
  })

  const { data: record } = await completeResp.json()
  return record
}

// 使用示例
const fileInput = document.getElementById('fileInput')
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file) return

  await uploadWithProgress(file, (progress) => {
    console.log(`上传进度: ${progress.percent}%`)
  })
})
```

### 6.3 目录浏览示例

```javascript
// 加载目录树
async function loadDirectoryTree(bucketName = 'my-bucket') {
  const resp = await fetch(`/micro-fileos/directory/tree?bucketName=${bucketName}`)
  const { data: tree } = await resp.json()
  return tree
}

// 加载子目录列表
async function loadSubDirectories(parentPath, bucketName = 'my-bucket') {
  const resp = await fetch(`/micro-fileos/directory/list?parentPath=${encodeURIComponent(parentPath)}&bucketName=${bucketName}`)
  const { data: directories } = await resp.json()
  return directories
}

// 获取文件访问签名 URL
async function getFileUrl(fileId, expireMinutes = 30) {
  const resp = await fetch(`/micro-fileos/sign/url?fileId=${fileId}&expireMinutes=${expireMinutes}`)
  const { data: url } = await resp.json()
  return url
}
```

### 6.4 图片上传示例（带压缩和裁剪）

```javascript
async function uploadAvatar(file) {
  const presignResp = await fetch('/micro-fileos/presign/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: 'image/jpeg',
      category: 'avatar',
      isPublic: true,
      imageProcess: JSON.stringify({
        resize: {
          width: 200,
          height: 200,
          mode: 'fit'
        }
      })
    })
  })

  const { data: { fileId, presignUrl, ossSp, bucketName } } = await presignResp.json()

  await fetch(presignUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: file
  })

  const completeResp = await fetch('/micro-fileos/presign/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      ossSp,
      bucketName,
      fileName: file.name,
      fileSize: file.size,
      category: 'avatar',
      isPublic: true
    })
  })

  const { data: record } = await completeResp.json()
  return record
}
```
