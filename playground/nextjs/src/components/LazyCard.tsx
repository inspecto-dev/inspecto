'use client'

interface LazyCardProps {
  title: string
}

export function LazyCard({ title }: LazyCardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>
        This component was loaded statically but is still a Client Component. Click the button to
        see an alert.
      </p>
      <button onClick={() => alert('Lazy Card clicked!')}>View Details</button>
    </div>
  )
}
