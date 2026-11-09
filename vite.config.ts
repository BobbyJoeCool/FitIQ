/// <reference types="vitest/config" />
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// GitHub Pages serves 404.html for any unknown path. Making it a copy of
// index.html lets the client router handle a refreshed nested route.
function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'fitiq-spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

// BASE_PATH comes from actions/configure-pages in the deploy workflow:
// "/" on fitiq.bobbyjoecool.dev, "/FitIQ/" on bobbyjoecool.github.io.
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react(), spaFallback()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
  },
})
