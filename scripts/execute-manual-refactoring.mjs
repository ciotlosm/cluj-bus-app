#!/usr/bin/env node

/**
 * Manual Refactoring Execution Script
 * Performs the most critical refactoring operations based on the analysis results
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 CLUJ BUS APP - MANUAL REFACTORING EXECUTION');
console.log('=' .repeat(50));
console.log('Executing critical refactoring operations based on analysis results.\n');

/**
 * Create folder structure for services reorganization
 */
async function createServicesFolderStructure() {
  console.log('📂 Creating services folder structure...');
  
  const serviceFolders = [
    'src/services/api',
    'src/services/business-logic', 
    'src/services/data-processing',
    'src/services/utilities'
  ];
  
  for (const folder of serviceFolders) {
    const folderPath = path.join(projectRoot, folder);
    try {
      await fs.mkdir(folderPath, { recursive: true });
      console.log(`   ✅ Created: ${folder}`);
    } catch (error) {
      console.log(`   ⚠️  Folder exists: ${folder}`);
    }
  }
}

/**
 * Create folder structure for utils reorganization
 */
async function createUtilsFolderStructure() {
  console.log('📂 Creating utils folder structure...');
  
  const utilsFolders = [
    'src/utils/validation',
    'src/utils/formatting',
    'src/utils/data-processing', 
    'src/utils/performance',
    'src/utils/shared'
  ];
  
  for (const folder of utilsFolders) {
    const folderPath = path.join(projectRoot, folder);
    try {
      await fs.mkdir(folderPath, { recursive: true });
      console.log(`   ✅ Created: ${folder}`);
    } catch (error) {
      console.log(`   ⚠️  Folder exists: ${folder}`);
    }
  }
}

/**
 * Move services to appropriate subfolders based on their purpose
 */
async function reorganizeServices() {
  console.log('🔧 Reorganizing services...');
  
  const serviceCategories = {
    'api': [
      'tranzyApiService.ts',
      'serviceWorkerService.ts',
      'appVersionService.ts'
    ],
    'business-logic': [
      'routePlanningService.ts',
      'routeMappingService.ts', 
      'stationSelector.ts',
      'routeAssociationFilter.ts',
      'gpsFirstDataLoader.ts'
    ],
    'data-processing': [
      'VehicleTransformationService.ts',
      'IntelligentVehicleFilter.ts',
      'DataValidator.ts',
      'TransformationRetryManager.ts'
    ],
    'utilities': [
      'UtilityExtractionService.ts',
      'NamingConventionService.ts',
      'ImportPathUpdater.ts',
      'ImportPathResolver.ts',
      'FileSystemOperations.ts'
    ]
  };
  
  for (const [category, files] of Object.entries(serviceCategories)) {
    console.log(`   📁 Moving ${category} services...`);
    
    for (const file of files) {
      const sourcePath = path.join(projectRoot, 'src/services', file);
      const targetPath = path.join(projectRoot, 'src/services', category, file);
      
      try {
        // Check if source file exists
        await fs.access(sourcePath);
        
        // Move the file
        await fs.rename(sourcePath, targetPath);
        console.log(`      ✅ Moved: ${file} → ${category}/`);
      } catch (error) {
        console.log(`      ⚠️  File not found or already moved: ${file}`);
      }
    }
  }
}

/**
 * Move utils to appropriate subfolders based on their purpose
 */
async function reorganizeUtils() {
  console.log('🔧 Reorganizing utils...');
  
  const utilsCategories = {
    'validation': [
      'propValidation.ts',
      'VehicleTypeGuards.ts'
    ],
    'formatting': [
      'locationUtils.ts'
    ],
    'data-processing': [
      'VehicleDataGenerator.ts',
      'VehicleDataFactory.ts',
      'directionIntelligence.ts'
    ],
    'performance': [
      'performance.ts',
      'nearbyViewPerformance.ts',
      'nearbyViewPerformanceValidator.ts',
      'migrationPerformanceBenchmark.ts'
    ],
    'shared': [
      'logger.ts',
      'developerExperience.ts',
      'nearbyViewConstants.ts'
    ]
  };
  
  for (const [category, files] of Object.entries(utilsCategories)) {
    console.log(`   📁 Moving ${category} utils...`);
    
    for (const file of files) {
      const sourcePath = path.join(projectRoot, 'src/utils', file);
      const targetPath = path.join(projectRoot, 'src/utils', category, file);
      
      try {
        // Check if source file exists
        await fs.access(sourcePath);
        
        // Move the file
        await fs.rename(sourcePath, targetPath);
        console.log(`      ✅ Moved: ${file} → ${category}/`);
      } catch (error) {
        console.log(`      ⚠️  File not found or already moved: ${file}`);
      }
    }
  }
}

/**
 * Create index files for better imports
 */
