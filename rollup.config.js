import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'

export default {
  input: 'index.js',
  output: [
    {
      file: 'dist/botium-connector-fbpagereceiver-es.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/botium-connector-fbpagereceiver-cjs.js',
      format: 'cjs',
      sourcemap: true
    }
  ],
  plugins: [
    commonjs({
      exclude: 'node_modules/**'
    }),
    babel({
      exclude: 'node_modules/**',
      runtimeHelpers: true
    }),
    json()
  ]
}
