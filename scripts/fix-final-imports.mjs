#!/usr/bin/env node

/**
 * Final Import Path Fix - Direct Approach
 * 
 * Manually fixes each import path based on exact file location
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Direct path mappings for each problematic file
const FILE_FIXES = {
  // LocationServices - 5 levels deep (components folder)
  'src/components/features/LocationServices/LocationPicker/components/CurrentLocationSection.tsx': {
    '../../../ui': '../../../../../ui'
  },
  'src/components/features/LocationServices/LocationPicker/components/LocationPickerMap.tsx': {
    '../../../../utils/formatting/locationUtils': '../../../../../utils/formatting/locationUtils',
    '../../../../utils/shared/logger': '../../../../../utils/shared/logger'
  },
  'src/components/features/LocationServices/LocationPicker/components/PopularLocations.tsx': {
    '../../../../utils/formatting/locationUtils': '../../../../../utils/formatting/locationUtils'
  },
  'src/components/features/LocationServices/LocationPicker/components/SelectedLocationDisplay.tsx': {
    '../../../../utils/formatting/locationUtils': '../../../../../utils/formatting/locationUtils',
    '../../../../utils/shared/logger': '../../../../../utils/shared/logger'
  },
  
  // UserConfiguration - 4 levels deep (sections/components/hooks folders)
  'src/components/features/UserConfiguration/Configuration/sections/ApiKeySection.tsx': {
    '../../../ui': '../../../../ui'
  },
  'src/components/features/UserConfiguration/Configuration/sections/LocationSettingsSection.tsx': {
    '../../../ui': '../../../../ui',
    '../../../stores/locationStore': '../../../../stores/locationStore'
  },
  'src/components/features/UserConfiguration/Settings/components/ApiKeyValidator.tsx': {
    '../../../../services/api/tranzyApiService': '../../../../../services/api/tranzyApiService',
    '../../../../utils/shared/logger': '../../../../../utils/shared/logger'
  },
  'src/components/features/UserConfiguration/Settings/components/CacheStatusCards.tsx': {
    '../../../../utils/cacheFormatters': '../../../../../utils/cacheFormatters'
  },
  'src/components/features/UserConfiguration/Settings/components/RouteListItem.tsx': {
    '../../../../utils/formatting/routeUtils': '../../../../../utils/formatting/routeUtils',
    '../../../../hooks': '../../../../../hooks',
    '../../../../utils/shared/logger': '../../../../../utils/shared/logger'
  },
  'src/components/features/UserConfiguration/Settings/components/RouteTypeFilters.tsx': {
    '../../../../utils/formatting/routeUtils': '../../../../../utils/formatting/routeUtils',
    '../../../../hooks': '../../../../../hooks'
  },
  'src/components/features/UserConfiguration/Settings/hooks/useCacheOperations.ts': {
    '../../../../hooks/shared/useUnifiedCacheManager': '../../../../../hooks/shared/useUnifiedCacheManager',
    '../../../../stores/shared/errorHandler': '../../../../../stores/shared/errorHandler',
    '../../../../utils/shared/logger': '../../../../../utils/shared/logger'
  },
  'src/components/features/UserConfiguration/Settings/hooks/useSettingsOperations.ts': {
    '../../../../utils/shared/logger': '../../../../../utils/shared/logger'
  },
  'src/components/features/UserConfiguration/Settings/SettingsRoute.tsx': {
    '../../../../ui/feedback/Loading': '../../../../../ui/feedback/Loading'
  },
  'src/components/features/UserConfiguration/Setup/ApiKeyOnlySetup.tsx': {
    '../../../../ui/base/Icons': '../../../../../ui/base/Icons'
  },
  
  // UserConfiguration - 3 levels deep (main folders)
  'src/components/features/UserConfiguration/Configuration/ConfigurationManager.tsx': {
    '../LocationServices/LocationPicker/LocationPicker': '../../LocationServices/LocationPicker/LocationPicker'
  },
  'src/components/features/UserConfiguration/Setup/LocationSetup.tsx': {
    '../LocationServices/LocationPicker/LocationPicker': '../../LocationServices/LocationPicker/LocationPicker'
  },
  
  // StationManagement - 4 levels deep
  'src/components/features/StationManagement/StationDisplay/components/StationDisplayMain.tsx': {
    '../../../stores/configStore': '../../../../stores/configStore',
    '../VehicleTracking/VehicleCard': '../../VehicleTracking/VehicleCard',
    '../VehicleTracking/RouteFilterChips': '../../VehicleTracking/RouteFilterChips',
    '../MapVisualization/BusRouteMapModal': '../../MapVisualization/BusRouteMapModal',
    '../MapVisualization/StationMapModal': '../../MapVisualization/StationMapModal',
    './hooks/useStationDisplayData': '../hooks/useStationDisplayData',
    './hooks/useStationGroupProcessing': '../hooks/useStationGroupProcessing'
  },
  'src/components/features/StationManagement/StationDisplay/hooks/useStationDisplayData.ts': {
    '../../../stores/configStore': '../../../../stores/configStore'
  },
  'src/components/features/StationManagement/StationDisplay/hooks/useStationGroupProcessing.ts': {
    '../../../stores/configStore': '../../../../stores/configStore'
  }
};

function fixVehicleCardExport() {
  console.log('🔧 Fixing VehicleCard export issue...\n');
  
  const vehicleCardPath = 'src/components/ui/base/Card/VehicleCard.tsx';
  try {
    const content = readFileSync(vehicleCardPath, 'utf-8');
    const fixedContent = content.replace(
      'export const SimpleVehicleCard: React.FC<VehicleCardProps> = ({',
      'export const SimpleVehicleCard: React.FC<SimpleVehicleCardProps> = ({'
    );
    writeFileSync(vehicleCardPath, fixedContent, 'utf-8');
    console.log('✓ Fixed SimpleVehicleCard props type');
  } catch (err) {
    console.error('Error fixing VehicleCard:', err.message);
  }
}

function fixImportPaths() {
  console.log('🔧 Fixing import paths...\n');
  
  let totalFixed = 0;
  
  for (const [filePath, fixes] of Object.entries(FILE_FIXES)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      let modified = false;
      let fixedContent = content;
      
      for (const [oldPath, newPath] of Object.entries(fixes)) {
        const regex = new RegExp(`(['"])${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'g');
        const newContent = fixedContent.replace(regex, `$1${newPath}$2`);
        if (newContent !== fixedContent) {
          modified = true;
          fixedContent = newContent;
          console.log(`  Fixed: ${oldPath} → ${newPath}`);
        }
      }
      
      if (modified) {
        writeFileSync(filePath, fixedContent, 'utf-8');
        totalFixed++;
        console.log(`✓ Updated: ${filePath}\n`);
      }
    } catch (err) {
      console.error(`Error processing ${filePath}:`, err.message);
    }
  }
  
  console.log(`✅ Fixed ${totalFixed} files total.`);
}

function main() {
  console.log('🔧 Final import path fixes...\n');
  
  // Fix VehicleCard export issue first
  fixVehicleCardExport();
  
  // Fix import paths
  fixImportPaths();
  
  console.log('\n⚠️  Next step: Run "npm run build" to validate changes');
}

main();