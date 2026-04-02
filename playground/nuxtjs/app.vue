<template>
  <div class="container">
    <header class="header">
      <h1>Inspecto</h1>
      <p>
        Click any page element → instantly send code context to GitHub Copilot, Claude Code CLI, or
        Coco CLI
      </p>
    </header>

    <div class="instruction-box">
      Hold <kbd>Option ⌥</kbd> (Mac) or <kbd>Alt</kbd> (Windows) and click on any element below to
      inspect it.
    </div>

    <div class="feature-list">
      <h2 style="margin-top: 0; font-size: 1.2rem">Features</h2>
      <ul>
        <li>🖱️ <strong>Click-to-inspect</strong> any JSX/Vue element during development</li>
        <li>
          🤖 <strong>Sends source context</strong> directly to GitHub Copilot Chat, Claude Code CLI,
          or Coco CLI
        </li>
        <li>
          ⚡ <strong>Zero runtime overhead</strong> in production (compile-time attributes,
          tree-shaken)
        </li>
        <li>🎨 <strong>Framework-agnostic overlay</strong> (pure Web Component, Shadow DOM)</li>
        <li>🔧 <strong>Works with</strong> Vite, Webpack, Rspack, Rollup (via unplugin)</li>
        <li>⌨️ <strong>Configurable</strong> hotkeys and preset AI targets</li>
      </ul>
    </div>

    <h2 class="section-title">Test Cases (Nuxt.js + Vue)</h2>

    <div class="grid">
      <div class="card">
        <div class="badge">AST Transformation</div>
        <h2>Precise Element Mapping</h2>
        <p>
          The unplugin parses your source files via AST (Abstract Syntax Tree) and injects the exact
          file path, line number, and column into the DOM. Try inspecting this card to see exactly
          where it lives.
        </p>
      </div>

      <div class="card">
        <div class="badge">State Management</div>
        <h2>Inspect Stateful Logic</h2>
        <p>
          When you inspect a component, the AI gets the full source code context, including ref
          variables. For example, the current count is
          {{ count }}.
        </p>
        <button @click="count++">Try interactive state</button>
      </div>

      <div class="card" style="background: #f8fafc; border: 1px solid #bae6fd">
        <div class="badge" style="background: #bfdbfe; color: #1e3a8a">Architecture</div>
        <h2>Shadow DOM Overlay</h2>
        <p>
          The inspector UI you see when holding the hotkey is rendered inside a Shadow DOM. This
          ensures that the inspector's own styles never leak into your application, and your app's
          global CSS never breaks the inspector UI.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<style>
:root {
  --primary: #00dc82;
  --bg: #fafafa;
  --text: #333;
  --card-bg: #fff;
  --border: #eaeaea;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.header h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.05em;
}

.header p {
  font-size: 1.2rem;
  color: #666;
  margin: 0;
}

.instruction-box {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  padding: 1.2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
  font-weight: 500;
  color: #0050b3;
}

.instruction-box kbd {
  background: #fff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  font-family: monospace;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  margin-top: 3rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
  font-size: 1.5rem;
  color: #222;
}

.feature-list {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  margin-bottom: 2.5rem;
}

.feature-list ul {
  margin: 0;
  padding-left: 1.5rem;
}

.feature-list li {
  margin-bottom: 0.8rem;
  line-height: 1.5;
}

.feature-list li:last-child {
  margin-bottom: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  border-color: #ddd;
  transform: translateY(-2px);
}

.card h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--primary);
}

.card p {
  color: #555;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
  flex-grow: 1;
}

.card button {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  align-self: flex-start;
}

.card button:hover {
  background: #00c58e;
  transform: scale(1.02);
}

.code-block {
  background: #2d2d2d;
  color: #ccc;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.9rem;
  overflow-x: auto;
  margin: 1rem 0;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e0f2fe;
  color: #0369a1;
  margin-bottom: 1rem;
  align-self: flex-start;
}
</style>
