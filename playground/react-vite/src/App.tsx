import { useState } from 'react'

function ModeCard({
  title,
  description,
  steps,
}: {
  title: string
  description: string
  steps: string[]
}) {
  return (
    <article className="panel mode-card">
      <span className="eyebrow">Mode</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <ol>
        {steps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </article>
  )
}

function CaseCard({
  label,
  title,
  description,
  children,
  tone = 'default',
}: {
  label: string
  title: string
  description: string
  children?: React.ReactNode
  tone?: 'default' | 'runtime' | 'css'
}) {
  return (
    <article className={`panel case-card case-card--${tone}`}>
      <span className="eyebrow">{label}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </article>
  )
}

export default function App() {
  const [count, setCount] = useState(2)
  const [status, setStatus] = useState<'Draft' | 'Ready for review' | 'Needs follow-up'>('Draft')

  return (
    <main className="demo-shell">
      <section className="hero panel">
        <div>
          <span className="hero-kicker">React + Vite playground</span>
          <h1>Inspecto verification surface</h1>
          <p className="hero-copy">
            Use this page to validate the real browser workflow: choose <strong>Inspect</strong> for
            one component, <strong>Annotate</strong> for batch notes, and use{' '}
            <strong>Alt + Click</strong> for quick jump to source.
          </p>
        </div>
        <div className="hero-checklist">
          <div>
            <strong>1.</strong> Open the launcher and pick a mode.
          </div>
          <div>
            <strong>2.</strong> Inspect a card, annotate multiple cards, or quick-jump to source.
          </div>
          <div>
            <strong>3.</strong> Use the runtime and CSS cases below to verify evidence attachment.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Mode checks</h2>
          <p>
            The first row exists only to verify the three primary entry points without ambiguity.
          </p>
        </div>
        <div className="mode-grid">
          <ModeCard
            title="Inspect"
            description="Confirm that one click opens the inspect menu and the built-in intents are visible."
            steps={[
              'Choose Inspect from the launcher.',
              'Click any card below.',
              'Check bug, CSS, and Open in Editor actions.',
            ]}
          />
          <ModeCard
            title="Annotate"
            description="Confirm that you can capture several component notes, set an overall goal, and send one batch."
            steps={[
              'Choose Annotate from the launcher.',
              'Click several cards and save notes.',
              'Add an overall goal in the sidebar, then Ask AI once.',
            ]}
          />
          <ModeCard
            title="Quick jump"
            description="Confirm that Alt + Click always jumps to the matching source location without opening the menu."
            steps={[
              'Hold Alt (or Option).',
              'Click a target component.',
              'Verify the editor opens the correct file and line.',
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Verification cases</h2>
          <p>
            These cases intentionally exercise state, runtime evidence, CSS context, and multi-note
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
                throw new Error('Inspecto React Vite runtime test error')
              }}
            >
              Trigger runtime error
            </button>
          </CaseCard>

          <CaseCard
            label="CSS context"
            title="Visual treatment reference"
            description="Use the CSS icon on this card to verify style context. It contains gradients, badges, buttons, and spacing relationships that are easy to reason about."
            tone="css"
          >
            <div className="style-specimen">
              <span className="style-pill">Priority</span>
              <div className="style-stack">
                <strong>Billing escalation</strong>
                <span>Response target: 2 business hours</span>
              </div>
              <button className="ghost-button">Review account</button>
            </div>
          </CaseCard>

          <CaseCard
            label="Annotate batch"
            title="Cross-component review lane"
            description="Use Annotate across this card and neighboring cards to test multi-note capture. This content is intentionally neutral so you can define your own overall goal."
          >
            <ul className="checklist">
              <li>Hero copy could be shorter.</li>
              <li>CTA emphasis may be too strong.</li>
              <li>Status framing should feel more operational.</li>
            </ul>
          </CaseCard>

          <CaseCard
            label="Status controls"
            title="Review state handoff"
            description="This card gives you a second interactive surface for Inspect and Annotate. It is useful when testing batch notes across unrelated components."
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
            description="Use this card when you want a simple, stable target to verify the exact file, line, and column mapping in App.tsx."
          />
        </div>
      </section>
    </main>
  )
}
