#!/usr/bin/env node

/**
 * Fix Import Paths Script
 * Comprehensively updates all import paths after folder restructuring
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔄 FIXING IMPORT PATHS AFTER REFACTORING');
console.log('=' .repeat(50));

/**
 * Mapping of old paths to new paths
 */
const pathMappings = {
  // Services mappings
  '../services/tranzyApiService': '../services/api/tranzyApiService',
  '../../services/tranzyApiService': '../../services/api/tranzyApiService',
  '@/services/tranzyApiService': '@/services/api/tranzyApiService',
  './tranzyApiService': './api/tranzyApiService',
  
  '../services/serviceWorkerService': '../services/api/serviceWorkerService',
  '../../services/serviceWorkerService': '../../services/api/serviceWorkerService',
  '@/services/serviceWorkerService': '@/services/api/serviceWorkerService',
  './serviceWorkerService': './api/serviceWorkerService',
  
  '../services/appVersionService': '../services/api/appVersionService',
  '../../services/appVersionService': '../../services/api/appVersionService',
  '@/services/appVersionService': '@/services/api/appVersionService',
  './appVersionService': './api/appVersionService',
  
  '../services/routeMappingService': '../services/business-logic/routeMappingService',
  '../../services/routeMappingService': '../../services/business-logic/routeMappingService',
  '@/services/routeMappingService': '@/services/business-logic/routeMappingService',
  './routeMappingService': './business-logic/routeMappingService',
  
  '../services/routePlanningService': '../services/business-logic/routePlanningService',
  '../../services/routePlanningService': '../../services/business-logic/routePlanningService',
  '@/services/routePlanningService': '@/services/business-logic/routePlanningService',
  './routePlanningService': './business-logic/routePlanningService',
  
  '../services/stationSelector': '../services/business-logic/stationSelector',
  '../../services/stationSelector': '../../services/business-logic/stationSelector',
  '@/services/stationSelector': '@/services/business-logic/stationSelector',
  './stationSelector': './business-logic/stationSelector',
  
  '../services/routeAssociationFilter': '../services/business-logic/routeAssociationFilter',
  '../../services/routeAssociationFilter': '../../services/business-logic/routeAssociationFilter',
  '@/services/routeAssociationFilter': '@/services/business-logic/routeAssociationFilter',
  './routeAssociationFilter': './business-logic/routeAssociationFilter',
  
  '../services/gpsFirstDataLoader': '../services/business-logic/gpsFirstDataLoader',
  '../../services/gpsFirstDataLoader': '../../services/business-logic/gpsFirstDataLoader',
  '@/services/gpsFirstDataLoader': '@/services/business-logic/gpsFirstDataLoader',
  './gpsFirstDataLoader': './business-logic/gpsFirstDataLoader',
  
  '../services/VehicleTransformationService': '../services/data-processing/VehicleTransformationService',
  '../../services/VehicleTransformationService': '../../services/data-processing/VehicleTransformationService',
  '@/services/VehicleTransformationService': '@/services/data-processing/VehicleTransformationService',
  './VehicleTransformationService': './data-processing/VehicleTransformationService',
  
  '../services/IntelligentVehicleFilter': '../services/data-processing/IntelligentVehicleFilter',
  '../../services/IntelligentVehicleFilter': '../../services/data-processing/IntelligentVehicleFilter',
  '@/services/IntelligentVehicleFilter': '@/services/data-processing/IntelligentVehicleFilter',
  './IntelligentVehicleFilter': './data-processing/IntelligentVehicleFilter',
  
  '../services/DataValidator': '../services/data-processing/DataValidator',
  '../../services/DataValidator': '../../services/data-processing/DataValidator',
  '@/services/DataValidator': '@/services/data-processing/DataValidator',
  './DataValidator': './data-processing/DataValidator',
  
  '../services/TransformationRetryManager': '../services/data-processing/TransformationRetryManager',
  '../../services/TransformationRetryManager': '../../services/data-processing/TransformationRetryManager',
  '@/services/TransformationRetryManager': '@/services/data-processing/TransformationRetryManager',
  './TransformationRetryManager': './data-processing/TransformationRetryManager',
  
  '../services/UtilityExtractionService': '../services/utilities/UtilityExtractionService',
  '../../services/UtilityExtractionService': '../../services/utilities/UtilityExtractionService',
  '@/services/UtilityExtractionService': '@/services/utilities/UtilityExtractionService',
  './UtilityExtractionService': './utilities/UtilityExtractionService',
  
  '../services/NamingConventionService': '../services/utilities/NamingConventionService',
  '../../services/NamingConventionService': '../../services/utilities/NamingConventionService',
  '@/services/NamingConventionService': '@/services/utilities/NamingConventionService',
  './NamingConventionService': './utilities/NamingConventionService',
  
  '../services/ImportPathUpdater': '../services/utilities/ImportPathUpdater',
  '../../services/ImportPathUpdater': '../../services/utilities/ImportPathUpdater',
  '@/services/ImportPathUpdater': '@/services/utilities/ImportPathUpdater',
  './ImportPathUpdater': './utilities/ImportPathUpdater',
  
  '../services/ImportPathResolver': '../services/utilities/ImportPathResolver',
  '../../services/ImportPathResolver': '../../services/utilities/ImportPathResolver',
  '@/services/ImportPathResolver': '@/services/utilities/ImportPathResolver',
  './ImportPathResolver': './utilities/ImportPathResolver',
  
  '../services/FileSystemOperations': '../services/utilities/FileSystemOperations',
  '../../services/FileSystemOperations': '../../services/utilities/FileSystemOperations',
  '@/services/FileSystemOperations': '@/services/utilities/FileSystemOperations',
  './FileSystemOperations': './utilities/FileSystemOperations',
  
  // Utils mappings
  '../utils/logger': '../utils/shared/logger',
  '../../utils/logger': '../../utils/shared/logger',
  '@/utils/logger': '@/utils/shared/logger',
  './logger': './shared/logger',
  
  '../utils/developerExperience': '../utils/shared/developerExperience',
  '../../utils/developerExperience': '../../utils/shared/developerExperience',
  '@/utils/developerExperience': '@/utils/shared/developerExperience',
  './developerExperience': './shared/developerExperience',
  
  '../utils/nearbyViewConstants': '../utils/shared/nearbyViewConstants',
  '../../utils/nearbyViewConstants': '../../utils/shared/nearbyViewConstants',
  '@/utils/nearbyViewConstants': '@/utils/shared/nearbyViewConstants',
  './nearbyViewConstants': './shared/nearbyViewConstants',
  
  '../utils/propValidation': '../utils/validation/propValidation',
  '../../utils/propValidation': '../../utils/validation/propValidation',
  '@/utils/propValidation': '@/utils/validation/propValidation',
  './propValidation': './validation/propValidation',
  
  '../utils/VehicleTypeGuards': '../utils/validation/VehicleTypeGuards',
  '../../utils/VehicleTypeGuards': '../../utils/validation/VehicleTypeGuards',
  '@/utils/VehicleTypeGuards': '@/utils/validation/VehicleTypeGuards',
  './VehicleTypeGuards': './validation/VehicleTypeGuards',
  
  '../utils/locationUtils': '../utils/formatting/locationUtils',
  '../../utils/locationUtils': '../../utils/formatting/locationUtils',
  '@/utils/locationUtils': '@/utils/formatting/locationUtils',
  './locationUtils': './formatting/locationUtils',
  
  '../utils/VehicleDataGenerator': '../utils/data-processing/VehicleDataGenerator',
  '../../utils/VehicleDataGenerator': '../../utils/data-processing/VehicleDataGenerator',
  '@/utils/VehicleDataGenerator': '@/utils/data-processing/VehicleDataGenerator',
  './VehicleDataGenerator': './data-processing/VehicleDataGenerator',
  
  '../utils/VehicleDataFactory': '../utils/data-processing/VehicleDataFactory',
  '../../utils/VehicleDataFactory': '../../utils/data-processing/VehicleDataFactory',
  '@/utils/VehicleDataFactory': '@/utils/data-processing/VehicleDataFactory',
  './VehicleDataFactory': './data-processing/VehicleDataFactory',
  
  '../utils/directionIntelligence': '../utils/data-processing/directionIntelligence',
  '../../utils/directionIntelligence': '../../utils/data-processing/directionIntelligence',
  '@/utils/directionIntelligence': '@/utils/data-processing/directionIntelligence',
  './directionIntelligence': './data-processing/directionIntelligence',
  
  '../utils/performance': '../utils/performance/performance',
  '../../utils/performance': '../../utils/performance/performance',
  '@/utils/performance': '@/utils/performance/performance',
  './performance': './performance/performance',
  
  '../utils/nearbyViewPerformance': '../utils/performance/nearbyViewPerformance',
  '../../utils/nearbyViewPerformance': '../../utils/performance/nearbyViewPerformance',
  '@/utils/nearbyViewPerformance': '@/utils/performance/nearbyViewPerformance',
  './nearbyViewPerformance': './performance/nearbyViewPerformance',
  
  '../utils/nearbyViewPerformanceValidator': '../utils/performance/nearbyViewPerformanceValidator',
  '../../utils/nearbyViewPerformanceValidator': '../../utils/performance/nearbyViewPerformanceValidator',
  '@/utils/nearbyViewPerformanceValidator': '@/utils/performance/nearbyViewPerformanceValidator',
  './nearbyViewPerformanceValidator': './performance/nearbyViewPerformanceValidator',
  
  '../utils/migrationPerformanceBenchmark': '../utils/performance/migrationPerformanceBenchmark',
  '../../utils/migrationPerformanceBenchmark': '../../utils/performance/migrationPerformanceBenchmark',
  '@/utils/migrationPerformanceBenchmark': '@/utils/performance/migrationPerformanceBenchmark',
  './migrationPerformanceBenchmark': './performance/migrationPerformanceBenchmark'
};

