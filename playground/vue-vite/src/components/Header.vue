<template>
  <h1>{{ title }}</h1>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>
