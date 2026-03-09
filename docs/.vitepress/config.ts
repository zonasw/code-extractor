import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'CodeExtractor',
  description: 'AI-native code context & agent IDE',

  // Multi-language support
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/getting-started' },
          { text: 'For Developers', link: '/en/for-developers' },
          { text: 'For Testers', link: '/en/for-testers' },
          { text: 'For Product', link: '/en/for-product' },
        ],
        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'Getting Started', link: '/en/getting-started' },
            ],
          },
          {
            text: 'Best Practices',
            items: [
              { text: 'For Developers', link: '/en/for-developers' },
              { text: 'For Testers', link: '/en/for-testers' },
              { text: 'For Product Managers', link: '/en/for-product' },
            ],
          },
        ],
      },
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/getting-started' },
          { text: '开发者', link: '/zh/for-developers' },
          { text: '测试人员', link: '/zh/for-testers' },
          { text: '产品经理', link: '/zh/for-product' },
        ],
        sidebar: [
          {
            text: '介绍',
            items: [
              { text: '快速上手', link: '/zh/getting-started' },
            ],
          },
          {
            text: '最佳实践',
            items: [
              { text: '开发者指南', link: '/zh/for-developers' },
              { text: '测试人员指南', link: '/zh/for-testers' },
              { text: '产品经理指南', link: '/zh/for-product' },
            ],
          },
        ],
      },
    },
  },

  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/zonasw/code-extractor' },
    ],
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/zonasw/code-extractor/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 CodeExtractor',
    },
  },

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],
})