/**
 * Update import paths in a file
 */
async function updateFileImports(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // Apply all path mappings
    for (const [oldPath, newPath] of Object.entries(pathMappings)) {
      const regex = new RegExp(`(['"\`])${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"\`])`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `$1${newPath}$2`);
        modified = true;
      }
    }
    
    if (modified) {
      await fs.writeFile(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`   ⚠️  Could not update: ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 */
async function fixImportPaths() {
  try {
    console.log('🔍 Finding TypeScript files...');
    
    // Find all TypeScript/TSX files
    const files = await glob('src/**/*.{ts,tsx}', { 
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**']
    });
    
    console.log(`📊 Found ${files.length} files to process`);
    
    let updatedFiles = 0;
    let processedFiles = 0;
    
    for (const file of files) {
      const filePath = path.join(projectRoot, file);
      const wasUpdated = await updateFileImports(filePath);
      
      if (wasUpdated) {
        updatedFiles++;
        console.log(`   ✅ Updated: ${file}`);
      }
      
      processedFiles++;
      
      // Progress indicator
      if (processedFiles % 50 === 0) {
        console.log(`   📊 Progress: ${processedFiles}/${files.length} files processed`);
      }
    }
    
    console.log('\n🎉 IMPORT PATH FIXING COMPLETED!');
    console.log('=' .repeat(50));
    console.log(`✅ Processed ${processedFiles} files`);
    console.log(`✅ Updated ${updatedFiles} files`);
    console.log(`✅ Skipped ${processedFiles - updatedFiles} files (no changes needed)`);
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run build to check for remaining issues: npm run build');
    console.log('2. Run tests to ensure everything works: npm test');
    console.log('3. Review changes with: git diff');
    
    console.log('\n🎯 Import Path Fix Confidence: 9/10');
    console.log('Primary Uncertainties: Some complex relative paths may need manual adjustment');
    
  } catch (error) {
    console.error('💥 Import path fixing failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Execute the import path fixing
fixImportPaths().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});