#!/usr/bin/env node

/**
 * Performance Testing Script for Clean Architecture Rebuild
 * 
 * Measures:
 * - TypeScript compilation time (requirement: < 10 seconds)
 * - Production bundle size (requirement: < 2MB)
 * 
 * Requirements: 7.1, 7.3
 */

import { execSync } from 'child_process';
import { statSync, readdirSync } from 'fs';
import { join } from 'path';

const COMPILATION_TIME_LIMIT = 10; // seconds
const BUNDLE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB in bytes

console.log('🚀 Clean Architecture Performance Testing');
console.log('========================================\n');

// Test 1: TypeScript Compilation Time
console.log('📊 Test 1: TypeScript Compilation Time');
console.log(`Target: < ${COMPILATION_TIME_LIMIT} seconds\n`);

const startTime = Date.now();

try {
  // Clean any previous build artifacts
  console.log('Cleaning previous build artifacts...');
  try {
    execSync('rm -rf dist', { stdio: 'pipe' });
  } catch (e) {
    // Ignore if dist doesn't exist
  }

  // Measure TypeScript compilation time
  console.log('Starting TypeScript compilation...');
  const tscStart = Date.now();
  
  execSync('npx tsc -b', { stdio: 'pipe' });
  
  const tscEnd = Date.now();
  const compilationTime = (tscEnd - tscStart) / 1000;
  
  console.log(`✅ TypeScript compilation completed in ${compilationTime.toFixed(2)} seconds`);
  
  if (compilationTime > COMPILATION_TIME_LIMIT) {
    console.log(`❌ FAILED: Compilation time ${compilationTime.toFixed(2)}s exceeds limit of ${COMPILATION_TIME_LIMIT}s`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: Compilation time within limit (${compilationTime.toFixed(2)}s < ${COMPILATION_TIME_LIMIT}s)`);
  }

} catch (error) {
  console.log('❌ FAILED: TypeScript compilation failed');
  console.error(error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Production Bundle Size
console.log('📦 Test 2: Production Bundle Size');
console.log(`Target: < ${(BUNDLE_SIZE_LIMIT / 1024 / 1024).toFixed(1)}MB\n`);

try {
  // Build production bundle
  console.log('Building production bundle...');
  const buildStart = Date.now();
  
  execSync('npx vite build', { stdio: 'pipe' });
  
  const buildEnd = Date.now();
  const buildTime = (buildEnd - buildStart) / 1000;
  
  console.log(`✅ Production build completed in ${buildTime.toFixed(2)} seconds`);
  
  // Calculate bundle size
  const distPath = 'dist';
  let totalSize = 0;
  
  function calculateDirectorySize(dirPath) {
    const items = readdirSync(dirPath);
    let size = 0;
    
    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stats = statSync(itemPath);
      
      if (stats.isDirectory()) {
        size += calculateDirectorySize(itemPath);
      } else {
        size += stats.size;
      }
    }
    
    return size;
  }
  
  totalSize = calculateDirectorySize(distPath);
  const sizeMB = totalSize / 1024 / 1024;
  
  console.log(`📊 Total bundle size: ${sizeMB.toFixed(2)}MB (${totalSize.toLocaleString()} bytes)`);
  
  // Show breakdown of main files
  console.log('\n📋 Bundle breakdown:');
  const distFiles = readdirSync(join(distPath, 'assets')).filter(f => f.endsWith('.js') || f.endsWith('.css'));
  
  for (const file of distFiles) {
    const filePath = join(distPath, 'assets', file);
    const fileSize = statSync(filePath).size;
    const fileSizeKB = fileSize / 1024;
    console.log(`   ${file}: ${fileSizeKB.toFixed(1)}KB`);
  }
  
  if (totalSize > BUNDLE_SIZE_LIMIT) {
    console.log(`\n❌ FAILED: Bundle size ${sizeMB.toFixed(2)}MB exceeds limit of ${(BUNDLE_SIZE_LIMIT / 1024 / 1024).toFixed(1)}MB`);
    process.exit(1);
  } else {
    console.log(`\n✅ PASSED: Bundle size within limit (${sizeMB.toFixed(2)}MB < ${(BUNDLE_SIZE_LIMIT / 1024 / 1024).toFixed(1)}MB)`);
  }

} catch (error) {
  console.log('❌ FAILED: Production build failed');
  console.error(error.message);
  process.exit(1);
}

const totalTime = (Date.now() - startTime) / 1000;

console.log('\n' + '='.repeat(50));
console.log('🎉 Performance Testing Results');
console.log('========================================');
console.log(`✅ TypeScript compilation: PASSED`);
console.log(`✅ Production bundle size: PASSED`);
console.log(`⏱️  Total test time: ${totalTime.toFixed(2)} seconds`);
console.log('\n🚀 Clean architecture performance requirements met!');