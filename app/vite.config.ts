/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        // Test thuần (domain): không cần DOM nên chạy môi trường node cho nhanh.
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/domain/**/*.test.ts'],
        },
      },
      {
        // Mọi test còn lại (component, service, hook...) cần DOM.
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/domain/**', '**/node_modules/**', '**/dist/**'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/types/**', 'src/**/fixtures/**'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
