<script setup lang="ts">
import { ref as vueRef } from "vue";

const count = vueRef(0);
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>Inspecto</h1>
      <p>
        Click any page element → instantly send code context to GitHub Copilot,
        Claude Code CLI, or Coco CLI
      </p>
    </header>

    <div class="instruction-box">
      Hold <kbd>Option ⌥</kbd> (Mac) or <kbd>Alt</kbd> (Windows) and click on
      any element below to inspect it.
    </div>

    <div class="feature-list">
      <h2 style="margin-top: 0; font-size: 1.2rem">Features</h2>
      <ul>
        <li>
          🖱️ <strong>Click-to-inspect</strong> any JSX element during
          development
        </li>
        <li>
          🤖 <strong>Sends source context</strong> directly to GitHub Copilot
          Chat, Claude Code CLI, or Coco CLI
        </li>
        <li>
          ⚡ <strong>Zero runtime overhead</strong> in production (compile-time
          attributes, tree-shaken)
        </li>
        <li>
          🎨 <strong>Framework-agnostic overlay</strong> (pure Web Component,
          Shadow DOM)
        </li>
        <li>
          🔧 <strong>Works with</strong> Vite, Webpack, Rspack, Rollup (via
          unplugin)
        </li>
        <li>⌨️ <strong>Configurable</strong> hotkeys and preset AI targets</li>
      </ul>
    </div>

    <h2 class="section-title">Test Cases (Vue + Vite)</h2>

    <div class="grid">
      <div class="card">
        <div class="badge">AST Transformation</div>
        <h2>Precise Element Mapping</h2>
        <p>
          The unplugin parses your source files via AST (Abstract Syntax Tree)
          and injects the exact file path, line number, and column into the DOM.
          Try inspecting this card to see exactly where it lives.
        </p>
      </div>

      <div class="card">
        <div class="badge">State Management</div>
        <h2>Inspect Stateful Logic</h2>
        <p>
          When you inspect a component, the AI gets the full source code
          context, including ref variables. For example, the current count is
          {{ count }}.
        </p>
        <button @click="count++">Try interactive state</button>
      </div>

      <div class="card" style="background: #f8fafc; border: 1px solid #bae6fd">
        <div class="badge" style="background: #bfdbfe; color: #1e3a8a">
          Architecture
        </div>
        <h2>Shadow DOM Overlay</h2>
        <p>
          The inspector UI you see when holding the hotkey is rendered inside a
          Shadow DOM. This ensures that the inspector's own styles never leak
          into your application, and your app's global CSS never breaks the
          inspector UI.
        </p>
      </div>
    </div>
  </div>
</template>
