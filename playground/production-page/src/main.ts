import { mountInspector } from '@inspecto-dev/core'
import './style.css'

document.title = 'Inspecto Production Page Playground'
window.history.replaceState({}, '', '/online/billing?session=secret-session#token')

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="shell">
    <section class="hero panel">
      <span class="eyebrow">Production page playground</span>
      <h1>Production page target evidence</h1>
      <p>
        This project intentionally does not use any Inspecto compile-time plugin. Every clickable
        element below is normal runtime DOM, which validates production-page inspection without
        source-location injection.
      </p>
    </section>

    <section class="panel evidence-card" aria-labelledby="billing-heading">
      <div class="card-copy">
        <span class="eyebrow">Billing</span>
        <h2 id="billing-heading">Enterprise billing plan</h2>
        <p>
          Owner: qa@example.com · Workspace: growth-team · The prompt should redact sensitive text
          and infer likely source tokens from runtime target evidence.
        </p>
      </div>

      <button
        id="online-upgrade-plan"
        class="primary-button upgrade-plan-button billing-upgrade-cta"
        data-testid="online-upgrade-plan"
        data-token="secret-token-should-be-redacted"
        data-session-key="session-key-should-be-redacted"
        aria-label="Upgrade online enterprise plan"
        href="/billing/upgrade?session=secret-session"
      >
        Upgrade online plan
      </button>
    </section>

    <section class="panel checks">
      <h2>Manual verification</h2>
      <ol>
        <li>Run this playground without adding any Inspecto build plugin.</li>
        <li>Use Inspect mode and click <strong>Upgrade online plan</strong>.</li>
        <li>The menu should show <strong>No source location</strong>.</li>
        <li>The Open in Editor button should be hidden.</li>
        <li>Custom ask and built-in intents should send <code>Selected target evidence</code>.</li>
      </ol>
    </section>
  </main>
`

void mountInspector({
  defaultActive: true,
  mode: 'inspect',
  includeSnippet: true,
})
