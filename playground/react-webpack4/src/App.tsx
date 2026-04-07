import React, { useState } from 'react'
import './App.css'

function ModeCard(props: { title: string; description: string; steps: string[] }) {
  return (
    <article className="panel mode-card">
      <span className="eyebrow">Mode</span>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
      <ol>
        {props.steps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </article>
  )
}

function CaseCard(props: {
  label: string
  title: string
  description: string
  children?: React.ReactNode
  tone?: 'default' | 'runtime' | 'css'
}) {
  const tone = props.tone || 'default'
  return (
    <article className={`panel case-card case-card--${tone}`}>
      <span className="eyebrow">{props.label}</span>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
      {props.children}
    </article>
  )
}

function App() {
  const [count, setCount] = useState(1)
  const [status, setStatus] = useState<'Draft' | 'Ready for review' | 'Needs follow-up'>('Draft')

  return (
    <main className="demo-shell">
      <section className="hero panel">
        <div>
          <span className="hero-kicker">React + Webpack 4 playground</span>
          <h1>Inspecto verification surface</h1>
          <p className="hero-copy">
            This page validates the current browser workflow on the legacy Webpack 4 stack: choose{' '}
            <strong>Inspect</strong> for one component, <strong>Annotate</strong> for batches, and
            use <strong>Alt + Click</strong> for quick jump to source.
          </p>
        </div>
        <div className="hero-checklist">
          <div>
            <strong>1.</strong> Open the launcher and pick a mode.
          </div>
          <div>
            <strong>2.</strong> Inspect one target, annotate several targets, or quick-jump to
            source.
          </div>
          <div>
            <strong>3.</strong> Use the runtime and CSS cases below to verify evidence attachment.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Mode checks</h2>
          <p>Use this row to validate the three main entry points on the legacy pipeline.</p>
        </div>
        <div className="mode-grid">
          <ModeCard
            title="Inspect"
            description="Click one component and confirm that the inspect menu opens with the built-in actions."
            steps={[
              'Choose Inspect from the launcher.',
              'Click any case card below.',
              'Check bug, CSS, and Open in Editor.',
            ]}
          />
          <ModeCard
            title="Annotate"
            description="Capture several notes, define an overall goal, and send one batch to AI."
            steps={[
              'Choose Annotate from the launcher.',
              'Click multiple cards and save notes.',
              'Use the sidebar goal field, then Ask AI once.',
            ]}
          />
          <ModeCard
            title="Quick jump"
            description="Confirm that Alt + Click opens the exact source location without opening the inspect menu."
            steps={[
              'Hold Alt or Option.',
              'Click a target component.',
              'Verify file, line, and column precision.',
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Verification cases</h2>
          <p>
            These cards intentionally cover state, runtime evidence, CSS context, and multi-note
            annotation.
          </p>
        </div>
        <div className="case-grid">
          <CaseCard
            label="Stateful inspect"
            title="Interactive state snapshot"
            description={`Inspect this card to confirm the current state value is captured with its surrounding component logic. Current count: ${count}.`}
          >
            <button className="primary-button" onClick={() => setCount(value => value + 1)}>
              Increment count
            </button>
          </CaseCard>

          <CaseCard
            label="Runtime evidence"
            title="Intentional runtime error"
            description="Use Inspect with the bug icon enabled after clicking this button. The thrown error should appear as runtime evidence for fix-oriented requests."
            tone="runtime"
          >
            <button
              className="danger-button"
              onClick={() => {
                throw new Error('Inspecto Webpack4 runtime test error')
              }}
            >
              Trigger runtime error
            </button>
          </CaseCard>

          <CaseCard
            label="CSS context"
            title="Visual treatment reference"
            description="Use the CSS icon on this card to verify style context. It contains gradients, spacing, labels, and button treatments."
            tone="css"
          >
            <div className="style-specimen">
              <span className="style-pill">Priority</span>
              <div className="style-stack">
                <strong>Legacy stabilization</strong>
                <span>Compatibility review still pending</span>
              </div>
              <button className="ghost-button">Open legacy item</button>
            </div>
          </CaseCard>

          <CaseCard
            label="Annotate batch"
            title="Cross-component review lane"
            description="Use Annotate across this card and neighboring cards to test multi-note capture with your own overall goal."
          >
            <ul className="checklist">
              <li>Header density may be too high.</li>
              <li>CTA hierarchy could be clearer.</li>
              <li>Status framing should feel more operational.</li>
            </ul>
          </CaseCard>

          <CaseCard
            label="Status controls"
            title="Review state handoff"
            description="This card gives you a second interactive surface for Inspect and Annotate across unrelated components."
          >
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
          </CaseCard>

          <CaseCard
            label="Source precision"
            title="AST mapping anchor"
            description="Use this stable target when you want a simple file/line/column check inside App.tsx."
          />
        </div>
      </section>
    </main>
  )
}

export default App