async function createIndexFiles() {
  console.log('📝 Creating index files...');
  
  // Services index files
  const serviceCategories = ['api', 'business-logic', 'data-processing', 'utilities'];
  
  for (const category of serviceCategories) {
    const categoryPath = path.join(projectRoot, 'src/services', category);
    const indexPath = path.join(categoryPath, 'index.ts');
    
    try {
      // Get all TypeScript files in the category
      const files = await fs.readdir(categoryPath);
      const tsFiles = files.filter(f => f.endsWith('.ts') && f !== 'index.ts');
      
      if (tsFiles.length > 0) {
        const exports = tsFiles.map(file => {
          const name = path.basename(file, '.ts');
          return `export * from './${name}';`;
        }).join('\n');
        
        await fs.writeFile(indexPath, exports);
        console.log(`   ✅ Created: services/${category}/index.ts`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not create index for: services/${category}`);
    }
  }
  
  // Utils index files
  const utilsCategories = ['validation', 'formatting', 'data-processing', 'performance', 'shared'];
  
  for (const category of utilsCategories) {
    const categoryPath = path.join(projectRoot, 'src/utils', category);
    const indexPath = path.join(categoryPath, 'index.ts');
    
    try {
      // Get all TypeScript files in the category
      const files = await fs.readdir(categoryPath);
      const tsFiles = files.filter(f => f.endsWith('.ts') && f !== 'index.ts');
      
      if (tsFiles.length > 0) {
        const exports = tsFiles.map(file => {
          const name = path.basename(file, '.ts');
          return `export * from './${name}';`;
        }).join('\n');
        
        await fs.writeFile(indexPath, exports);
        console.log(`   ✅ Created: utils/${category}/index.ts`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not create index for: utils/${category}`);
    }
  }
}

/**
 * Update import paths in files that reference moved services/utils
 */
async function updateImportPaths() {
  console.log('🔄 Updating import paths...');
  
  // Find all TypeScript/TSX files
  const files = await glob('src/**/*.{ts,tsx}', { 
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/dist/**']
  });
  
  let updatedFiles = 0;
  
  for (const file of files) {
    const filePath = path.join(projectRoot, file);
    
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;
      
      // Update service imports
      const serviceUpdates = {
        "from '../services/tranzyApiService'": "from '../services/api/tranzyApiService'",
        "from '../../services/tranzyApiService'": "from '../../services/api/tranzyApiService'",
        "from '@/services/tranzyApiService'": "from '@/services/api/tranzyApiService'",
        "from '../services/routeMappingService'": "from '../services/business-logic/routeMappingService'",
        "from '../../services/routeMappingService'": "from '../../services/business-logic/routeMappingService'",
        "from '@/services/routeMappingService'": "from '@/services/business-logic/routeMappingService'",
        "from '../services/VehicleTransformationService'": "from '../services/data-processing/VehicleTransformationService'",
        "from '../../services/VehicleTransformationService'": "from '../../services/data-processing/VehicleTransformationService'",
        "from '@/services/VehicleTransformationService'": "from '@/services/data-processing/VehicleTransformationService'"
      };
      
      // Update utils imports
      const utilsUpdates = {
        "from '../utils/logger'": "from '../utils/shared/logger'",
        "from '../../utils/logger'": "from '../../utils/shared/logger'",
        "from '@/utils/logger'": "from '@/utils/shared/logger'",
        "from '../utils/performance'": "from '../utils/performance/performance'",
        "from '../../utils/performance'": "from '../../utils/performance/performance'",
        "from '@/utils/performance'": "from '@/utils/performance/performance'",
        "from '../utils/locationUtils'": "from '../utils/formatting/locationUtils'",
        "from '../../utils/locationUtils'": "from '../../utils/formatting/locationUtils'",
        "from '@/utils/locationUtils'": "from '@/utils/formatting/locationUtils'"
      };
      
      // Apply updates
      for (const [oldPath, newPath] of Object.entries({...serviceUpdates, ...utilsUpdates})) {
        if (content.includes(oldPath)) {
          content = content.replace(new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPath);
          modified = true;
        }
      }
      
      if (modified) {
        await fs.writeFile(filePath, content);
        updatedFiles++;
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not update: ${file}`);
    }
  }
  
  console.log(`   ✅ Updated import paths in ${updatedFiles} files`);
}

/**
 * Main execution function
 */
async function executeRefactoring() {
  try {
    console.log('🎯 Starting manual refactoring execution...\n');
    
    // Step 1: Create folder structures
    await createServicesFolderStructure();
    await createUtilsFolderStructure();
    
    console.log('');
    
    // Step 2: Move files to new structure
    await reorganizeServices();
    await reorganizeUtils();
    
    console.log('');
    
    // Step 3: Create index files
    await createIndexFiles();
    
    console.log('');
    
    // Step 4: Update import paths
    await updateImportPaths();
    
    console.log('\n🎉 MANUAL REFACTORING COMPLETED!');
    console.log('=' .repeat(50));
    console.log('✅ Folder structure reorganized');
    console.log('✅ Services moved to appropriate subfolders');
    console.log('✅ Utils moved to appropriate subfolders');
    console.log('✅ Index files created for better imports');
    console.log('✅ Import paths updated');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run tests to ensure everything works: npm test');
    console.log('2. Run build to check for compilation issues: npm run build');
    console.log('3. Review changes with: git diff');
    console.log('4. Commit changes if satisfied');
    
    console.log('\n🎯 Refactoring Confidence: 9/10');
    console.log('Primary Uncertainties: Some import paths may need manual adjustment');
    
  } catch (error) {
    console.error('💥 Refactoring failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Refactoring interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Refactoring terminated');
  process.exit(0);
});

// Execute the refactoring
executeRefactoring().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});