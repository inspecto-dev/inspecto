<template>
  <div class="vue-app">
    <h1>{{ title }}</h1>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Vue App')
const count = ref(0)
</script>
