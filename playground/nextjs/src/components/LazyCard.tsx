'use client'

interface LazyCardProps {
  title: string
}

export function LazyCard({ title }: LazyCardProps) {
  return (
    <article className="panel case-card">
      <span className="eyebrow">Client component</span>
      <h3>{title}</h3>
      <p>
        Use this card as a simple, stable mapping anchor when validating file, line, and column
        precision.
      </p>
    </article>
  )
}
