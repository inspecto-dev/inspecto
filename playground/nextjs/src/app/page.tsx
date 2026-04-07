import { ClientSection } from '@/components/ClientSection'

export default function HomePage() {
  return (
    <main className="demo-shell">
      <section className="hero panel">
        <div>
          <span className="hero-kicker">Next.js App Router playground</span>
          <h1>Inspecto verification surface</h1>
          <p className="hero-copy">
            This page verifies the current browser workflow in a mixed Server/Client environment:
            use <strong>Inspect</strong> for one component, <strong>Annotate</strong> for batches,
            and <strong>Alt + Click</strong> for quick jump to source.
          </p>
        </div>
        <div className="hero-checklist">
          <div>
            <strong>1.</strong> Validate launcher-driven mode switching.
          </div>
          <div>
            <strong>2.</strong> Inspect client-rendered targets and annotate multiple cards.
          </div>
          <div>
            <strong>3.</strong> Use the runtime and CSS cases below to verify evidence behavior.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Mode checks</h2>
          <p>
            Use these instructions to validate the three primary flows without relying on outdated
            “hover to inspect” behavior.
          </p>
        </div>
        <div className="mode-grid">
          <article className="panel mode-card">
            <span className="eyebrow">Mode</span>
            <h3>Inspect</h3>
            <p>
              Click one client component and confirm that the inspect menu opens with the built-in
              actions.
            </p>
            <ol>
              <li>Choose Inspect from the launcher.</li>
              <li>Click any client card below.</li>
              <li>Check bug, CSS, and Open in Editor.</li>
            </ol>
          </article>

          <article className="panel mode-card">
            <span className="eyebrow">Mode</span>
            <h3>Annotate</h3>
            <p>
              Capture several notes across different cards, define an overall goal, and send one
              batch.
            </p>
            <ol>
              <li>Choose Annotate from the launcher.</li>
              <li>Click multiple cards and save notes.</li>
              <li>Use the sidebar goal field, then Ask AI once.</li>
            </ol>
          </article>

          <article className="panel mode-card">
            <span className="eyebrow">Mode</span>
            <h3>Quick jump</h3>
            <p>
              Confirm that Alt + Click opens the exact source location without opening the inspect
              menu.
            </p>
            <ol>
              <li>Hold Alt or Option.</li>
              <li>Click a target component.</li>
              <li>Verify file, line, and column precision.</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Next.js-specific note</h2>
          <p>
            This playground keeps the top-level page as a Server Component and pushes the
            interactive verification targets into client components below.
          </p>
        </div>
      </section>

      <ClientSection />
    </main>
  )
}
