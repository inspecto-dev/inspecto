import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { rspackPlugin as aiDevInspector } from '@inspecto-dev/plugin'

export default defineConfig({
  plugins: [pluginReact()],

  tools: {
    rspack(config, { isProd }) {
      if (!isProd) {
        config.plugins ??= []
        config.plugins.push(
          aiDevInspector({
            pathType: 'absolute',
            escapeTags: ['Transition', 'AnimatePresence'],
          }),
        )
      }
      return config
    },
  },
})
