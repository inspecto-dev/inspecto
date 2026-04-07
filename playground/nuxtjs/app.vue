<template>
  <main class="demo-shell">
    <section class="hero panel">
      <div>
        <span class="hero-kicker">Nuxt + Vue playground</span>
        <h1>Inspecto verification surface</h1>
        <p class="hero-copy">
          This page validates the current browser workflow inside Nuxt: use <strong>Inspect</strong>{' '}
          for one component, <strong>Annotate</strong> for batch notes, and <strong>Alt + 点击</strong>{' '}
          for quick jump to source.
        </p>
      </div>
      <div class="hero-checklist">
        <div><strong>1.</strong> Open the launcher and pick a mode.</div>
        <div><strong>2.</strong> Inspect one target, annotate several targets, or quick-jump to source.</div>
        <div><strong>3.</strong> Use the runtime and CSS cases below to verify evidence attachment.</div>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <h2>Mode checks</h2>
        <p>These cards exist to validate the three primary entry points without relying on old click-to-inspect copy.</p>
      </div>
      <div class="mode-grid">
        <article class="panel mode-card">
          <span class="eyebrow">Mode</span>
          <h3>Inspect</h3>
          <p>Click one component and confirm that the inspect menu opens with the built-in actions.</p>
          <ol>
            <li>Choose Inspect from the launcher.</li>
            <li>Click any case card below.</li>
            <li>Check bug, CSS, and Open in Editor.</li>
          </ol>
        </article>

        <article class="panel mode-card">
          <span class="eyebrow">Mode</span>
          <h3>Annotate</h3>
          <p>Capture several notes, define an overall goal, and send a single batch to AI.</p>
          <ol>
            <li>Choose Annotate from the launcher.</li>
            <li>Click multiple cards and save notes.</li>
            <li>Use the sidebar goal field, then Ask AI once.</li>
          </ol>
        </article>

        <article class="panel mode-card">
          <span class="eyebrow">Mode</span>
          <h3>Quick jump</h3>
          <p>Confirm that Alt + Click opens the exact source location without opening the inspect menu.</p>
          <ol>
            <li>Hold Alt or Option.</li>
            <li>Click a target component.</li>
            <li>Verify file, line, and column precision.</li>
          </ol>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <h2>Verification cases</h2>
        <p>These cases intentionally cover state, runtime evidence, CSS context, and multi-note annotation.</p>
      </div>
      <div class="case-grid">
        <article class="panel case-card">
          <span class="eyebrow">Stateful inspect</span>
          <h3>Reactive state snapshot</h3>
          <p>Inspect this card to confirm Nuxt/Vue state is captured with its surrounding component logic. Current count: {{ count }}.</p>
          <button class="primary-button" @click="count += 1">Increment count</button>
        </article>

        <article class="panel case-card case-card--runtime">
          <span class="eyebrow">Runtime evidence</span>
          <h3>Intentional runtime error</h3>
          <p>Use Inspect with the bug icon enabled after clicking this button. The error should appear as runtime evidence for fix-oriented requests.</p>
          <button
            class="danger-button"
            @click="
              (() => {
                throw new Error('Inspecto Nuxt runtime test error')
              })()
            "
          >
            Trigger runtime error
          </button>
        </article>

        <article class="panel case-card case-card--css">
          <span class="eyebrow">CSS context</span>
          <h3>Visual treatment reference</h3>
          <p>Use the CSS icon on this card to verify style context. It contains gradients, spacing, labels, and button treatments.</p>
          <div class="style-specimen">
            <span class="style-pill">Priority</span>
            <div class="style-stack">
              <strong>Launch checklist</strong>
              <span>Deployment review scheduled for this afternoon</span>
            </div>
            <button class="ghost-button">Open brief</button>
          </div>
        </article>

        <article class="panel case-card">
          <span class="eyebrow">Annotate batch</span>
          <h3>Cross-component review lane</h3>
          <p>Use Annotate across this card and neighboring cards to test multi-note capture with your own overall goal.</p>
          <ul class="checklist">
            <li>Header copy could be shorter.</li>
            <li>Spacing between cards might be reduced.</li>
            <li>Action emphasis may feel too strong.</li>
          </ul>
        </article>

        <article class="panel case-card">
          <span class="eyebrow">Status controls</span>
          <h3>Review state handoff</h3>
          <p>This card gives you a second interactive surface for Inspect and Annotate across unrelated components.</p>
          <div class="status-row">
            <button
              v-for="option in states"
              :key="option"
              class="toggle-button"
              :class="{ active: status === option }"
              @click="status = option"
            >
              {{ option }}
            </button>
          </div>
          <p class="status-note">Current state: {{ status }}</p>
        </article>

        <article class="panel case-card">
          <span class="eyebrow">Source precision</span>
          <h3>Template mapping anchor</h3>
          <p>Use this stable target when you want a simple file/line/column check inside app.vue.</p>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(2)
