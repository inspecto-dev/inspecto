<template>
  <div class="card">
    <div class="badge" style="background: #e0f2fe; color: #0369a1;">Stateless</div>
    <h2>{{ name }}</h2>
    <p>This is a simple Vue component without internal state. Use the inspector to view its props and styling directly in your IDE.</p>
    <button @click="onClick">Interact</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()

const onClick = () => alert('Card clicked!')
</script>
