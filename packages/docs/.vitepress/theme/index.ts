import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import mediumZoom from 'medium-zoom'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import './custom.css'

const theme: Theme = {
  ...DefaultTheme,
  setup() {
    const route = useRoute()
    const initZoom = () => {
      // Allow zooming for images inside our custom mode cards, and any generic markdown image not wrapped in a link
      mediumZoom('.mode-card img, .main img:not(a img)', {
        background: 'var(--vp-c-bg)',
        margin: 24,
      })
    }

    onMounted(() => {
      initZoom()
    })

    watch(
      () => route.path,
      () => nextTick(() => initZoom()),
    )
  },
}

export default theme
