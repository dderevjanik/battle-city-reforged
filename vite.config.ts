import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cattle-bity/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        editor: 'editor.html',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'dist',
  },
  plugins: [
    command === 'build' && viteStaticCopy({
      targets: [{ src: 'data', dest: '' }],
    }),
  ],
}))
