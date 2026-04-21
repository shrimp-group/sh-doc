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
      {text: '框架',link: '/framework'},
      {text: '权限', link: '/auth'},
      {text: '代码生成', link: '/generator'},
      {text: '微模块', link: '/micro'},
      {text: '商城', link: '/mall'},
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
