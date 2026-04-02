---
layout: home

hero:
  name: 'Inspecto'
  text: 'Click. Extract. Ship to AI.'
  tagline: 'Click any UI element to instantly send its source code to your AI Assistant.'
  image:
    src: /icon.png
    alt: Inspecto Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/inspecto-dev/inspecto

features:
  - title: 🖱️ Click-to-inspect
    details: Press hotkey and click any JSX/Vue element during development to extract its source context.
  - title: 🤖 Ship to AI
    details: Instantly sends code context to GitHub Copilot, Claude Code, Cursor, Trae, Gemini, etc.
  - title: ⚡ Zero Runtime Overhead
    details: Compile-time attributes only. Completely tree-shaken in production.
  - title: 🎨 Framework-Agnostic
    details: Built with pure Web Component & Shadow DOM. Doesn't interfere with your app's styles.
  - title: 🔧 Broad Support
    details: Works seamlessly with Vite, Webpack, Rspack, esbuild, rollup, next.js, nuxt.js, etc.
  - title: 🛠️ Intelligent Setup
    details: Assistant-first onboarding via single-step install entrypoints, with `inspecto detect/plan/apply/doctor` or `inspecto init` as the terminal fallback.
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
