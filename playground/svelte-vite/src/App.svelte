<script lang="ts">
  import ModeCard from './components/ModeCard.svelte';
  import CaseCard from './components/CaseCard.svelte';

  let count = 2;
  let status: 'Draft' | 'Ready for review' | 'Needs follow-up' = 'Draft';
  let isModalOpen = false;

  const statuses = ['Draft', 'Ready for review', 'Needs follow-up'] as const;

  function triggerError() {
    throw new Error('Inspecto Svelte Vite runtime test error');
  }
</script>

<main class="demo-shell">
  <section class="hero panel">
    <div>
      <span class="hero-kicker">Svelte + Vite playground</span>
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
        description={`Inspect this card to confirm the current state value is captured with its surrounding component logic. Current count: ${count}.`}
      >
        <button class="primary-button" on:click={() => count++}>
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
          on:click={triggerError}
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
          {#each statuses as option}
            <button
              class="toggle-button {option === status ? 'active' : ''}"
              on:click={() => status = option}
            >
              {option}
            </button>
          {/each}
        </div>
        <p class="status-note">Current state: {status}</p>
      </CaseCard>

      <CaseCard
        label="Source precision"
        title="AST mapping anchor"
        description="Use this card when you want a simple, stable target to verify the exact file, line, and column mapping in App.svelte."
      />

      <CaseCard
        label="Modal interaction"
        title="Dialog component"
        description="Use this button to open a modal and test Inspecto inside a pop-up."
      >
        <button class="primary-button" on:click={() => isModalOpen = true}>
          Open dialog
        </button>
      </CaseCard>
    </div>
  </section>

  {#if isModalOpen}
    <div
      class="modal-backdrop"
      on:click={() => isModalOpen = false}
    >
      <div
        role="dialog"
        class="modal-content"
        on:click={(e) => e.stopPropagation()}
      >
        <h3>Modal Dialog</h3>
        <p style="margin: 16px 0">
          This dialog has <code>role="dialog"</code>. When you click inside here, the Inspecto
          launcher should not close.
        </p>
        <div style="display: flex; gap: 8px">
          <button class="primary-button" on:click={() => alert('Clicked primary')}>
            Action
          </button>
          <button class="ghost-button" on:click={() => isModalOpen = false}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background-color: var(--bg-color, white);
    padding: 24px;
    border-radius: 8px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
</style>
