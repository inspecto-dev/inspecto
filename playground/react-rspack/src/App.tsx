import { useState } from 'react'
import './index.css'

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

const App = () => {
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

      <h2 className="section-title">Test Cases (React + Rspack)</h2>

      <div className="grid">
        <FeatureCard
          badge="Rspack Build"
          title="Ultra-fast Transformation"
          content={`Current count is ${count}. This app was built using Rspack. The unplugin efficiently transforms JSX ASTs via magic-string during the build process without slowing it down.`}
          onClick={() => setCount(c => c + 1)}
        />

        <FeatureCard
          badge="Stateless"
          title="Component Tracing"
          content="Even deeply nested components are traceable. The inspector overlay captures bounding rects precisely."
        />

        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div className="badge" style={{ background: '#fecaca', color: '#991b1b' }}>
            Source Mapping
          </div>
          <h2>Precision Injection</h2>
          <p>
            The compiler injects <code>data-inspecto</code> into the DOM elements accurately
            pointing to their source file and exact line numbers.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
