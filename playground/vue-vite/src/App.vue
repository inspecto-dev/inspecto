<template>
  <main class="demo-shell">
    <section class="hero panel">
      <div>
        <span class="hero-kicker">Vue 3 + Vite playground</span>
        <h1>Inspecto verification surface</h1>
        <p class="hero-copy">
          This page mirrors the real browser workflow: use <strong>Inspect</strong> for a single
          component, <strong>Annotate</strong> for batch notes, and <strong>Alt + 点击</strong> for
          quick jump to source.
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
        <p>These cards exist to validate the three primary entry points without extra ambiguity.</p>
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
          <p>Inspect this card to confirm Vue state and surrounding component logic are captured together. Current count: {{ count }}.</p>
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
                throw new Error('Inspecto Vue Vite runtime test error')
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
              <strong>Contract approval</strong>
              <span>Legal review scheduled for tomorrow</span>
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
          <p>Use this stable target when you want a simple file/line/column check inside App.vue.</p>
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
