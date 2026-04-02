import { defineConfig } from '@rspack/cli'
import { rspackPlugin as aiDevInspector } from '@inspecto-dev/plugin/legacy/rspack'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  entry: {
    main: './src/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
        ],
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  builtins: {
    html: [
      {
        template: './index.html',
      },
    ],
  },
  plugins: [
    !isProd &&
      (aiDevInspector({
        pathType: 'absolute',
        escapeTags: ['Transition', 'AnimatePresence'],
      }) as any),
  ].filter(Boolean),
})
