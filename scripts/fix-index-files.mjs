#!/usr/bin/env node

/**
 * Fix Index Files Script
 * Fixes the index files that have incorrect self-references
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔧 FIXING INDEX FILES');
console.log('=' .repeat(50));

/**
 * Fix index files with correct relative paths
 */
async function fixIndexFiles() {
  const indexFiles = [
    // Services index files
    { path: 'src/services/api/index.ts', files: ['tranzyApiService', 'serviceWorkerService', 'appVersionService'] },
    { path: 'src/services/business-logic/index.ts', files: ['gpsFirstDataLoader', 'routeAssociationFilter', 'routeMappingService', 'routePlanningService', 'stationSelector'] },
    { path: 'src/services/data-processing/index.ts', files: ['DataValidator', 'IntelligentVehicleFilter', 'TransformationRetryManager', 'VehicleTransformationService'] },
    { path: 'src/services/utilities/index.ts', files: ['FileSystemOperations', 'ImportPathResolver', 'ImportPathUpdater', 'NamingConventionService', 'UtilityExtractionService'] },
    
    // Utils index files
    { path: 'src/utils/validation/index.ts', files: ['VehicleTypeGuards', 'propValidation'] },
    { path: 'src/utils/formatting/index.ts', files: ['locationUtils'] },
    { path: 'src/utils/data-processing/index.ts', files: ['VehicleDataFactory', 'VehicleDataGenerator', 'directionIntelligence'] },
    { path: 'src/utils/performance/index.ts', files: ['migrationPerformanceBenchmark', 'nearbyViewPerformance', 'nearbyViewPerformanceValidator', 'performance'] },
    { path: 'src/utils/shared/index.ts', files: ['developerExperience', 'logger', 'nearbyViewConstants'] }
  ];
  
  for (const indexFile of indexFiles) {
    const indexPath = path.join(projectRoot, indexFile.path);
    
    try {
      // Check which files actually exist
      const existingFiles = [];
      const folderPath = path.dirname(indexPath);
      
      for (const file of indexFile.files) {
        const filePath = path.join(folderPath, `${file}.ts`);
        try {
          await fs.access(filePath);
          existingFiles.push(file);
        } catch (error) {
          console.log(`   ⚠️  File not found: ${file}.ts in ${indexFile.path}`);
        }
      }
      
      if (existingFiles.length > 0) {
        const exports = existingFiles.map(file => `export * from './${file}';`).join('\n');
        await fs.writeFile(indexPath, exports);
        console.log(`   ✅ Fixed: ${indexFile.path} (${existingFiles.length} exports)`);
      } else {
        console.log(`   ⚠️  No files found for: ${indexFile.path}`);
      }
    } catch (error) {
      console.log(`   ❌ Error fixing: ${indexFile.path} - ${error.message}`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await fixIndexFiles();
    
    console.log('\n🎉 INDEX FILES FIXED!');
    console.log('✅ All index files now have correct relative paths');
    
  } catch (error) {
    console.error('💥 Index file fixing failed:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});