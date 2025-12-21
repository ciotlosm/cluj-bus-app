#!/usr/bin/env node

/**
 * Fix Remaining Import Issues Script
 * Handles complex cross-references and remaining import path issues
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔄 FIXING REMAINING IMPORT ISSUES');
console.log('=' .repeat(50));

/**
 * Additional path mappings for complex cross-references
 */
const additionalMappings = {
  // Fix cross-references between services
  './api/tranzyApiService': '../api/tranzyApiService',
  './data-processing/VehicleTransformationService': '../data-processing/VehicleTransformationService',
  './data-processing/DataValidator': '../data-processing/DataValidator',
  './data-processing/IntelligentVehicleFilter': '../data-processing/IntelligentVehicleFilter',
  './data-processing/TransformationRetryManager': '../data-processing/TransformationRetryManager',
  
  // Fix utils cross-references
  './formatting/locationUtils': '../formatting/locationUtils',
  './data-processing/VehicleDataGenerator': '../data-processing/VehicleDataGenerator',
  './data-processing/VehicleDataFactory': '../data-processing/VehicleDataFactory',
  './validation/VehicleTypeGuards': '../validation/VehicleTypeGuards',
  './shared/logger': '../shared/logger',
  './performance/performance': '../performance/performance',
  './performance/nearbyViewPerformance': '../performance/nearbyViewPerformance',
  
  // Fix index file self-references
  './business-logic/gpsFirstDataLoader': './gpsFirstDataLoader',
  './business-logic/routeAssociationFilter': './routeAssociationFilter',
  './business-logic/routeMappingService': './routeMappingService',
  './business-logic/routePlanningService': './routePlanningService',
  './business-logic/stationSelector': './stationSelector',
  
  './data-processing/DataValidator': './DataValidator',
  './data-processing/IntelligentVehicleFilter': './IntelligentVehicleFilter',
  './data-processing/TransformationRetryManager': './TransformationRetryManager',
  './data-processing/VehicleTransformationService': './VehicleTransformationService',
  
  './utilities/FileSystemOperations': './FileSystemOperations',
  './utilities/ImportPathResolver': './ImportPathResolver',
  './utilities/ImportPathUpdater': './ImportPathUpdater',
  './utilities/NamingConventionService': './NamingConventionService',
  './utilities/UtilityExtractionService': './UtilityExtractionService',
  
  './validation/VehicleTypeGuards': './VehicleTypeGuards',
  './validation/propValidation': './propValidation',
  
  './formatting/locationUtils': './locationUtils',
  
  './data-processing/VehicleDataFactory': './VehicleDataFactory',
  './data-processing/VehicleDataGenerator': './VehicleDataGenerator',
  './data-processing/directionIntelligence': './directionIntelligence',
  
  './performance/migrationPerformanceBenchmark': './migrationPerformanceBenchmark',
  './performance/nearbyViewPerformance': './nearbyViewPerformance',
  './performance/nearbyViewPerformanceValidator': './nearbyViewPerformanceValidator',
  './performance/performance': './performance',
  
  './shared/developerExperience': './developerExperience',
  './shared/logger': './logger',
  './shared/nearbyViewConstants': './nearbyViewConstants'
};

/**
 * Update import paths in a file
 */
async function updateFileImports(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // Apply additional mappings
    for (const [oldPath, newPath] of Object.entries(additionalMappings)) {
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
async function fixRemainingImports() {
  try {
    console.log('🔍 Finding TypeScript files...');
    
    // Find all TypeScript/TSX files
    const files = await glob('src/**/*.{ts,tsx}', { 
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**']
    });
    
    console.log(`📊 Found ${files.length} files to process`);
    
    let updatedFiles = 0;
    
    for (const file of files) {
      const filePath = path.join(projectRoot, file);
      const wasUpdated = await updateFileImports(filePath);
      
      if (wasUpdated) {
        updatedFiles++;
        console.log(`   ✅ Updated: ${file}`);
      }
    }
    
    console.log('\n🎉 REMAINING IMPORT ISSUES FIXED!');
    console.log('=' .repeat(50));
    console.log(`✅ Updated ${updatedFiles} files`);
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run build to check for remaining issues: npm run build');
    console.log('2. If build succeeds, run tests: npm test');
    
    console.log('\n🎯 Import Fix Confidence: 9/10');
    console.log('Primary Uncertainties: Some type imports may still need manual adjustment');
    
  } catch (error) {
    console.error('💥 Import fixing failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Execute the import fixing
fixRemainingImports().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});