const states = ['Draft', 'Ready for review', 'Needs follow-up'] as const
const status = ref<(typeof states)[number]>('Draft')
</script>

<style>
:root {
  --bg: #f3f5f8;
  --panel: rgba(255, 255, 255, 0.94);
  --text: #18212f;
  --muted: #5f6f85;
  --line: rgba(24, 33, 47, 0.1);
  --brand: #00a76f;
  --brand-strong: #007f54;
  --runtime: #b42318;
  --runtime-bg: #fff3f2;
  --css-bg: #f2fbf7;
  --shadow: 0 24px 70px rgba(22, 30, 45, 0.1);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'SF Pro Display', 'Segoe UI', sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at top, rgba(0, 167, 111, 0.08), transparent 30%),
    linear-gradient(180deg, #f7f8fb 0%, #eef2f7 100%);
  -webkit-font-smoothing: antialiased;
}

button {
  font: inherit;
}

.demo-shell {
  max-width: 1160px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: var(--shadow);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
  gap: 28px;
  padding: 32px;
  align-items: start;
}

.hero-kicker,
.eyebrow {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(0, 167, 111, 0.1);
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 14px 0 12px;
  font-size: clamp(2.25rem, 5vw, 3.75rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.hero-copy,
.section-heading p,
.mode-card p,
.case-card p,
.mode-card ol,
.checklist {
  color: var(--muted);
  line-height: 1.65;
}

.hero-checklist {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: #101827;
  color: rgba(255, 255, 255, 0.86);
}

.hero-checklist strong {
  color: #7be0b3;
}

.section {
  margin-top: 34px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.section-heading h2 {
  margin: 0;
  font-size: 1.6rem;
  letter-spacing: -0.03em;
}

.mode-grid,
.case-grid {
  display: grid;
  gap: 18px;
}

.mode-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.case-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mode-card,
.case-card {
  padding: 22px;
}

.mode-card h3,
.case-card h3 {
  margin: 14px 0 10px;
  font-size: 1.24rem;
  letter-spacing: -0.03em;
}

.mode-card ol,
.checklist {
  margin: 18px 0 0;
  padding-left: 18px;
}

.case-card {
  display: flex;
  flex-direction: column;
  min-height: 280px;
}

.case-card > :last-child {
  margin-top: auto;
}

.case-card--runtime {
  background: linear-gradient(180deg, #fff 0%, var(--runtime-bg) 100%);
}

.case-card--css {
  background: linear-gradient(180deg, #fff 0%, var(--css-bg) 100%);
}

.primary-button,
.danger-button,
.ghost-button,
.toggle-button {
  border: none;
  border-radius: 999px;
  padding: 11px 16px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.primary-button {
  background: var(--brand);
  color: #fff;
}

.danger-button {
  background: var(--runtime);
  color: #fff;
}

.ghost-button {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.toggle-button {
  background: rgba(24, 33, 47, 0.06);
  color: var(--text);
}

.toggle-button.active {
  background: #101827;
  color: #fff;
}

.primary-button:hover,
.danger-button:hover,
.ghost-button:hover,
.toggle-button:hover {
  transform: translateY(-1px);
}

.style-specimen {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #059669 0%, #0f766e 100%);
  color: #fff;
}

.style-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.style-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.style-stack span {
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.92rem;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.status-note {
  margin-top: 16px;
  font-weight: 600;
  color: var(--text) !important;
}

@media (max-width: 980px) {
  .hero,
  .mode-grid,
  .case-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    flex-direction: column;
    align-items: start;
  }
}
</style>
