# Git 规范

## 分支管理

### 分支命名

- **main**：主分支，用于生产环境
- **develop**：开发分支，用于集成开发
- **feature/**：功能分支，如 `feature/user-login`
- **bugfix/**：修复分支，如 `bugfix/issue-123`
- **hotfix/**：紧急修复分支，如 `hotfix/production-error`
- **release/**：发布分支，如 `release/v1.0.0`

### 分支流程

1. 从 develop 分支创建 feature 分支
2. 开发完成后合并到 develop
3. 从 develop 创建 release 分支
4. 测试通过后合并到 main 和 develop
5. 紧急修复从 main 创建 hotfix 分支，修复后合并到 main 和 develop

## 代码提交

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型

- **feat**：新功能
- **fix**：修复 bug
- **docs**：文档更新
- **style**：代码格式（不影响代码运行）
- **refactor**：重构（既不添加新功能也不修复 bug）
- **test**：测试相关
- **chore**：构建/工具/依赖更新

### 提交示例

```
feat(user): 添加用户登录功能

- 实现 JWT 认证
- 添加登录接口
- 更新用户实体

Closes #123
```

## 代码审查

### PR 流程

1. 创建 PR 后至少需要 1 位 reviewer 审核
2. 所有 reviewer 批准后才能合并
3. 使用 GitHub Actions 进行 CI 检查

### PR 检查清单

- 代码符合编码规范
- 有对应的单元测试
- 文档已更新
- 无冲突

## 最佳实践

- 保持提交粒度小且完整
- 写清晰的提交信息
- 定期同步远程分支
- 使用 .gitignore 排除不必要的文件
- 不要提交敏感信息
