#!/usr/bin/env node

/**
 * Fast test runner for development
 * Skips heavy integration tests and runs with memory optimizations
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

// Default to unit tests only for fast development
const testPattern = args.length > 0 ? args.join(' ') : '--exclude="**/integration/**"';

const vitestPath = join(__dirname, '..', 'node_modules', '.bin', 'vitest');

const testProcess = spawn('node', [
  '--max-old-space-size=2048',  // Lower memory limit for development
  '--expose-gc',                // Enable garbage collection
  vitestPath,
  '--run',
  '--reporter=default',         // Use default reporter
  '--no-coverage',              // Skip coverage for speed
  testPattern
], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

testProcess.on('exit', (code) => {
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('Failed to start test process:', error);
  process.exit(1);
});