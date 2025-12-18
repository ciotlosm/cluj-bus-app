import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 3000, // Reduced to 3s for faster failures
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork to reduce memory usage
        isolate: false,   // Reduce isolation overhead
      },
    },
    // Reduce memory usage and prevent parallel execution
    maxConcurrency: 1,
    minWorkers: 1,
    maxWorkers: 1,
    // Clear mocks between tests
    clearMocks: true,
    // Restore mocks after each test
    restoreMocks: true,
    // Reduce memory pressure
    logHeapUsage: true,
    // Faster test discovery - using Vite's cacheDir
    // Note: cache will be written to cacheDir/vitest automatically
  },
})