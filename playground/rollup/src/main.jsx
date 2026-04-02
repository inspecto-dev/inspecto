import { createRoot } from 'react-dom/client'
import { mountInspector } from '@inspecto-dev/core'

if (process.env.NODE_ENV !== 'production') {
  console.log('Running in development mode, mounting Inspecto...')
  mountInspector()
}

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Inspecto Rollup Playground</h1>
      <p>This is a React application built with Rollup.</p>

      <div
        style={{
          marginTop: '20px',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      >
        <h2>Test Component</h2>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Click me
        </button>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('app'))
root.render(<App />)
