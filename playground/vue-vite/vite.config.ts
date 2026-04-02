import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vitePlugin as aiDevInspector } from '@inspecto-dev/plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // @ts-expect-error type mismatch with unplugin's vite version
    aiDevInspector({
      pathType: 'absolute',
      escapeTags: ['RouterView', 'RouterLink', 'Transition', 'TransitionGroup'],
    }),
  ],
})
