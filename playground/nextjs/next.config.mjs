import { webpackPlugin as aiDevInspector } from '@inspecto/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { dev }) {
    if (dev) {
      config.plugins.push(
        aiDevInspector({
          pathType: 'absolute',
          escapeTags: [
            'Suspense',
            'ErrorBoundary',
            'Script',
            'Image',
            'Link',
            'Head',
          ],
        })
      )
    }
    return config
  },
}

export default nextConfig
