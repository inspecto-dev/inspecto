import { mountInspector } from '@inspecto-dev/core'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createApp } from 'vue'
import { FrameworkEvidencePage } from './react/FrameworkEvidencePage'
import VueFrameworkEvidencePage from './vue/VueFrameworkEvidencePage.vue'
import './style.css'

document.title = 'Inspecto Framework Target Evidence Playground'
window.history.replaceState(
  {},
  '',
  '/online/framework-target-evidence?session=secret-session#token',
)

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <section class="hero panel">
      <span class="eyebrow">Framework target evidence playground</span>
      <h1>Runtime framework target evidence</h1>
      <p>
        This project intentionally mounts React and Vue components without using the Inspecto
        compile-time plugin, so Inspect mode validates runtime framework evidence directly.
      </p>
    </section>

    <section class="panel split-grid" aria-label="Framework evidence examples">
      <div id="react-root"></div>
      <div id="vue-root"></div>
    </section>

    <section class="panel checks">
      <h2>Manual verification</h2>
      <ol>
        <li>Run this playground without adding any Inspecto build plugin.</li>
        <li>Use Inspect mode and click <strong>Upgrade React plan</strong>.</li>
        <li>The prompt should include <code>Framework evidence</code> with React component names and local source paths.</li>
        <li>Click <strong>Upgrade Vue plan</strong>.</li>
        <li>The prompt should include <code>Framework evidence</code> with Vue component names and local source paths.</li>
        <li>Prop values such as secret plan ids should not appear in the prompt.</li>
      </ol>
    </section>
  </main>
`

createRoot(document.querySelector<HTMLDivElement>('#react-root')!).render(<FrameworkEvidencePage />)
createApp(VueFrameworkEvidencePage).mount('#vue-root')

void mountInspector({
  defaultActive: true,
  mode: 'inspect',
  includeSnippet: true,
})
