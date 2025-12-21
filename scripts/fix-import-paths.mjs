#!/usr/bin/env node

/**
 * Safe Import Path Fixer for Feature Reorganization
 * 
 * This script fixes relative import paths after moving folders to new depths.
 * Follows safety requirements: no regex on comments, incremental updates, validation.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Folders that moved +1 depth level
const MOVED_FOLDERS = [
  'src/components/features/LocationServices/LocationPicker',
  'src/components/features/UserConfiguration/Setup',
  'src/components/features/UserConfiguration/Settings',
  'src/components/features/UserConfiguration/Configuration',
  'src/components/features/StationManagement/StationDisplay',
];

// Patterns to update (non-comment imports only)
const IMPORT_PATTERNS = [
  // Match import statements (not in comments)
  /^(\s*import\s+.*from\s+['"])(\.\.\/)+(.*['"];?\s*)$/gm,
];

function getAllTsFiles(dir) {
  const files = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllTsFiles(fullPath));
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return files;
}

function fixImportPaths(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Split into lines to avoid matching comments
    const lines = content.split('\n');
    const fixedLines = lines.map(line => {
      // Skip comment lines
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
        return line;
      }
      
      // Only process import lines
      if (!line.includes('import') || !line.includes('from')) {
        return line;
      }
      
      // Add one more ../ to relative imports
      const fixedLine = line.replace(
        /(import\s+.*from\s+['"])(\.\.\/)+(.*['"])/,
        (match, prefix, dots, suffix) => {
          modified = true;
          return `${prefix}../${dots}${suffix}`;
        }
      );
      
      return fixedLine;
    });
    
    if (modified) {
      const fixedContent = fixedLines.join('\n');
      writeFileSync(filePath, fixedContent, 'utf-8');
      return true;
    }
    
    return false;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing import paths after feature reorganization...\n');
  
  let totalFixed = 0;
  
  for (const folder of MOVED_FOLDERS) {
    console.log(`📁 Processing: ${folder}`);
    
    const files = getAllTsFiles(folder);
    let folderFixed = 0;
    
    for (const file of files) {
      if (fixImportPaths(file)) {
        folderFixed++;
        console.log(`  ✓ Fixed: ${file.replace(folder, '')}`);
      }
    }
    
    totalFixed += folderFixed;
    console.log(`  ${folderFixed} files updated\n`);
  }
  
  console.log(`\n✅ Complete! Fixed ${totalFixed} files total.`);
  console.log('\n⚠️  Next step: Run "npm run build" to validate changes');
}

main();