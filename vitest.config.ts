import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 5000, // Slightly increased for parallel execution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Enable multiple forks for parallel execution
        isolate: true,     // Enable isolation for stability
      },
    },
    // Optimize for speed with memory leak fixed
    maxConcurrency: 4,   // Allow 4 concurrent tests
    minWorkers: 2,       // Start with 2 workers
    maxWorkers: 4,       // Scale up to 4 workers based on CPU cores
    // Clear mocks between tests
    clearMocks: true,
    // Restore mocks after each test
    restoreMocks: true,
    // Monitor memory usage but allow parallel execution
    logHeapUsage: true,
    // Enable test caching for faster reruns
    cache: {
      dir: 'node_modules/.vitest'
    },
    // Optimize file watching
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**'
    ]
  },
})