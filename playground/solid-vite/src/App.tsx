import { createSignal, createEffect, onCleanup, createMemo, type JSX } from 'solid-js'

function ModeCard(props: { title: string; description: string; steps: string[] }) {
  return (
    <article class="panel mode-card">
      <span class="eyebrow">Mode</span>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
      <ol>
        {props.steps.map(step => (
          <li>{step}</li>
        ))}
      </ol>
    </article>
  )
}

function CaseCard(props: {
  label: string
  title: string
  description: string
  children?: JSX.Element
  tone?: 'default' | 'runtime' | 'css'
}) {
  return (
    <article class={`panel case-card case-card--${props.tone || 'default'}`}>
      <span class="eyebrow">{props.label}</span>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
      {props.children}
    </article>
  )
}

export default function App() {
  const [count, setCount] = createSignal(2)
  const [status, setStatus] = createSignal<'Draft' | 'Ready for review' | 'Needs follow-up'>(
    'Draft',
  )
  const [isModalOpen, setIsModalOpen] = createSignal(false)

  let focusTestInputRef: HTMLInputElement | undefined
  const [focusGuardEnabled, setFocusGuardEnabled] = createSignal(false)
  const [focusGuardStrategy, setFocusGuardStrategy] = createSignal<'timeout' | 'raf' | 'both'>(
    'timeout',
  )

  const focusGuardLabel = createMemo(() => {
    if (!focusGuardEnabled()) return 'Off'
    if (focusGuardStrategy() === 'timeout') return 'On (setTimeout(0))'
    if (focusGuardStrategy() === 'raf') return 'On (requestAnimationFrame)'
    return 'On (both)'
  })

  const [activeElementTag, setActiveElementTag] = createSignal<string>('')

  createEffect(() => {
    const update = () => {
      const el = document.activeElement as HTMLElement | null
      setActiveElementTag(el?.tagName ? el.tagName.toLowerCase() : '')
    }
    update()
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    onCleanup(() => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    })
  })

  return (
    <main class="demo-shell">
      <section class="hero panel">
        <div>
          <span class="hero-kicker">Solid + Vite playground</span>
          <h1
            class="document_docNavBar__L2vQJ document_hasDoc__jpd6x documentWithTOC
  extremely_long_navigation_header_selector_that_should_wrap_properly"
          >
            Inspecto verification surface
          </h1>
          <p class="hero-copy">
            Use this page to validate the real browser workflow: choose <strong>Inspect</strong> for
            one component, <strong>Annotate</strong> for batch notes, and use{' '}
            <strong>Alt + Click</strong> for quick jump to source.
          </p>
        </div>
        <div class="hero-checklist">
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

      <section class="section">
        <div class="section-heading">
          <h2>Mode checks</h2>
          <p>
            The first row exists only to verify the three primary entry points without ambiguity.
          </p>
        </div>
        <div class="mode-grid">
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
              'Add an overall goal in the sidebar, then submit the batch.',
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

      <section class="section">
        <div class="section-heading">
          <h2>Verification cases</h2>
          <p>
            These cases intentionally exercise state, runtime evidence, CSS context, and multi-note
            annotation.
          </p>
        </div>
        <div class="case-grid">
          <CaseCard
            label="Stateful inspect"
            title="Interactive state snapshot"
            description={`Inspect this card to confirm the current state value is captured with its surrounding component logic. Current count: ${count()}.`}
          >
            <button class="primary-button" onClick={() => setCount(value => value + 1)}>
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
              class="danger-button"
              onClick={() => {
                throw new Error('Inspecto Solid Vite runtime test error')
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
            <div class="style-specimen">
              <span class="style-pill">Priority</span>
              <div class="style-stack">
                <strong>Billing escalation</strong>
                <span>Response target: 2 business hours</span>
              </div>
              <button class="ghost-button">Review account</button>
            </div>
          </CaseCard>

          <CaseCard
            label="Annotate batch"
            title="Cross-component review lane"
            description="Use Annotate across this card and neighboring cards to test multi-note capture. This content is intentionally neutral so you can define your own overall goal."
          >
            <ul class="checklist">
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
            <div class="status-row">
              {(['Draft', 'Ready for review', 'Needs follow-up'] as const).map(option => (
                <button
                  class={option === status() ? 'toggle-button active' : 'toggle-button'}
                  onClick={() => setStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p class="status-note">Current state: {status()}</p>
          </CaseCard>

          <CaseCard
            label="Source precision"
            title="AST mapping anchor"
            description="Use this card when you want a simple, stable target to verify the exact file, line, and column mapping in App.tsx."
          />

          <CaseCard
            label="Modal interaction"
            title="Dialog component"
            description="Use this button to open a modal and test Inspecto inside a pop-up."
          >
            <button class="primary-button" onClick={() => setIsModalOpen(true)}>
              Open dialog
            </button>
          </CaseCard>

          <CaseCard
            label="Focus contention"
            title="Inspect input focus vs. page focus guard"
            description="复现/验证：当页面自身 input/textarea 有焦点，且页面会在 blur 后立刻抢回焦点时，Inspect 菜单里的自定义指令输入框仍应可输入。"
          >
            <div style={{ display: 'grid', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  'flex-wrap': 'wrap',
                  'align-items': 'center',
                }}
              >
                <label style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                  <input
                    type="checkbox"
                    checked={focusGuardEnabled()}
                    onChange={e => setFocusGuardEnabled(e.target.checked)}
                  />
                  Enable focus guard
                </label>

                <label style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                  Strategy
                  <select
                    value={focusGuardStrategy()}
                    onChange={e => {
                      const next = e.target.value as 'timeout' | 'raf' | 'both'
                      setFocusGuardStrategy(next)
                    }}
                    disabled={!focusGuardEnabled()}
                  >
                    <option value="timeout">setTimeout(0)</option>
                    <option value="raf">requestAnimationFrame</option>
                    <option value="both">timeout + rAF</option>
                  </select>
                </label>

                <span class="style-pill">Focus guard: {focusGuardLabel()}</span>
                <span class="style-pill">
                  document.activeElement: {activeElementTag() || 'none'}
                </span>
              </div>

              <input
                ref={focusTestInputRef}
                placeholder="Focus me, then open Inspect menu and type in Inspecto input"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  'border-radius': '10px',
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(10, 10, 10, 0.35)',
                  color: 'inherit',
                  outline: 'none',
                }}
                onBlur={() => {
                  if (!focusGuardEnabled()) return
                  const el = focusTestInputRef
                  if (!el) return

                  if (focusGuardStrategy() === 'timeout' || focusGuardStrategy() === 'both') {
                    setTimeout(() => el.focus(), 0)
                  }

                  if (focusGuardStrategy() === 'raf' || focusGuardStrategy() === 'both') {
                    requestAnimationFrame(() => el.focus())
                  }
                }}
              />

              <ol
                style={{
                  margin: 0,
                  'padding-left': '18px',
                  color: 'var(--inspecto-text-secondary)',
                }}
              >
                <li>点击上面输入框，确保它有焦点（可以随便输入几个字符）。</li>
                <li>打开 Inspect 模式，点击任意卡片打开 Inspect 菜单。</li>
                <li>直接在 Inspect 菜单的自定义指令 input 里输入，应该能正常落字。</li>
              </ol>
            </div>
          </CaseCard>
        </div>
      </section>

      {isModalOpen() && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            'background-color': 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': 1000,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            role="dialog"
            style={{
              'background-color': 'var(--bg-color, white)',
              padding: '24px',
              'border-radius': '8px',
              'max-width': '400px',
              width: '100%',
              'box-shadow': '0 4px 6px rgba(0,0,0,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Modal Dialog</h3>
            <p style={{ margin: '16px 0' }}>
              This dialog has <code>role="dialog"</code>. When you click inside here, the Inspecto
              launcher should not close.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button class="primary-button" onClick={() => alert('Clicked primary')}>
                Action
              </button>
              <button class="ghost-button" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
