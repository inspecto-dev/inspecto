---
layout: home

hero:
  name: 'Inspecto'
  text: '点击 UI，直达源码，让 AI 修改。'
  tagline: '从浏览器里的真实问题出发，捕获准确组件上下文，交给 AI 助手或 MCP Agent，触发自定义工作流，并在页面里跟进处理进度。'
  image:
    src: /icon.png
    alt: Inspecto Logo
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 更多安装方式
      link: /zh/integrations/onboarding-skills
    - theme: alt
      text: 观看演示
      link: /inspecto/demo/inspecto.mov

features:
  - title: 检查模式
    details: '点击单个组件，自动附带源码和 DOM 上下文，然后交给当前配置的 AI 链路。'
  - title: 标注模式
    details: '跨多个组件圈选 UI 问题，添加批注，创建 Agent 任务，并在侧边栏跟进处理进度。'
  - title: 快速跳转
    details: '按住 `Alt` + `点击` 页面元素，瞬间在编辑器中打开准确的源码位置，告别手动搜索。'
  - title: 助手引导接入
    details: '由 AI 助手主导的智能接入。在项目根目录运行安装命令，让 AI 在 IDE 中自动引导你完成配置。'
  - title: 自定义工作流
    details: '在 prompts.json 里定义 Deploy Preview、Review & PR 等 workflow 按钮，让 Agent 利用自身 skill、MCP server 和 tool 执行。'
  - title: 浏览器侧 Agent 时间线
    details: '使用 MCP 时，Inspecto 会把 session 更新实时推回侧边栏，让用户看到领取、处理中、完成或忽略等状态。'
---

## 看一看实际效果

<video controls playsinline muted preload="metadata" style="width: 100%; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18); margin: 8px 0 24px; box-sizing: border-box;">
  <source :src="'/inspecto/demo/inspecto.mov'" type="video/quicktime" />
  <source :src="'/inspecto/demo/inspecto.mov'" />
  当前浏览器不支持直接播放，可<a :href="'/inspecto/demo/inspecto.mov'">点此下载视频</a>。
</video>

## 为什么选择 Inspecto？

<img :src="'/inspecto/inspecto-workflow.png'" alt="Traditional vs Inspecto Workflow" style="width: 100%; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05); margin: 16px 0 48px;" />

## 常见前端修复场景

<div class="scenario-grid">
  <div class="scenario-card">
    <strong>修一个肉眼可见的 UI bug</strong>
    <p>点击出问题的组件，把准确源码上下文交给 AI，不再手动解释代码在哪里。</p>
  </div>
  <div class="scenario-card">
    <strong>处理设计走查意见</strong>
    <p>一次圈选多个元素，分别写下修改意见，然后创建一个 Agent 任务。</p>
  </div>
  <div class="scenario-card">
    <strong>让 MCP Agent 后台处理</strong>
    <p>在浏览器里创建任务，让 Agent 领取，并在侧边栏查看回复、进度和完成状态。</p>
  </div>
  <div class="scenario-card">
    <strong>执行自定义工作流</strong>
    <p>通过 prompts.json 增加 Deploy Preview 或 Review & PR 按钮，让 Agent 调用自身 skill、MCP server 和 tool 完成任务。</p>
  </div>
</div>

## 核心工作流

<script setup>
import HeroArchitecture from '../components/HeroArchitecture.vue'
</script>

<HeroArchitecture />

<div class="mode-grid">
  <div class="mode-card">
    <img :src="'/inspecto/inspect-mode.gif'" alt="检查模式 workflow" />
    <h3>检查模式</h3>
    <p>点击组件，附带准确上下文，然后交给 AI 助手处理。</p>
  </div>
  <div class="mode-card">
    <img :src="'/inspecto/annotate-mode.gif'" alt="标注模式 workflow" />
    <h3>标注模式</h3>
    <p>收集多条 UI 批注，创建一个任务，并在浏览器里跟进 Agent 进度。</p>
  </div>
  <div class="mode-card">
    <img :src="'/inspecto/quick-jump.gif'" alt="快速跳转 workflow" />
    <h3>快速跳转</h3>
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
      <li>你希望 Agent 处理 UI 批注，同时能在浏览器里跟进进度</li>
      <li>你希望把 deploy、review、PR 或 release 变成项目专属按钮</li>
      <li>你不想继续在多个工具之间复制粘贴</li>
      <li>你需要准确的上下文但不想手动查代码</li>
    </ul>
  </div>
  <div class="home-panel home-panel--accent">
    <h3>第一次使用怎么选</h3>
    <ol>
      <li><strong>先选你正在用的编辑器 / AI 助手</strong>，比如 VS Code + Copilot、Cursor 或 Trae。</li>
      <li><strong>在项目根目录运行一条安装命令</strong>，不用先理解 MCP 或 IDE route。</li>
      <li><strong>重启开发服务并打开浏览器</strong>，开始使用检查模式、标注模式或 Alt + Click。</li>
    </ol>
    <p style="margin: 12px 0 0; font-size: 0.85rem; color: var(--vp-c-text-2);">
      只想源码跳转或只用独立 MCP Agent？进入 <a href="/inspecto/zh/guide/getting-started">快速开始</a> 查看更具体的选择。
    </p>
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

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin: 8px 0 36px;
}

.scenario-card {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(248, 250, 252, 0.68));
}

.scenario-card strong {
  display: block;
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}

.scenario-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.92rem;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .VPHero .text {
    white-space: normal;
  }

  .mode-grid {
    grid-template-columns: 1fr;
  }

  .scenario-grid {
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
