<script lang="ts">
  export let label: string;
  export let title: string;
  export let description: string;
  export let tone: 'default' | 'runtime' | 'css' = 'default';
</script>

<article class={`panel case-card case-card--${tone}`}>
  <span class="eyebrow">{label}</span>
  <h3>{title}</h3>
  <p>{description}</p>
  <slot />
</article>
