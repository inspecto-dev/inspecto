import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/inspecto/',
  title: 'Inspecto',
  description:
    'Inspect frontend components in the browser, annotate batches of UI issues, and jump straight back to source.',

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/inspecto/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/inspecto/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#bd34fe' }],
  ],

  cleanUrls: true,
  lastUpdated: true,

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: '配置', link: '/zh/config/plugin' },
        ],
        sidebar: [
          {
            text: '入门',
            collapsed: false,
            items: [
              { text: '简介', link: '/zh/guide/introduction' },
              { text: '快速开始', link: '/zh/guide/getting-started' },
              { text: '常见问题 (FAQ)', link: '/zh/guide/faq' },
              { text: '手动安装', link: '/zh/guide/manual-installation' },
              { text: '迭代计划 (Roadmap)', link: '/zh/guide/roadmap' }
            ],
          },
          {
            text: '配置',
            collapsed: false,
            items: [
              { text: '构建插件', link: '/zh/config/plugin' },
              { text: '用户设置', link: '/zh/config/user-settings' },
            ],
          },
          {
            text: '集成',
            collapsed: false,
            items: [
              { text: 'AI 工具支持', link: '/zh/integrations/ai-tools' },
              { text: 'Onboarding 集成', link: '/zh/integrations/onboarding-skills' },
              { text: 'Onboarding Contract', link: '/zh/integrations/onboarding-contract' },
              { text: 'IDE 扩展', link: '/zh/integrations/ide' },
            ],
          },
        ],
        outlineTitle: '本页目录',
        lastUpdatedText: '最后更新于',
        docFooter: {
          prev: '上一篇',
          next: '下一篇',
        },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
      },
    },
  },

  themeConfig: {
    logo: '/icon.png',

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/inspecto-dev/inspecto/edit/main/packages/docs/:path',
      text: 'Edit this page on GitHub',
    },

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Config', link: '/config/plugin' },
    ],

    sidebar: [
      {
        text: 'Guide',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Troubleshooting (FAQ)', link: '/guide/faq' },
          { text: 'Manual Installation', link: '/guide/manual-installation' },
          { text: 'Roadmap', link: '/guide/roadmap' }
        ],
      },
      {
        text: 'Configuration',
        collapsed: false,
        items: [
          { text: 'Plugin Config', link: '/config/plugin' },
          { text: 'User Settings', link: '/config/user-settings' },
        ],
      },
      {
        text: 'Integrations',
        collapsed: false,
        items: [
          { text: 'AI Tools', link: '/integrations/ai-tools' },
          { text: 'Onboarding Integrations', link: '/integrations/onboarding-skills' },
          { text: 'Onboarding Contract', link: '/integrations/onboarding-contract' },
          { text: 'IDE Extensions', link: '/integrations/ide' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/inspecto-dev/inspecto' },
      { icon: 'discord', link: 'https://github.com/inspecto-dev/inspecto/discussions' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Inspecto Dev',
    },
  },
})
