import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'

export default defineConfig({
  plugins: [inspecto({ escapeTags: [] }), solid()],
})
