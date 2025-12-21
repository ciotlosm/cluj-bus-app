#!/usr/bin/env node

/**
 * Complete Import Path Fixer for Feature Reorganization
 * 
 * Fixes ALL import paths after moving components to new feature structure.
 * Handles all depth levels and cross-references.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Complete mapping of all import path fixes needed
const IMPORT_FIXES = [
  // LocationServices (4 levels deep) - needs ../../../../ for root imports
  {
    pattern: /(['"])\.\.\/\.\.\/utils\/formatting\/locationUtils(['"])/g,
    replacement: '$1../../../../utils/formatting/locationUtils$2',
    description: 'LocationServices utils/formatting'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/utils\/shared\/logger(['"])/g,
    replacement: '$1../../../../utils/shared/logger$2',
    description: 'LocationServices utils/shared'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/shared\/useLocationPicker(['"])/g,
    replacement: '$1../../../../hooks/shared/useLocationPicker$2',
    description: 'LocationServices hooks/shared'
  },
  
  // UserConfiguration (3 levels deep) - needs ../../../ for root imports
  {
    pattern: /(['"])\.\.\/\.\.\/LocationPicker\/LocationPicker(['"])/g,
    replacement: '$1../LocationServices/LocationPicker/LocationPicker$2',
    description: 'UserConfiguration -> LocationServices'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/shared\/useConfigurationManager(['"])/g,
    replacement: '$1../../../../hooks/shared/useConfigurationManager$2',
    description: 'UserConfiguration hooks/shared'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/services\/api\/tranzyApiService(['"])/g,
    replacement: '$1../../../../services/api/tranzyApiService$2',
    description: 'UserConfiguration services/api'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/utils\/shared\/logger(['"])/g,
    replacement: '$1../../../../utils/shared/logger$2',
    description: 'UserConfiguration utils/shared'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/utils\/formatting\/routeUtils(['"])/g,
    replacement: '$1../../../../utils/formatting/routeUtils$2',
    description: 'UserConfiguration utils/formatting'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/utils\/cacheFormatters(['"])/g,
    replacement: '$1../../../../utils/cacheFormatters$2',
    description: 'UserConfiguration utils cache'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/shared\/useUnifiedCacheManager(['"])/g,
    replacement: '$1../../../../hooks/shared/useUnifiedCacheManager$2',
    description: 'UserConfiguration hooks/shared cache'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/stores\/shared\/errorHandler(['"])/g,
    replacement: '$1../../../../stores/shared/errorHandler$2',
    description: 'UserConfiguration stores/shared'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/ui\/base\/Icons(['"])/g,
    replacement: '$1../../../../ui/base/Icons$2',
    description: 'UserConfiguration ui/base'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/ui\/feedback\/Loading(['"])/g,
    replacement: '$1../../../../ui/feedback/Loading$2',
    description: 'UserConfiguration ui/feedback'
  },
  
  // StationManagement (3 levels deep) - cross-feature and root imports
  {
    pattern: /(['"])\.\.\/\.\.\/VehicleTracking\/VehicleCard(['"])/g,
    replacement: '$1../VehicleTracking/VehicleCard$2',
    description: 'StationManagement -> VehicleTracking'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/VehicleTracking\/RouteFilterChips(['"])/g,
    replacement: '$1../VehicleTracking/RouteFilterChips$2',
    description: 'StationManagement -> VehicleTracking chips'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/MapVisualization\/BusRouteMapModal(['"])/g,
    replacement: '$1../MapVisualization/BusRouteMapModal$2',
    description: 'StationManagement -> MapVisualization bus'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/MapVisualization\/StationMapModal(['"])/g,
    replacement: '$1../MapVisualization/StationMapModal$2',
    description: 'StationManagement -> MapVisualization station'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/useStationDisplayData(['"])/g,
    replacement: '$1./hooks/useStationDisplayData$2',
    description: 'StationManagement internal hooks'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/useStationGroupProcessing(['"])/g,
    replacement: '$1./hooks/useStationGroupProcessing$2',
    description: 'StationManagement internal hooks group'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/controllers\/useVehicleDisplay(['"])/g,
    replacement: '$1../../../../hooks/controllers/useVehicleDisplay$2',
    description: 'StationManagement hooks/controllers'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/utils\/shared\/logger(['"])/g,
    replacement: '$1../../../../utils/shared/logger$2',
    description: 'StationManagement utils/shared'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/utils\/data-processing\/distanceUtils(['"])/g,
    replacement: '$1../../../../utils/data-processing/distanceUtils$2',
    description: 'StationManagement utils/data-processing'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/types\/presentationLayer(['"])/g,
    replacement: '$1../../../../types/presentationLayer$2',
    description: 'StationManagement types presentation'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/types\/coreVehicle(['"])/g,
    replacement: '$1../../../../types/coreVehicle$2',
    description: 'StationManagement types core'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/types\/mapModal(['"])/g,
    replacement: '$1../../../../types/mapModal$2',
    description: 'StationManagement types map'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/shared\/errors\/types(['"])/g,
    replacement: '$1../../../../hooks/shared/errors/types$2',
    description: 'StationManagement hooks/shared/errors'
  },
  {
    pattern: /(['"])\.\.\/\.\.\/ui\/base\/Icons\/Icons(['"])/g,
    replacement: '$1../../../../ui/base/Icons/Icons$2',
    description: 'StationManagement ui/base/Icons'
  },
  
  // Fix the deep type import that's already correct but showing as error
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/\.\.\/types\/presentationLayer(['"])/g,
    replacement: '$1../../../../types/presentationLayer$2',
    description: 'Fix deep type import'
  }
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
    let fixedContent = content;
    
    // Apply each import fix
    for (const fix of IMPORT_FIXES) {
      const newContent = fixedContent.replace(fix.pattern, fix.replacement);
      if (newContent !== fixedContent) {
        modified = true;
        fixedContent = newContent;
        console.log(`  Fixed: ${fix.description}`);
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
  console.log('🔧 Fixing ALL import paths after feature reorganization...\n');
  
  const featureFolders = [
    'src/components/features/LocationServices',
    'src/components/features/UserConfiguration', 
    'src/components/features/StationManagement'
  ];
  
  let totalFixed = 0;
  
  for (const folder of featureFolders) {
    console.log(`📁 Processing: ${folder}`);
    
    const files = getAllTsFiles(folder);
    let folderFixed = 0;
    
    for (const file of files) {
      console.log(`  Checking: ${file.replace(folder, '')}`);
      if (fixImportPaths(file)) {
        folderFixed++;
        console.log(`  ✓ Updated: ${file.replace(folder, '')}`);
      }
    }
    
    totalFixed += folderFixed;
    console.log(`  ${folderFixed} files updated\n`);
  }
  
  console.log(`\n✅ Complete! Fixed ${totalFixed} files total.`);
  console.log('\n⚠️  Next step: Run "npm run build" to validate changes');
}

main();