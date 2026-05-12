<template>
  <section class="copy-prompt">
    <div class="copy-prompt__header">
      <div>
        <p class="copy-prompt__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
        <p v-if="description" class="copy-prompt__description">{{ description }}</p>
      </div>
      <button type="button" class="copy-prompt__button" @click="copyPrompt">
        {{ copied ? copiedLabel : copyLabel }}
      </button>
    </div>
    <pre><code>{{ prompt }}</code></pre>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description?: string
    prompt: string
    copyLabel?: string
    copiedLabel?: string
  }>(),
  {
    eyebrow: 'Agent prompt',
    copyLabel: 'Copy prompt',
    copiedLabel: 'Copied',
  },
)

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copyPrompt() {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(props.prompt)
  } else if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.value = props.prompt
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  copied.value = true
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    copied.value = false
  }, 1800)
}
</script>

<style scoped>
.copy-prompt {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}

.copy-prompt__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 12px;
}

.copy-prompt__eyebrow {
  margin: 0 0 4px;
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.copy-prompt h3 {
  margin: 0;
}

.copy-prompt__description {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.copy-prompt__button {
  flex: 0 0 auto;
  align-self: flex-start;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 999px;
  padding: 7px 12px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.copy-prompt pre {
  margin: 0;
  padding: 16px 18px;
  border-radius: 0;
  background: var(--vp-code-block-bg);
  white-space: pre-wrap;
}

.copy-prompt code {
  white-space: pre-wrap;
}

@media (max-width: 640px) {
  .copy-prompt__header {
    flex-direction: column;
  }
}
</style>
