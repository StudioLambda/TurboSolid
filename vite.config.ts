import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    polyfillDynamicImport: false,
    sourcemap: true,
    lib: {
      entry: 'src/turbo-solid.ts',
      name: 'TurboSolid',
      fileName: 'turbo-solid',
    },
    rollupOptions: {
      external: ['solid-js', 'turbo-query'],
      output: {
        globals: { 'solid-js': 'SolidJS', 'turbo-query': 'TurboQuery' },
      },
    },
  },
})
