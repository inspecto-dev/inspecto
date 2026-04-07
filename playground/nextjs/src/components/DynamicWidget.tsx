'use client'

export default function DynamicWidget() {
  return (
    <article className="panel case-card">
      <span className="eyebrow">Dynamic boundary</span>
      <h3>next/dynamic target</h3>
      <p>
        This component is loaded through <code>next/dynamic</code>. Use it as a stable target when
        you want to verify inspection across lazy client boundaries.
      </p>
      <button className="primary-button">Dynamic action</button>
    </article>
  )
}
