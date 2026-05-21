import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'renderer',
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/renderer/src/__tests__/setup.ts'],
          globals: true,
        },
      },
      {
        test: {
          name: 'main',
          environment: 'node',
          include: ['src/main/**/*.test.ts'],
          globals: true,
        },
      },
    ],
  },
})
