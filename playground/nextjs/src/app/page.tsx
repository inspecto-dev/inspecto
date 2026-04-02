import { ClientSection } from '@/components/ClientSection'

// This is a React Server Component — no 'use client'
// data-inspecto must NOT appear on elements in this file

export default function HomePage() {
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

      <h2 className="section-title">Test Cases (Next.js App Router)</h2>

      <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
        This Next.js App Router playground demonstrates support for both Server and Client
        Components.
      </p>

      <ClientSection />
    </div>
  )
}
