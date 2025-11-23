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
      {text: '框架', link: '/framework'},
      {text: '权限', link: '/auth'},
      {text: '代码生成', link: '/generator'},
      {text: '接口平台', link: '/api'},
      {text: '商城', link: '/mall'},
      {text: '个人', link: 'https://doc.wkclz.com'}
    ],
    sidebar: [
      {
        text: 'Examples',
        items: [
          {text: 'Markdown Examples', link: '/markdown-examples'},
          {text: 'Runtime API Examples', link: '/api-examples'}
        ]
      }
    ],

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
