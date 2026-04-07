import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vitePlugin as aiDevInspector } from '@inspecto-dev/plugin'

export default defineConfig({
  plugins: [
    aiDevInspector({
      pathType: 'absolute',
      escapeTags: ['Transition', 'AnimatePresence'],
    }),
    react(),
  ],
})
