import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/battle-city-reforged/' : '/',
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        editor: 'editor.html',
        fonts: 'fonts.html',
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
