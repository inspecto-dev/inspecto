<script setup lang="ts">
import VueUpgradeButton from './VueUpgradeButton.vue'

defineOptions({ name: 'VueBillingCard' })
defineProps<{ workspaceId: string }>()
</script>

<template>
  <article class="framework-card vue-card" aria-labelledby="vue-billing-heading">
    <div>
      <span class="eyebrow">Vue runtime</span>
      <h2 id="vue-billing-heading">Vue billing component</h2>
      <p>
        Click the button to validate Vue parent-component and local source evidence without enabling
        any Inspecto compile-time plugin.
      </p>
    </div>
    <VueUpgradeButton plan-id="vue-enterprise-secret-plan" :on-upgrade="() => undefined" />
  </article>
</template>
