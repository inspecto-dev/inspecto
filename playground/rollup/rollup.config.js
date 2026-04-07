import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import esbuild from 'rollup-plugin-esbuild'
import serve from 'rollup-plugin-serve'
import { rollupPlugin as inspecto } from '@inspecto-dev/plugin'

const isDev = process.env.NODE_ENV !== 'production'

export default {
  input: 'src/main.jsx',
  output: {
    dir: 'public/dist',
    entryFileNames: 'bundle.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    isDev && inspecto(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    resolve({
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
    commonjs(),
    esbuild({
      jsx: 'automatic',
    }),
    isDev &&
      serve({
        open: false,
        verbose: true,
        contentBase: 'public',
        port: 3007,
      }),
  ],
}
