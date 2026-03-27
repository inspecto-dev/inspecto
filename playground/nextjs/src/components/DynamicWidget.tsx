'use client'

export default function DynamicWidget() {
  return (
    <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
      <h2>Dynamic Client Component</h2>
      <p>
        This component was loaded asynchronously via next/dynamic. The inspector works here too.
      </p>
      <button style={{ background: '#10b981' }}>Dynamic Action</button>
    </div>
  )
}
