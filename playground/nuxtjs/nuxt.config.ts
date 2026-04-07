// https://nuxt.com/docs/api/configuration/nuxt-config
import { vitePlugin as inspecto } from '@inspecto-dev/plugin'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  vite: {
    plugins: [inspecto()],
  },
})
