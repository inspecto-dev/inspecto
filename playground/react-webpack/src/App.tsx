import { useState } from 'react'
import './App.css'

function FeatureCard({
  title,
  badge,
  content,
  onClick,
  code,
}: {
  title: string
  badge?: string
  content: string
  onClick?: () => void
  code?: string
}) {
  return (
    <div className="card">
      {badge && <div className="badge">{badge}</div>}
      <h2>{title}</h2>
      <p>{content}</p>
      {code && <div className="code-block">{code}</div>}
      {onClick && <button onClick={onClick}>Try interactive state</button>}
    </div>
  )
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container">
      <header className="header">
        <h1>Inspecto</h1>
        <p>
          Click any page element → instantly send code context to GitHub Copilot, Claude Code CLI,
          or Coco CLI
        </p>
      </header>

      <div className="instruction-box">
        Hold <kbd>Option ⌥</kbd> (Mac) or <kbd>Alt</kbd> (Windows) and click on any element below to
        inspect it.
      </div>

      <div className="feature-list">
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Features</h2>
        <ul>
          <li>
            🖱️ <strong>Click-to-inspect</strong> any JSX element during development
          </li>
          <li>
            🤖 <strong>Sends source context</strong> directly to GitHub Copilot Chat, Claude Code
            CLI, or Coco CLI
          </li>
          <li>
            ⚡ <strong>Zero runtime overhead</strong> in production (compile-time attributes,
            tree-shaken)
          </li>
          <li>
            🎨 <strong>Framework-agnostic overlay</strong> (pure Web Component, Shadow DOM)
          </li>
          <li>
            🔧 <strong>Works with</strong> Vite, Webpack, Rspack, Rollup (via unplugin)
          </li>
          <li>
            ⌨️ <strong>Configurable</strong> hotkeys and preset AI targets
          </li>
        </ul>
      </div>

      <h2 className="section-title">Features Showcase</h2>

      <div className="grid">
        <FeatureCard
          badge="AST Transformation"
          title="Precise Element Mapping"
          content="The unplugin parses your source files via AST (Abstract Syntax Tree) and injects the exact file path, line number, and column into the DOM. Try inspecting this card to see exactly where it lives in App.tsx."
        />

        <FeatureCard
          badge="State Management"
          title="Inspect Stateful Logic"
          content={`When you inspect a component, the AI gets the full source code context, including hooks and state variables. For example, the current count is ${count}.`}
          onClick={() => setCount(c => c + 1)}
        />

        <FeatureCard
          badge="Custom Prompts"
          title="Intent Pre-configuration"
          content="You can configure custom intents in the AI menu. Provide your own prompt templates using variables like {{file}} and {{snippet}} to streamline your workflow."
          code={`<Inspecto intents={[\n  { id: 'explain', label: 'Explain Code' }\n]} />`}
        />

        <div className="card" style={{ background: '#f8fafc', border: '1px solid #bae6fd' }}>
          <div className="badge" style={{ background: '#bfdbfe' }}>
            Architecture
          </div>
          <h2>Shadow DOM Overlay</h2>
          <p>
            The inspector UI you see when holding the hotkey is rendered inside a Shadow DOM. This
            ensures that the inspector's own styles never leak into your application, and your app's
            global CSS never breaks the inspector UI.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
