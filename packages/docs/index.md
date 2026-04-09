---
layout: home

hero:
  name: 'Inspecto'
  text: 'Inspect UI from your browser.'
  tagline: 'Inspecto is a browser-first frontend workflow for source lookup and automated AI handoff. Inspect one component, annotate a batch, or jump to source to reduce browser-to-editor context switching.'
  image:
    src: /icon.png
    alt: Inspecto Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Install Integrations
      link: /integrations/onboarding-skills
    - theme: alt
      text: Watch Demo
      link: /inspecto/demo/inspecto.mov

features:
  - title: Inspect mode
    details: 'Inspect a single component, automatically attach the right context, and ask AI instantly.'
  - title: Annotate mode
    details: 'Select multiple UI notes across components, add one overall goal, and send them as a single batch to AI.'
  - title: Quick jump
    details: 'Hold `Alt` + `Click` on any element to instantly open the exact source location in your editor, skipping manual search.'
  - title: Assistant-first setup
    details: 'AI-led intelligent setup. Run one install command in your project root, and let the AI automatically guide you through configuration in your IDE.'
  - title: Safe to adopt
    details: 'Compile-time attributes only, tree-shaken in production, and rendered via Shadow DOM to prevent any app style pollution.'
  - title: Broad support
    details: 'Seamlessly works with Vite, Webpack, Rspack, Rollup, esbuild, Next.js, and Nuxt.'
---

## See It in Action

<video controls playsinline muted preload="metadata" style="width: 100%; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18); margin: 8px 0 24px; box-sizing: border-box;">
  <source :src="'/inspecto/demo/inspecto.mov'" type="video/quicktime" />
  <source :src="'/inspecto/demo/inspecto.mov'" />
  Your browser does not support the demo video. <a :href="'/inspecto/demo/inspecto.mov'">Download it here</a>.
</video>

## Why Inspecto?

<img :src="'/inspecto/inspecto-workflow.png'" alt="Traditional vs Inspecto Workflow" style="width: 100%; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05); margin: 16px 0 48px;" />

## See the Three Workflows

<script setup>
import HeroArchitecture from './components/HeroArchitecture.vue'
</script>

<HeroArchitecture />

<div class="mode-grid">
  <div class="mode-card">
    <img :src="'/inspecto/inspect-mode.gif'" alt="Inspect mode workflow" />
    <h3>Inspect mode</h3>
    <p>Inspect a single component, automatically attach the right context, and ask AI instantly.</p>
  </div>
  <div class="mode-card">
    <img :src="'/inspecto/annotate-mode.gif'" alt="Annotate mode workflow" />
    <h3>Annotate mode</h3>
    <p>Select multiple UI notes across components, add one overall goal, and send them as a single batch to AI.</p>
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
      <li>you are tired of copying snippets between tools</li>
      <li>you need accurate context without manual lookup</li>
    </ul>
  </div>
  <div class="home-panel home-panel--accent">
    <h3>Fastest path</h3>
    <ol>
      <li><strong>Navigate to your project root</strong> (most integrations are installed per-project).</li>
      <li><strong>Install</strong> the integration matching your assistant.</li>
      <li><strong>Wait for onboarding to open</strong> in your IDE.</li>
      <li><strong>Only if onboarding does not open</strong>, send <code>Set up Inspecto in this project</code> manually.</li>
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
