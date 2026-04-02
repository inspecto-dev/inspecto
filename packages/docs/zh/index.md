---
layout: home

hero:
  name: 'Inspecto'
  text: '点击。提取。发送给 AI。'
  tagline: '点击任意 UI 元素，即可瞬间将其源代码上下文发送给你的 AI 助手。'
  image:
    src: /icon.png
    alt: Inspecto Logo
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/inspecto-dev/inspecto

features:
  - title: 🖱️ 点击审查
    details: 在开发环境中按住热键点击任意 JSX/Vue 元素，即可提取源码上下文。
  - title: 🤖 直达 AI
    details: 自动提取源码上下文并直接发送给 AI 助手 (Copilot, Claude Code, Cursor, Trae 等)。
  - title: ⚡ 零生产开销
    details: 基于编译时 AST 注入，生产环境自动 Treeshaking，零运行时负担。
  - title: 🎨 框架无关
    details: 纯 Web Component 实现的 Shadow DOM 遮罩层，不干扰业务样式。
  - title: 🔧 广泛的构建支持
    details: 支持 Vite, Webpack, Rspack, esbuild, rollup, next.js, nuxt.js 等。
  - title: 🛠️ 智能初始化
    details: 优先通过单步骤安装入口完成 assistant 接入，终端里仍可回退到 `inspecto detect/plan/apply/doctor` 或 `inspecto init`。
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
  
  --vp-c-brand-1: #bd34fe;
  --vp-c-brand-2: #a324db;
  --vp-c-brand-3: #8a15ba;
  
  --vp-button-brand-bg: var(--vp-c-brand-1);
  --vp-button-brand-hover-bg: var(--vp-c-brand-2);
  --vp-button-brand-active-bg: var(--vp-c-brand-3);
}

.VPHero.has-image .image-src {
  max-width: 256px;
  max-height: 256px;
  transform: translate(24px, -24px);
  filter: drop-shadow(0 0 40px rgba(189, 52, 254, 0.3));
}

.VPHero .text {
  max-width: 600px;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .VPHero .text {
    white-space: normal;
  }
}
</style>
