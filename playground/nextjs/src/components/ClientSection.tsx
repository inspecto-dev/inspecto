'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const DynamicWidget = dynamic(() => import('./DynamicWidget'), {
  loading: () => <p className="loading-copy">Loading widget…</p>,
})

export function ClientSection() {
  const [count, setCount] = useState(3)
  const [status, setStatus] = useState<'Draft' | 'Ready for review' | 'Needs follow-up'>('Draft')

  return (
    <section className="section">
      <div className="section-heading">
        <h2>Verification cases</h2>
        <p>
          These client-side targets cover state, runtime evidence, CSS context, annotate batches,
          and lazy boundaries.
        </p>
      </div>
      <div className="case-grid">
        <article className="panel case-card">
          <span className="eyebrow">Stateful inspect</span>
          <h3>Interactive client boundary</h3>
          <p>
            Inspect this card to confirm stateful client logic is captured correctly inside a
            {' `use client` '} boundary. Current count: {count}.
          </p>
          <button className="primary-button" onClick={() => setCount(value => value + 1)}>
            Increment count
          </button>
        </article>

        <article className="panel case-card case-card--runtime">
          <span className="eyebrow">Runtime evidence</span>
          <h3>Intentional runtime error</h3>
          <p>
            Use Inspect with the bug icon enabled after clicking this button. The thrown error
            should appear as runtime evidence.
          </p>
          <button
            className="danger-button"
            onClick={() => {
              throw new Error('Inspecto Next.js runtime test error')
            }}
          >
            Trigger runtime error
          </button>
        </article>

        <article className="panel case-card case-card--css">
          <span className="eyebrow">CSS context</span>
          <h3>Styled account summary</h3>
          <p>
            Use the CSS icon on this card to verify style context across typography, spacing,
            labels, and action emphasis.
          </p>
          <div className="style-specimen">
            <span className="style-pill">Priority</span>
            <div className="style-stack">
              <strong>Renewal briefing</strong>
              <span>Commercial review due this afternoon</span>
            </div>
            <button className="ghost-button">Open account</button>
          </div>
        </article>

        <article className="panel case-card">
          <span className="eyebrow">Annotate batch</span>
          <h3>Cross-component review lane</h3>
          <p>
            Use Annotate across this card, the dynamic card, and the status card to test multi-note
            capture with one overall goal.
          </p>
          <ul className="checklist">
            <li>Header density may be too high.</li>
            <li>CTA hierarchy could be clearer.</li>
            <li>Status phrasing should feel more operational.</li>
          </ul>
        </article>

        <article className="panel case-card">
          <span className="eyebrow">Status controls</span>
          <h3>Review state handoff</h3>
          <p>
            This card gives you a second interactive surface for Inspect and Annotate across
            unrelated components.
          </p>
          <div className="status-row">
            {(['Draft', 'Ready for review', 'Needs follow-up'] as const).map(option => (
              <button
                key={option}
                className={option === status ? 'toggle-button active' : 'toggle-button'}
                onClick={() => setStatus(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="status-note">Current state: {status}</p>
        </article>

        <DynamicWidget />
      </div>
    </section>
  )
}
