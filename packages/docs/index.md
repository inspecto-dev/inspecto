---
layout: home

hero:
  name: 'Inspecto'
  text: 'Click UI. Jump to source. Let AI fix it.'
  tagline: 'Start from the browser, capture exact component context, send it to your AI assistant or MCP agent, trigger custom workflows, and track progress without losing the page.'
  image:
    src: /icon.png
    alt: Inspecto Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: More Setup Options
      link: /integrations/onboarding-skills
    - theme: alt
      text: Watch Demo
      link: /inspecto/demo/inspecto.mov

features:
  - title: Inspect mode
    details: 'Click one component, attach exact source and DOM context, then hand it to your configured AI path.'
  - title: Annotate mode
    details: 'Select multiple UI issues, add notes, create an agent task, and follow progress in the sidebar timeline.'
  - title: Quick jump
    details: 'Hold `Alt` + `Click` on any element to instantly open the exact source location in your editor, skipping manual search.'
  - title: Assistant-first setup
    details: 'AI-led intelligent setup. Run one install command in your project root, and let the AI automatically guide you through configuration in your IDE.'
  - title: Custom workflows
    details: 'Define workflow buttons in prompts.json, such as Deploy Preview or Review & PR, and let your agent execute them with its own skills, MCP servers, and tools.'
  - title: Browser-side agent timeline
    details: 'When using MCP, Inspecto streams session updates back into the sidebar so users can see claimed, progress, resolved, and dismissed states.'
---

## See It in Action

<video controls playsinline muted preload="metadata" style="width: 100%; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18); margin: 8px 0 24px; box-sizing: border-box;">
  <source :src="'/inspecto/demo/inspecto.mov'" type="video/quicktime" />
  <source :src="'/inspecto/demo/inspecto.mov'" />
  Your browser does not support the demo video. <a :href="'/inspecto/demo/inspecto.mov'">Download it here</a>.
</video>

## Why Inspecto?

<img :src="'/inspecto/inspecto-workflow.png'" alt="Traditional vs Inspecto Workflow" style="width: 100%; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05); margin: 16px 0 48px;" />

## Common Frontend Fixes

<div class="scenario-grid">
  <div class="scenario-card">
    <strong>Fix a visible UI bug</strong>
    <p>Click the broken component, send exact source context to your assistant, and avoid explaining where the code lives.</p>
  </div>
  <div class="scenario-card">
    <strong>Apply design review comments</strong>
    <p>Annotate several elements in one pass, add per-element notes, then create one task for the agent.</p>
  </div>
  <div class="scenario-card">
    <strong>Let an MCP agent work in the background</strong>
    <p>Create a browser task, let the agent claim it, and watch replies, progress, and completion in the sidebar.</p>
  </div>
  <div class="scenario-card">
    <strong>Run a custom workflow</strong>
    <p>Add a Deploy Preview or Review & PR button through prompts.json, then let the agent use its own skills, MCP servers, and tools.</p>
  </div>
</div>

## See the Core Workflows

<script setup>
import HeroArchitecture from './components/HeroArchitecture.vue'
</script>

<HeroArchitecture />

<div class="mode-grid">
  <div class="mode-card">
    <img :src="'/inspecto/inspect-mode.gif'" alt="Inspect mode workflow" />
    <h3>Inspect mode</h3>
    <p>Click a component, attach exact context, and hand it to your AI assistant.</p>
  </div>
  <div class="mode-card">
    <img :src="'/inspecto/annotate-mode.gif'" alt="Annotate mode workflow" />
    <h3>Annotate mode</h3>
    <p>Collect multiple UI notes, create one task, and track agent progress in the browser.</p>
  </div>
  <div class="mode-card">
    <img :src="'/inspecto/quick-jump.gif'" alt="Quick jump workflow" />
    <h3>Quick jump</h3>
    <p>Hold <code>Alt + Click</code> on any element to instantly open the exact source location, skipping manual search.</p>
  </div>
</div>

## Ecosystem

<img :src="'/inspecto/inspecto-ecosystem.png'" alt="Inspecto Ecosystem and Integrations" style="width: 100%; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05); margin: 16px 0 48px;" />

<div class="home-grid">
  <div class="home-panel">
    <h3>Use Inspecto when...</h3>
    <ul>
      <li>the issue is already visible in the browser</li>
      <li>you want the shortest path to source or AI</li>
      <li>you want an agent to process UI annotations while you follow progress in the browser</li>
      <li>you want project-specific workflow buttons such as deploy, review, PR, or release</li>
      <li>you are tired of copying snippets between tools</li>
      <li>you need accurate context without manual lookup</li>
    </ul>
  </div>
  <div class="home-panel home-panel--accent">
    <h3>What should I choose first?</h3>
    <ol>
      <li><strong>Pick the editor / AI assistant you already use</strong>, such as VS Code + Copilot, Cursor, or Trae.</li>
      <li><strong>Run one install command from your project root</strong>. You do not need to understand MCP or IDE routes first.</li>
      <li><strong>Restart your dev server and open the browser</strong>, then use Inspect mode, Annotate mode, or Alt + Click.</li>
    </ol>
    <p style="margin: 12px 0 0; font-size: 0.85rem; color: var(--vp-c-text-2);">
      Only want source jump or a standalone MCP agent? See <a href="/inspecto/guide/getting-started">Getting Started</a> for the specific path.
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
