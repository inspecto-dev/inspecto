'use client'

import { useState } from 'react'
import { LazyCard } from './LazyCard'
import dynamic from 'next/dynamic'

// Test next/dynamic lazy loading
const DynamicWidget = dynamic(() => import('./DynamicWidget'), {
  loading: () => <p>Loading widget...</p>,
})

export function ClientSection() {
  const [count, setCount] = useState(0)

  return (
    <div className="grid">
      <div className="card">
        <h2>Interactive Client Component</h2>
        <p>
          Current count is {count}. Inspecting this area will reveal it's inside a 'use client'
          boundary.
        </p>
        <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      </div>

      <LazyCard title="Static Client Component" />

      <DynamicWidget />
    </div>
  )
}
