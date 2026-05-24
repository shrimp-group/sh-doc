import { withMermaid } from 'vitepress-plugin-mermaid';

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: "sh-doc",
  description: "Document",
  head: [
    ['link', {rel: 'icon', href: '/favicon.svg'}],
    ['script', {}, `
          window._hmt = window._hmt || [];
          (function() {
            var hm = document.createElement("script");
            hm.src = "https://hm.baidu.com/hm.js?a8aaa98052162ba50aab9c3ac7807e50";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(hm, s);
          })();
      `,],
  ],
  themeConfig: {
    logo: '/favicon.svg',
    search: {
      provider: 'local'
    },
    lastUpdated: {
      text: '最近更新',
    },
    docFooter: {
      prev: '前一篇',
      next: '后一篇'
    },
    nav: [
      {text: 'Home', link: '/'},
      {text: '规范', link: '/standard/'},
      {text: '框架', link: '/framework/'},
      {text: '权限', link: '/auth/'},
      {text: '代码生成', link: '/generator/'},
      {
        text: '微模块',
        items: [
          {text: '概述', link: '/micro/'},
          {text: '审计服务', link: '/micro/micro-audit'},
          {text: '字典服务', link: '/micro/micro-dict/'},
          {text: '文件服务', link: '/micro/micro-fileos/'},
          {text: '表单服务', link: '/micro/micro-form'},
          {text: '函数服务', link: '/micro/micro-fun'},
          {text: 'K8s服务', link: '/micro/micro-k8s'},
          {text: '规则引擎', link: '/micro/micro-liteflow'},
          {text: '脱敏服务', link: '/micro/micro-mask'},
          {text: '消息服务', link: '/micro/micro-msg'},
          {text: '支付服务', link: '/micro/micro-pay'},
          {text: 'PDF服务', link: '/micro/micro-pdf'},
          {text: '关联检查', link: '/micro/micro-rmcheck'},
          {text: '序列服务', link: '/micro/micro-seq'},
          {text: '微信小程序', link: '/micro/micro-wxapp'},
          {text: '微信公众号', link: '/micro/micro-wxmp'},
        ]
      },
      {text: '商城', link: '/mall/'},
      {
        text: '关于',
        items: [
          { text: '关于本项目', link: '/about/' },
          { text: '个人空间', link: 'https://doc.wkclz.com' },
        ]
      },

    ],
    sidebar: {
      // 规范 - 每个页面独立 sidebar
      '/standard/': [
        {
          text: '规范',
          items: [
            {text: '概述', link: '/standard/'},
            {text: '前端规范', link: '/standard/frontend'},
            {text: '后端规范', link: '/standard/backend'},
            {text: '数据库规范', link: '/standard/database'},
            {text: 'Git 规范', link: '/standard/git'},
            {text: '运维规范', link: '/standard/ops'},
            {text: 'API 规范', link: '/standard/api'},
            {text: '安全规范', link: '/standard/security'},
            {text: '文档规范', link: '/standard/document'},
            {text: '架构规范', link: '/standard/architecture'},
            {text: '日志规范', link: '/standard/logging'},
            {text: 'AI编程范式', link: '/standard/ai-paradigm'},
            {text: 'AI编程实践', link: '/standard/ai-practice'},
          ]
        },
      ],
      // 框架 - 每个页面独立 sidebar
      '/framework/': [
        {
          text: '框架',
          items: [
            {text: '概述', link: '/framework/'},
            {text: 'Parent 父工程', link: '/framework/parent'},
            {text: 'BOM 物料清单', link: '/framework/bom'},
            {text: 'Tool 工具模块', link: '/framework/tool'},
            {text: 'Core 核心模块', link: '/framework/core'},
            {text: 'ORM 持久框架', link: '/framework/orm'},
            {text: 'Redis 缓存', link: '/framework/redis'},
            {text: 'Web 增强模块', link: '/framework/web'},
            {text: 'MQTT 消息队列', link: '/framework/mqtt'},
            {text: 'Spring 偶合器', link: '/framework/spring'},
          ]
        },
      ],
      // 权限 - 每个页面独立 sidebar
      '/auth/': [
        {
          text: '权限',
          items: [
            {text: '概述', link: '/auth/'},
            {text: '管理后台', link: '/auth/iam-admin'},
            {text: '后台启动器', link: '/auth/iam-admin-starter'},
            {text: '后台界面', link: '/auth/iam-admin-ui'},
            {text: '公共模块', link: '/auth/iam-common'},
            {text: '开发套件', link: '/auth/iam-sdk'},
            {text: '单点登录', link: '/auth/iam-sso'},
            {text: '登录启动器', link: '/auth/iam-sso-starter'},
            {text: '登录界面', link: '/auth/iam-sso-ui'}
          ]
        }
      ],

      // 代码生成 - 每个页面独立 sidebar
      '/generator/': [
        {
          text: '代码生成',
          items: [
            {text: '概述', link: '/generator/'},
            {text: '数据源维护', link: '/generator/datasource'},
            {text: '模板维护', link: '/generator/template'},
            {text: '项目维护', link: '/generator/project'},
            {text: '项目接入及使用方法', link: '/generator/usage'},
            {text: '客户端', link: '/generator/generator-client'},
            {text: '服务端', link: '/generator/generator-server'},
            {text: '服务启动器', link: '/generator/generator-server-starter'},
            {text: '生成器界面', link: '/generator/generator-ui'}
          ]
        },
      ],
      // 微模块 - 每个页面独立 sidebar
      '/micro/': [
        {
          text: '微模块',
          items: [{text: '概述', link: '/micro/'}]
        },
      ],
      '/micro/micro-audit': [
        {
          text: '微模块',
          items: [{text: '审计服务', link: '/micro/micro-audit'}]
        },
      ],
      '/micro/micro-dict/': [
        {
          text: '字典服务',
          items: [
            {text: '概述', link: '/micro/micro-dict/'},
            {text: '设计思路', link: '/micro/micro-dict/design'},
            {text: '功能集成', link: '/micro/micro-dict/integration'},
            {text: '后端使用', link: '/micro/micro-dict/backend-usage'},
            {text: '前端使用', link: '/micro/micro-dict/frontend-usage'},
            {text: '高级配置', link: '/micro/micro-dict/advanced'},
          ]
        },
      ],
      '/micro/micro-fileos/': [
        {
          text: '文件服务',
          items: [
            {text: '概述', link: '/micro/micro-fileos/'},
            {text: '设计思路', link: '/micro/micro-fileos/design'},
            {text: '功能集成', link: '/micro/micro-fileos/integration'},
            {text: '服务商', link: '/micro/micro-fileos/storage-providers'},
            {text: '后端使用', link: '/micro/micro-fileos/backend-usage'},
            {text: '前端使用', link: '/micro/micro-fileos/frontend-usage'},
            {text: '配置指南', link: '/micro/micro-fileos/configuration'},
          ]
        },
      ],
      '/micro/micro-form': [
        {
          text: '微模块',
          items: [{text: '表单服务', link: '/micro/micro-form'}]
        },
      ],
      '/micro/micro-fun': [
        {
          text: '微模块',
          items: [{text: '函数服务', link: '/micro/micro-fun'}]
        },
      ],
      '/micro/micro-k8s': [
        {
          text: '微模块',
          items: [{text: 'K8s 服务', link: '/micro/micro-k8s'}]
        },
      ],
      '/micro/micro-liteflow': [
        {
          text: '微模块',
          items: [{text: '规则引擎', link: '/micro/micro-liteflow'}]
        },
      ],
      '/micro/micro-mask': [
        {
          text: '微模块',
          items: [{text: '脱敏服务', link: '/micro/micro-mask'}]
        },
      ],
      '/micro/micro-msg': [
        {
          text: '微模块',
          items: [{text: '消息服务', link: '/micro/micro-msg'}]
        },
      ],
      '/micro/micro-pay': [
        {
          text: '微模块',
          items: [{text: '支付服务', link: '/micro/micro-pay'}]
        },
      ],
      '/micro/micro-pdf': [
        {
          text: '微模块',
          items: [{text: 'PDF 服务', link: '/micro/micro-pdf'}]
        },
      ],
      '/micro/micro-rmcheck': [
        {
          text: '微模块',
          items: [{text: '关联检查', link: '/micro/micro-rmcheck'}]
        },
      ],
      '/micro/micro-seq': [
        {
          text: '微模块',
          items: [{text: '序列服务', link: '/micro/micro-seq'}]
        },
      ],
      '/micro/micro-wxapp': [
        {
          text: '微模块',
          items: [{text: '微信小程序', link: '/micro/micro-wxapp'}]
        },
      ],
      '/micro/micro-wxmp': [
        {
          text: '微模块',
          items: [{text: '微信公众号', link: '/micro/micro-wxmp'}]
        },
      ],
      // 商城 - 每个页面独立 sidebar
      '/mall/': [
        {
          text: '商城',
          items: [
            {text: '概述', link: '/mall/'},
            {text: '订单管理', link: '/mall/oms-admin'},
            {text: '订单服务', link: '/mall/oms-admin-starter'},
            {text: '商品管理', link: '/mall/pms-admin'},
            {text: '商品服务', link: '/mall/pms-admin-starter'}
          ]
        },
      ],
    },
    editLink: {
      text: '编辑此页面',
      pattern: 'https://github.com/shrimp-group/sh-doc/edit/main/docs/:path'
    },
    socialLinks: [
      {icon: 'github', link: 'https://github.com/shrimp-group'}
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2016-present Shrimp Workstudio'
    }
  }
})
