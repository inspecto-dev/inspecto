<script lang="ts">
  export let title: string;
  export let description: string;
  export let steps: string[];
</script>

<article class="panel mode-card">
  <span class="eyebrow">Mode</span>
  <h3>{title}</h3>
  <p>{description}</p>
  <ol>
    {#each steps as step}
      <li>{step}</li>
    {/each}
  </ol>
</article>
