import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'

export default defineConfig({
  plugins: [svelte(), inspecto({ escapeTags: [] })],
})
