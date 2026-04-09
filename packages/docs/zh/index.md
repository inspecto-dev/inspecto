---
layout: home

hero:
  name: 'Inspecto'
  text: '直接在浏览器里 Inspect UI。'
  tagline: 'Inspecto 是一套浏览器优先的前端工作流，用来更快定位源码并把正确上下文自动交给 AI。你可以直接在页面里进入 Inspect mode、Annotate mode，或者用 Quick jump 打开源码，减少浏览器和编辑器之间的来回切换。'
  image:
    src: /icon.png
    alt: Inspecto Logo
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 安装集成
      link: /zh/integrations/onboarding-skills
    - theme: alt
      text: 观看演示
      link: /inspecto/demo/inspecto.mov

features:
  - title: Inspect mode
    details: 'Inspect 单个组件，自动附带准确上下文，然后立即唤起 AI 提问。'
  - title: Annotate mode
    details: '跨多个组件圈选多条修改意见，补充一个整体目标，再一次性打包发给 AI。'
  - title: Quick jump
    details: '按住 `Alt` + `点击` 页面元素，瞬间在编辑器中打开准确的源码位置，告别手动搜索。'
  - title: Assistant-first 接入
    details: '由 AI 助手主导的智能接入。在项目根目录运行安装命令，让 AI 在 IDE 中自动引导你完成配置。'
  - title: 低风险接入
    details: '基于编译时属性注入，生产环境自动 treeshaking，并通过 Shadow DOM 避免污染业务样式。'
  - title: 广泛支持
    details: '无缝支持 Vite、Webpack、Rspack、Rollup、esbuild、Next.js 以及 Nuxt 等主流构建工具与框架。'
---

## 看一看实际效果

<video controls playsinline muted preload="metadata" style="width: 100%; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18); margin: 8px 0 24px; box-sizing: border-box;">
  <source :src="'/inspecto/demo/inspecto.mov'" type="video/quicktime" />
  <source :src="'/inspecto/demo/inspecto.mov'" />
  当前浏览器不支持直接播放，可<a :href="'/inspecto/demo/inspecto.mov'">点此下载视频</a>。
</video>

## 为什么选择 Inspecto？

<img :src="'/inspecto/inspecto-workflow.png'" alt="Traditional vs Inspecto Workflow" style="width: 100%; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05); margin: 16px 0 48px;" />

## 三种工作流

<script setup>
import HeroArchitecture from '../components/HeroArchitecture.vue'
</script>

<HeroArchitecture />

<div class="mode-grid">
  <div class="mode-card">
    <img :src="'/inspecto/inspect-mode.gif'" alt="Inspect mode workflow" />
    <h3>Inspect mode</h3>
    <p>Inspect 单个组件，自动附带准确上下文，然后立即唤起 AI 提问。</p>
  </div>
  <div class="mode-card">
    <img :src="'/inspecto/annotate-mode.gif'" alt="Annotate mode workflow" />
    <h3>Annotate mode</h3>
    <p>跨多个组件圈选多条修改意见，补充一个整体目标，再一次性打包发给 AI。</p>
  </div>
  <div class="mode-card">
    <img :src="'/inspecto/quick-jump.gif'" alt="Quick jump workflow" />
    <h3>Quick jump</h3>
    <p>按住 <code>Alt + 点击</code> 页面元素，瞬间在编辑器中打开准确的源码位置，告别手动搜索。</p>
  </div>
</div>

## 丰富的生态集成

<img :src="'/inspecto/inspecto-ecosystem.png'" alt="Inspecto Ecosystem and Integrations" style="width: 100%; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05); margin: 16px 0 48px;" />

<div class="home-grid">
  <div class="home-panel">
    <h3>什么时候最适合用 Inspecto</h3>
    <ul>
      <li>问题已经出现在浏览器里</li>
      <li>你想用最短路径进入源码或 AI</li>
      <li>你不想继续在多个工具之间复制粘贴</li>
      <li>你需要准确的上下文但不想手动查代码</li>
    </ul>
  </div>
  <div class="home-panel home-panel--accent">
    <h3>最快路径</h3>
    <ol>
      <li><strong>进入你的项目根目录</strong>（大多数集成是基于项目的）。</li>
      <li><strong>安装</strong>对应你 AI 助手的集成。</li>
      <li><strong>等待 onboarding</strong> 在你的 IDE 中自动打开。</li>
      <li><strong>只有在 onboarding 没有打开时</strong>，再手动发送 <code>Set up Inspecto in this project</code>。</li>
    </ol>
  </div>
</div>

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

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin: 8px 0 28px;
}

.mode-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
}

.mode-card img {
  width: 100%;
  border-radius: 14px;
  margin-bottom: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.mode-card h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}

.mode-card p {
  margin: 0;
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .VPHero .text {
    white-space: normal;
  }

  .mode-grid {
    grid-template-columns: 1fr;
  }
  
  .home-grid {
    grid-template-columns: 1fr;
  }
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin: 28px 0;
}

.home-panel {
  padding: 24px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
}

.home-panel--accent {
  background: linear-gradient(145deg, rgba(189, 52, 254, 0.03) 0%, rgba(65, 209, 255, 0.03) 100%);
  border: 1px solid rgba(189, 52, 254, 0.15);
}

.home-panel h3 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 600;
}

.home-panel ul, .home-panel ol {
  margin: 0;
  padding-left: 20px;
  color: var(--vp-c-text-2);
}

.home-panel li {
  margin-bottom: 8px;
}

.home-panel li:last-child {
  margin-bottom: 0;
}
</style>
