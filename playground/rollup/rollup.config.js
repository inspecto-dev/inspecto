import { rollupPlugin as inspecto } from '@inspecto/plugin'
import resolve from '@rollup/plugin-node-resolve'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const isDev = process.env.ROLLUP_WATCH === 'true'

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    inspecto(),
    isDev &&
      serve({
        open: false,
        contentBase: ['public', 'dist'],
        port: 3005,
      }),
    isDev && livereload({ watch: 'dist' }),
  ],
}
