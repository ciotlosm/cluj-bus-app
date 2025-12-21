#!/usr/bin/env node

/**
 * Complete Fix for Feature Reorganization
 * 
 * 1. Fixes all import paths based on actual folder depths
 * 2. Resolves VehicleCard export conflict
 * 3. Creates missing component files
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import path fixes based on actual folder depths
const IMPORT_FIXES = [
  // LocationServices (5 levels deep: src/components/features/LocationServices/LocationPicker/components)
  {
    pattern: /(['"])\.\.\/\.\.\/ui(['"])/g,
    replacement: '$1../../../../../ui$2',
    description: 'LocationServices 5-deep ui',
    folders: ['src/components/features/LocationServices/LocationPicker/components']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/hooks(['"])/g,
    replacement: '$1../../../../../hooks$2',
    description: 'LocationServices 5-deep hooks',
    folders: ['src/components/features/LocationServices/LocationPicker/components']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/types(['"])/g,
    replacement: '$1../../../../../types$2',
    description: 'LocationServices 5-deep types',
    folders: ['src/components/features/LocationServices/LocationPicker/components']
  },
  
  // LocationServices (4 levels deep: src/components/features/LocationServices/LocationPicker)
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/hooks(['"])/g,
    replacement: '$1../../../../hooks$2',
    description: 'LocationServices 4-deep hooks',
    folders: ['src/components/features/LocationServices/LocationPicker']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/types(['"])/g,
    replacement: '$1../../../../types$2',
    description: 'LocationServices 4-deep types',
    folders: ['src/components/features/LocationServices/LocationPicker']
  },
  
  // UserConfiguration (4 levels deep: components/hooks/utils subfolders)
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/ui(['"])/g,
    replacement: '$1../../../../ui$2',
    description: 'UserConfiguration 4-deep ui',
    folders: ['src/components/features/UserConfiguration/Settings/components', 'src/components/features/UserConfiguration/Settings/hooks', 'src/components/features/UserConfiguration/Configuration/sections']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/hooks(['"])/g,
    replacement: '$1../../../../hooks$2',
    description: 'UserConfiguration 4-deep hooks',
    folders: ['src/components/features/UserConfiguration/Settings/components', 'src/components/features/UserConfiguration/Settings/hooks', 'src/components/features/UserConfiguration/Configuration/sections']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/stores(['"])/g,
    replacement: '$1../../../../stores$2',
    description: 'UserConfiguration 4-deep stores',
    folders: ['src/components/features/UserConfiguration/Settings/components', 'src/components/features/UserConfiguration/Settings/hooks', 'src/components/features/UserConfiguration/Configuration/sections']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/types(['"])/g,
    replacement: '$1../../../../types$2',
    description: 'UserConfiguration 4-deep types',
    folders: ['src/components/features/UserConfiguration/Settings/components', 'src/components/features/UserConfiguration/Settings/hooks', 'src/components/features/UserConfiguration/Configuration/sections']
  },
  
  // UserConfiguration (3 levels deep: main folders)
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/ui(['"])/g,
    replacement: '$1../../../ui$2',
    description: 'UserConfiguration 3-deep ui',
    folders: ['src/components/features/UserConfiguration/Configuration', 'src/components/features/UserConfiguration/Settings', 'src/components/features/UserConfiguration/Setup']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/hooks(['"])/g,
    replacement: '$1../../../hooks$2',
    description: 'UserConfiguration 3-deep hooks',
    folders: ['src/components/features/UserConfiguration/Configuration', 'src/components/features/UserConfiguration/Settings', 'src/components/features/UserConfiguration/Setup']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/stores(['"])/g,
    replacement: '$1../../../stores$2',
    description: 'UserConfiguration 3-deep stores',
    folders: ['src/components/features/UserConfiguration/Configuration', 'src/components/features/UserConfiguration/Settings', 'src/components/features/UserConfiguration/Setup']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/types(['"])/g,
    replacement: '$1../../../types$2',
    description: 'UserConfiguration 3-deep types',
    folders: ['src/components/features/UserConfiguration/Configuration', 'src/components/features/UserConfiguration/Settings', 'src/components/features/UserConfiguration/Setup']
  },
  
  // StationManagement (4 levels deep: components/hooks/utils subfolders)
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/ui(['"])/g,
    replacement: '$1../../../../ui$2',
    description: 'StationManagement 4-deep ui',
    folders: ['src/components/features/StationManagement/StationDisplay/components', 'src/components/features/StationManagement/StationDisplay/hooks', 'src/components/features/StationManagement/StationDisplay/utils']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/stores(['"])/g,
    replacement: '$1../../../../stores$2',
    description: 'StationManagement 4-deep stores',
    folders: ['src/components/features/StationManagement/StationDisplay/components', 'src/components/features/StationManagement/StationDisplay/hooks', 'src/components/features/StationManagement/StationDisplay/utils']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/hooks(['"])/g,
    replacement: '$1../../../../hooks$2',
    description: 'StationManagement 4-deep hooks',
    folders: ['src/components/features/StationManagement/StationDisplay/components', 'src/components/features/StationManagement/StationDisplay/hooks', 'src/components/features/StationManagement/StationDisplay/utils']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/types(['"])/g,
    replacement: '$1../../../../types$2',
    description: 'StationManagement 4-deep types',
    folders: ['src/components/features/StationManagement/StationDisplay/components', 'src/components/features/StationManagement/StationDisplay/hooks', 'src/components/features/StationManagement/StationDisplay/utils']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/utils(['"])/g,
    replacement: '$1../../../../utils$2',
    description: 'StationManagement 4-deep utils',
    folders: ['src/components/features/StationManagement/StationDisplay/components', 'src/components/features/StationManagement/StationDisplay/hooks', 'src/components/features/StationManagement/StationDisplay/utils']
  },
  
  // StationManagement (3 levels deep: main folder)
  {
    pattern: /(['"])\.\.\/\.\.\/\.\.\/utils(['"])/g,
    replacement: '$1../../../utils$2',
    description: 'StationManagement 3-deep utils',
    folders: ['src/components/features/StationManagement/StationDisplay']
  },
  
  // Cross-feature imports (same level)
  {
    pattern: /(['"])\.\.\/VehicleTracking\/VehicleCard(['"])/g,
    replacement: '$1../VehicleTracking/VehicleCard$2',
    description: 'Cross-feature VehicleCard',
    folders: ['src/components/features/StationManagement/StationDisplay/components']
  },
  {
    pattern: /(['"])\.\.\/VehicleTracking\/RouteFilterChips(['"])/g,
    replacement: '$1../VehicleTracking/RouteFilterChips$2',
    description: 'Cross-feature RouteFilterChips',
    folders: ['src/components/features/StationManagement/StationDisplay/components']
  },
  {
    pattern: /(['"])\.\.\/MapVisualization\/BusRouteMapModal(['"])/g,
    replacement: '$1../MapVisualization/BusRouteMapModal$2',
    description: 'Cross-feature BusRouteMapModal',
    folders: ['src/components/features/StationManagement/StationDisplay/components']
  },
  {
    pattern: /(['"])\.\.\/MapVisualization\/StationMapModal(['"])/g,
    replacement: '$1../MapVisualization/StationMapModal$2',
    description: 'Cross-feature StationMapModal',
    folders: ['src/components/features/StationManagement/StationDisplay/components']
  },
  {
    pattern: /(['"])\.\.\/LocationServices\/LocationPicker\/LocationPicker(['"])/g,
    replacement: '$1../LocationServices/LocationPicker/LocationPicker$2',
    description: 'Cross-feature LocationPicker',
    folders: ['src/components/features/UserConfiguration/Configuration', 'src/components/features/UserConfiguration/Setup']
  },
  
  // Internal relative imports
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/useStationDisplayData(['"])/g,
    replacement: '$1../hooks/useStationDisplayData$2',
    description: 'Internal StationDisplay hooks',
    folders: ['src/components/features/StationManagement/StationDisplay/components']
  },
  {
    pattern: /(['"])\.\.\/\.\.\/hooks\/useStationGroupProcessing(['"])/g,
    replacement: '$1../hooks/useStationGroupProcessing$2',
    description: 'Internal StationDisplay hooks',
    folders: ['src/components/features/StationManagement/StationDisplay/components']
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
    
    // Apply fixes that match this file's folder
    for (const fix of IMPORT_FIXES) {
      const fileDir = dirname(filePath);
      const matchesFolder = fix.folders.some(folder => fileDir.includes(folder.replace('src/', '')));
      
      if (matchesFolder) {
        const newContent = fixedContent.replace(fix.pattern, fix.replacement);
        if (newContent !== fixedContent) {
          modified = true;
          fixedContent = newContent;
          console.log(`  Fixed: ${fix.description}`);
        }
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

function createMissingComponents() {
  console.log('📦 Creating missing components...\n');
  
  // Create VehicleTracking/VehicleCard/index.ts if missing
  const vehicleCardIndexPath = 'src/components/features/VehicleTracking/VehicleCard/index.ts';
  if (!existsSync(vehicleCardIndexPath)) {
    const indexContent = `// VehicleCard feature exports
export * from './VehicleCardMain';
`;
    writeFileSync(vehicleCardIndexPath, indexContent, 'utf-8');
    console.log('✓ Created VehicleCard/index.ts');
  }
  
  // Create MapVisualization components if missing
  const busRouteMapPath = 'src/components/features/MapVisualization/BusRouteMapModal.tsx';
  if (!existsSync(busRouteMapPath)) {
    const busRouteMapContent = `import React from 'react';

// Placeholder for BusRouteMapModal - to be implemented
export const BusRouteMapModal: React.FC = () => {
  return <div>BusRouteMapModal - To be implemented</div>;
};

export default BusRouteMapModal;
`;
    writeFileSync(busRouteMapPath, busRouteMapContent, 'utf-8');
    console.log('✓ Created BusRouteMapModal.tsx');
  }
  
  const stationMapPath = 'src/components/features/MapVisualization/StationMapModal.tsx';
  if (!existsSync(stationMapPath)) {
    const stationMapContent = `import React from 'react';

// Placeholder for StationMapModal - to be implemented
export const StationMapModal: React.FC = () => {
  return <div>StationMapModal - To be implemented</div>;
};

export default StationMapModal;
`;
    writeFileSync(stationMapPath, stationMapContent, 'utf-8');
    console.log('✓ Created StationMapModal.tsx');
  }
  
  // Create RouteFilterChips if missing
  const routeFilterPath = 'src/components/features/VehicleTracking/RouteFilterChips.tsx';
  if (!existsSync(routeFilterPath)) {
    const routeFilterContent = `import React from 'react';

// Placeholder for RouteFilterChips - to be implemented
export const RouteFilterChips: React.FC = () => {
  return <div>RouteFilterChips - To be implemented</div>;
};

export default RouteFilterChips;
`;
    writeFileSync(routeFilterPath, routeFilterContent, 'utf-8');
    console.log('✓ Created RouteFilterChips.tsx');
  }
}

function fixExportConflict() {
  console.log('🔧 Fixing VehicleCard export conflict...\n');
  
  // Rename UI VehicleCard to avoid conflict
  const uiVehicleCardPath = 'src/components/ui/base/Card/VehicleCard.tsx';
  const uiCardPath = 'src/components/ui/base/Card/Card.tsx';
  
  if (existsSync(uiVehicleCardPath) && existsSync(uiCardPath)) {
    // Read the UI VehicleCard
    const uiVehicleCardContent = readFileSync(uiVehicleCardPath, 'utf-8');
    
    // Rename it to SimpleVehicleCard
    const renamedContent = uiVehicleCardContent
      .replace(/export interface VehicleCardProps/g, 'export interface SimpleVehicleCardProps')
      .replace(/export const VehicleCard:/g, 'export const SimpleVehicleCard:')
      .replace(/export default VehicleCard/g, 'export default SimpleVehicleCard');
    
    writeFileSync(uiVehicleCardPath, renamedContent, 'utf-8');
    
    // Update Card.tsx exports
    const cardContent = readFileSync(uiCardPath, 'utf-8');
    const updatedCardContent = cardContent
      .replace(/export { VehicleCard, type VehicleCardProps } from '\.\/VehicleCard';/g, 
               'export { SimpleVehicleCard, type SimpleVehicleCardProps } from \'./VehicleCard\';');
    
    writeFileSync(uiCardPath, updatedCardContent, 'utf-8');
    
    console.log('✓ Renamed UI VehicleCard to SimpleVehicleCard');
  }
}

function main() {
  console.log('🔧 Complete fix for feature reorganization...\n');
  
  // Step 1: Create missing components
  createMissingComponents();
  
  // Step 2: Fix export conflict
  fixExportConflict();
  
  // Step 3: Fix import paths
  const featureFolders = [
    'src/components/features/LocationServices',
    'src/components/features/UserConfiguration', 
    'src/components/features/StationManagement',
    'src/components/features/VehicleTracking',
    'src/components/features/MapVisualization'
  ];
  
  let totalFixed = 0;
  
  for (const folder of featureFolders) {
    console.log(`\n📁 Processing: ${folder}`);
    
    const files = getAllTsFiles(folder);
    let folderFixed = 0;
    
    for (const file of files) {
      if (fixImportPaths(file)) {
        folderFixed++;
        console.log(`  ✓ Updated: ${file.replace(folder, '')}`);
      }
    }
    
    totalFixed += folderFixed;
    console.log(`  ${folderFixed} files updated`);
  }
  
  console.log(`\n✅ Complete! Fixed ${totalFixed} files total.`);
  console.log('\n⚠️  Next step: Run "npm run build" to validate changes');
}

main();