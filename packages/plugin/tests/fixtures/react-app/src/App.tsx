import React from 'react'

export function App() {
  return (
    <div className="app-container">
      <h1>Hello Inspecto</h1>
      <button onClick={() => console.log('clicked')}>Click me</button>
      <section>
        <p>This is a test fixture.</p>
      </section>
    </div>
  )
}

export default App
