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
      {
        text: '框架',
        items: [
          {text: '框架概述', link: '/framework/'},
          {text: 'Parent 父工程', link: '/framework/parent'},
          {text: 'BOM 物料清单', link: '/framework/bom'},
          {text: 'Core 核心模块', link: '/framework/core'},
          {text: 'ORM 持久框架', link: '/framework/orm'},
          {text: 'Redis 缓存', link: '/framework/redis'},
          {text: 'Spring 偶合器', link: '/framework/spring'},
        ]
      },
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
          {text: '登录界面', link: '/auth/iam-sso-ui'},
        ]
      },
      {
        text: '代码生成',
        items: [
          {text: '概述', link: '/generator/'},
          {text: '客户端', link: '/generator/generator-client'},
          {text: '服务端', link: '/generator/generator-server'},
          {text: '服务启动器', link: '/generator/generator-server-starter'},
          {text: '生成器界面', link: '/generator/generator-ui'},
        ]
      },
      {
        text: '微模块',
        items: [
          {text: '概述', link: '/micro/'},
          {text: '审计服务', link: '/micro/micro-audit'},
          {text: '字典服务', link: '/micro/micro-dict'},
          {text: '文件服务', link: '/micro/micro-file'},
          {text: '表单服务', link: '/micro/micro-form'},
          {text: '函数服务', link: '/micro/micro-fun'},
          {text: 'K8s 服务', link: '/micro/micro-k8s'},
          {text: '规则引擎', link: '/micro/micro-liteflow'},
          {text: '脱敏服务', link: '/micro/micro-mask'},
          {text: '消息服务', link: '/micro/micro-msg'},
          {text: '支付服务', link: '/micro/micro-pay'},
          {text: 'PDF 服务', link: '/micro/micro-pdf'},
          {text: '关联检查', link: '/micro/micro-rmcheck'},
          {text: '序列服务', link: '/micro/micro-seq'},
          {text: '微信小程序', link: '/micro/micro-wxapp'},
          {text: '微信公众号', link: '/micro/micro-wxmp'},
        ]
      },
      {
        text: '商城',
        items: [
          {text: '概述', link: '/mall/'},
          {text: '订单管理', link: '/mall/oms-admin'},
          {text: '订单服务', link: '/mall/oms-admin-starter'},
          {text: '商品管理', link: '/mall/pms-admin'},
          {text: '商品服务', link: '/mall/pms-admin-starter'},
        ]
      },
      {
        text: '关于',
        items: [
          { text: '关于本项目', link: '/about/' },
          { text: '个人空间', link: 'https://doc.wkclz.com' },
        ]
      },

    ],
    sidebar: {
      '/framework/': [
        {
          text: '框架',
          items: [
            {text: '框架为何物', link: '/framework/'},
            {text: 'Parent 父工程', link: '/framework/parent'},
            {text: 'BOM 物料清单', link: '/framework/bom'},
            {text: 'Core 核心模块', link: '/framework/core'},
            {text: 'ORM 持久框架', link: '/framework/orm'},
            {text: 'Redis 缓存', link: '/framework/redis'},
            {text: 'Spring 偶合器', link: '/framework/spring'},
          ]
        },
      ],
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
            {text: '登录界面', link: '/auth/iam-sso-ui'},
          ]
        },
      ],
      '/generator/': [
        {
          text: '代码生成',
          items: [
            {text: '概述', link: '/generator/'},
            {text: '客户端', link: '/generator/generator-client'},
            {text: '服务端', link: '/generator/generator-server'},
            {text: '服务启动器', link: '/generator/generator-server-starter'},
            {text: '生成器界面', link: '/generator/generator-ui'},
          ]
        },
      ],
      '/micro/': [
        {
          text: '微模块',
          items: [
            {text: '概述', link: '/micro/'},
            {text: '审计服务', link: '/micro/micro-audit'},
            {text: '字典服务', link: '/micro/micro-dict'},
            {text: '文件服务', link: '/micro/micro-file'},
            {text: '表单服务', link: '/micro/micro-form'},
            {text: '函数服务', link: '/micro/micro-fun'},
            {text: 'K8s 服务', link: '/micro/micro-k8s'},
            {text: '规则引擎', link: '/micro/micro-liteflow'},
            {text: '脱敏服务', link: '/micro/micro-mask'},
            {text: '消息服务', link: '/micro/micro-msg'},
            {text: '支付服务', link: '/micro/micro-pay'},
            {text: 'PDF 服务', link: '/micro/micro-pdf'},
            {text: '关联检查', link: '/micro/micro-rmcheck'},
            {text: '序列服务', link: '/micro/micro-seq'},
            {text: '微信小程序', link: '/micro/micro-wxapp'},
            {text: '微信公众号', link: '/micro/micro-wxmp'},
          ]
        },
      ],
      '/mall/': [
        {
          text: '商城',
          items: [
            {text: '概述', link: '/mall/'},
            {text: '订单管理', link: '/mall/oms-admin'},
            {text: '订单服务', link: '/mall/oms-admin-starter'},
            {text: '商品管理', link: '/mall/pms-admin'},
            {text: '商品服务', link: '/mall/pms-admin-starter'},
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
