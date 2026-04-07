import React from 'react'
import { createRoot } from 'react-dom/client'
import { mountInspector } from '@inspecto-dev/core'

if (process.env.NODE_ENV !== 'production') {
  mountInspector()
}

function App() {
  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 20px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#1f2937',
      }}
    >
      <h1>Inspecto esbuild Playground</h1>
      <p style={{ fontSize: '18px', color: '#4b5563', marginBottom: '16px' }}>
        Click any page element → instantly send code context to GitHub Copilot, Claude Code CLI, or
        Coco CLI.
      </p>

      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '16px',
          borderRadius: '10px',
          marginBottom: '20px',
          color: '#1d4ed8',
          fontWeight: 500,
        }}
      >
        Hold <kbd style={{ fontFamily: 'monospace' }}>Option ⌥</kbd> (Mac) or{' '}
        <kbd style={{ fontFamily: 'monospace' }}>Alt</kbd> (Windows) and click on any element below
        to inspect it.
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Inspecto 功能介绍</h2>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.7, color: '#4b5563' }}>
          <li>
            <strong>Click-to-inspect</strong>：开发时点击任意 JSX
            元素，快速定位源码文件、行号和列号。
          </li>
          <li>
            <strong>Send context to AI</strong>：把当前元素对应的源码上下文直接发送给 GitHub
            Copilot、Claude Code CLI 或 Coco CLI。
          </li>
          <li>
            <strong>Zero production overhead</strong>
            ：只在开发态启用，生产环境不会保留额外运行时负担。
          </li>
        </ul>
      </div>

      <div
        style={{
          padding: '20px',
          border: '1px solid #d1d5db',
          borderRadius: '12px',
          background: '#fff',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Test Component</h2>
        <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
          This React + esbuild example keeps the UI simple so you can focus on verifying that
          Inspecto mounts correctly and captures source context from the rendered component tree.
        </p>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Click me
        </button>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)
