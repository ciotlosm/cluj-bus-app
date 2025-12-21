#!/usr/bin/env node

/**
 * Comprehensive Import Path Fixer for Feature Reorganization
 * 
 * Fixes all import paths after moving components to new feature structure.
 * Components moved from 2 levels deep to 3 levels deep, requiring additional ../
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the mapping of old paths to new paths
const PATH_MAPPINGS = {
  // Core app imports (need +1 ../)
  '../../ui': '../../../ui',
  '../../hooks': '../../../hooks', 
  '../../stores': '../../../stores',
  '../../services': '../../../services',
  '../../utils': '../../../utils',
  '../../types': '../../../types',
  
  // Feature cross-references (same level)
  '../../VehicleTracking': '../VehicleTracking',
  '../../MapVisualization': '../MapVisualization',
  '../../LocationPicker': '../LocationServices/LocationPicker',
  '../../Configuration': '../Configuration',
  
  // Specific deep paths that need fixing
  '../../hooks/shared': '../../../hooks/shared',
  '../../hooks/controllers': '../../../hooks/controllers',
  '../../stores/configStore': '../../../stores/configStore',
  '../../stores/locationStore': '../../../stores/locationStore',
  '../../stores/shared': '../../../stores/shared',
  '../../services/api': '../../../services/api',
  '../../utils/shared': '../../../utils/shared',
  '../../utils/formatting': '../../../utils/formatting',
  '../../utils/data-processing': '../../../utils/data-processing',
  '../../utils/performance': '../../../utils/performance',
  '../../ui/base': '../../../ui/base',
  '../../ui/feedback': '../../../ui/feedback',
  
  // Type imports that moved deeper
  '../../../../types/presentationLayer': '../../../types/presentationLayer',
};

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
    let fixedContent = content;
    
    // Apply each path mapping
    for (const [oldPath, newPath] of Object.entries(PATH_MAPPINGS)) {
      const importRegex = new RegExp(
        `(import\\s+.*?from\\s+['"])${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`,
        'g'
      );
      
      const newContent = fixedContent.replace(importRegex, `$1${newPath}$2`);
      if (newContent !== fixedContent) {
        modified = true;
        fixedContent = newContent;
        console.log(`  Fixed: ${oldPath} → ${newPath}`);
      }
    }
    
    if (modified) {
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
  
  const featureFolders = [
    'src/components/features/LocationServices',
    'src/components/features/UserConfiguration', 
    'src/components/features/StationManagement',
    'src/components/features/VehicleTracking',
    'src/components/features/MapVisualization'
  ];
  
  let totalFixed = 0;
  
  for (const folder of featureFolders) {
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