<script setup lang="ts">
defineOptions({ name: 'VueUpgradeButton' })
defineProps<{
  planId: string
  onUpgrade: () => void
}>()
</script>

<template>
  <button
    id="vue-upgrade-plan"
    class="primary-button vue-upgrade-button billing-upgrade-cta"
    data-testid="vue-upgrade-plan"
    aria-label="Upgrade Vue enterprise plan"
    @click="onUpgrade"
  >
    Upgrade Vue plan
  </button>
</template>
