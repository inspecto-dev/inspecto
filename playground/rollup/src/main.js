import { mountInspector } from '@inspecto/core'

// Initialize the client manually for Rollup
mountInspector({
  serverUrl: 'http://127.0.0.1:5678',
})

const app = document.getElementById('app')
app.innerHTML = `
<div class="container" data-inspecto="src/main.js:10:1">
  <header class="header" data-inspecto="src/main.js:11:3">
    <h1 data-inspecto="src/main.js:12:5">Inspecto</h1>
    <p data-inspecto="src/main.js:13:5">Click any page element → instantly send code context to AI (Rollup Build)</p>
  </header>
  
  <div class="instruction-box" data-inspecto="src/main.js:16:3">
    Hold <kbd>Option ⌥</kbd> (Mac) or <kbd>Alt</kbd> (Windows) and click on any element below to inspect it.
  </div>

  <div class="feature-list" data-inspecto="src/main.js:20:3">
    <h2 style="margin-top: 0; font-size: 1.2rem;" data-inspecto="src/main.js:21:5">Features</h2>
    <ul data-inspecto="src/main.js:22:5">
      <li data-inspecto="src/main.js:23:7">🖱️ <strong>Click-to-inspect</strong> any DOM element</li>
      <li data-inspecto="src/main.js:24:7">🤖 <strong>Sends source context</strong> directly to AI</li>
      <li data-inspecto="src/main.js:25:7">📦 <strong>Built with</strong> Vanilla JS and Rollup</li>
    </ul>
  </div>

  <h2 class="section-title" data-inspecto="src/main.js:29:3">Rollup Integration</h2>
  
  <div class="grid" data-inspecto="src/main.js:31:3">
    <div class="card" data-inspecto="src/main.js:32:5">
      <div class="badge" data-inspecto="src/main.js:33:7">Vanilla JS</div>
      <h2 data-inspecto="src/main.js:34:7">No Framework Needed</h2>
      <p data-inspecto="src/main.js:35:7">This example demonstrates how Inspecto works natively without React or Vue wrappers. The DOM is fully annotated with \`data-inspecto\` attributes.</p>
    </div>

    <div class="card" data-inspecto="src/main.js:39:5" style="background: #f8fafc; border: 1px solid #bae6fd;">
      <div class="badge" style="background: #bfdbfe;" data-inspecto="src/main.js:40:7">Architecture</div>
      <h2 data-inspecto="src/main.js:41:7">Pure Web Components</h2>
      <p data-inspecto="src/main.js:42:7">The inspector UI is built entirely with Web Components and Shadow DOM, making it universally compatible across any bundler and framework.</p>
    </div>
  </div>
</div>
`
