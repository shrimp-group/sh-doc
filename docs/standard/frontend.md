# 前端规范

## 代码风格

### 文件命名

- 文件名使用 **kebab-case**（短横线分隔）
- 组件文件名以大写字母开头，使用 PascalCase
- 工具函数文件使用小写字母

### 代码缩进

- 使用 **2 个空格**进行缩进
- 不使用 Tab

### 变量命名

- 使用 **camelCase** 命名变量和函数
- 使用 **PascalCase** 命名类和组件
- 使用 **CONSTANT_CASE** 命名常量

## 目录规范

### 项目目录结构

```
src/
├── api/                    # 接口请求
│   └── module/             # 模块接口
│       └── xxx.ts          # 接口定义
├── assets/                 # 静态资源
│   ├── images/             # 图片资源
│   ├── icons/              # 图标资源
│   └── styles/             # 样式文件
├── components/             # 公共组件
│   ├── common/             # 通用组件
│   ├── layout/             # 布局组件
│   └── business/           # 业务组件
├── directive/              # 自定义指令
├── filters/                # 过滤器
├── layouts/                # 页面布局
│   └── index.vue           # 主布局
├── plugins/                # 插件
├── router/                 # 路由配置
│   └── index.ts            # 路由定义
├── store/                  # 状态管理
│   └── modules/            # 模块状态
├── utils/                  # 工具函数
│   ├── request.ts          # 请求封装
│   └── xxx.ts              # 其他工具
├── views/                  # 页面视图
│   └── module/             # 模块页面
│       ├── xxx.vue         # 页面组件
│       └── components/     # 页面专属组件
├── App.vue                 # 根组件
├── main.ts                 # 入口文件
└── style.css               # 全局样式
```

### 目录职责说明

| 目录 | 职责 | 说明 |
|------|------|------|
| api | 接口请求管理 | 按模块划分，统一管理 API 调用 |
| assets | 静态资源 | 存放图片、图标、样式等静态文件 |
| components | 公共组件 | 可复用的通用组件 |
| directive | 自定义指令 | Vue 自定义指令 |
| filters | 过滤器 | Vue 过滤器 |
| layouts | 页面布局 | 全局布局组件 |
| plugins | 插件 | Vue 插件 |
| router | 路由配置 | 路由定义和导航守卫 |
| store | 状态管理 | Pinia/Vuex 状态管理 |
| utils | 工具函数 | 通用工具方法 |
| views | 页面视图 | 页面级组件 |

### 组件目录结构

```
components/
├── common/
│   ├── Button/
│   │   ├── index.vue
│   │   └── style.scss
│   ├── Input/
│   │   ├── index.vue
│   │   └── style.scss
│   └── Table/
│       ├── index.vue
│       └── style.scss
├── layout/
│   ├── Header/
│   │   ├── index.vue
│   │   └── style.scss
│   ├── Sidebar/
│   │   ├── index.vue
│   │   └── style.scss
│   └── Footer/
│       ├── index.vue
│       └── style.scss
└── business/
    ├── UserCard/
    │   ├── index.vue
    │   └── style.scss
    └── OrderList/
        ├── index.vue
        └── style.scss
```

## 组件设计

### 组件拆分原则

- 单一职责：每个组件只负责一件事
- 可复用性：设计可复用的通用组件
- 可组合性：组件之间可以灵活组合

### 组件命名规范

- 组件名使用 PascalCase
- 组件文件夹名使用 PascalCase
- 组件入口文件统一为 `index.vue`

## 样式规范

### CSS 类命名

- 使用 **BEM** 命名规范
- 块（Block）：独立的实体
- 元素（Element）：块的一部分
- 修饰符（Modifier）：块或元素的变体

### 样式组织

- 使用 SCSS/SASS 变量管理颜色、字体等
- 样式文件按组件组织

## 性能优化

### 懒加载

- 组件懒加载
- 图片懒加载

### 代码分割

- 使用动态 import 进行代码分割
- 按需加载第三方库

## 状态管理

- 使用 Vue 3 Composition API
- 复杂状态使用 Pinia 管理

## 最佳实践

- 使用 TypeScript 进行类型检查
- 编写单元测试
- 保持代码简洁可读
