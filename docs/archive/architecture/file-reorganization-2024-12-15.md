# File Reorganization - December 15, 2024

## Overview
Comprehensive reorganization of src/ directory to improve naming clarity and logical structure.

## Issues Identified

### 1. Confusing File Names
- `SimplifiedCacheManager.tsx` - Actually a UI component for cache management, not a cache manager
- `consolidatedCache.ts` - Should be named `cache.ts` or `cacheManager.ts`
- `officialScheduleService.ts` - Unused service that should be removed
- `officialSchedules.ts` - Unused data file that should be removed

### 2. File Extension Usage
- `.ts` - Pure TypeScript files (services, utilities, stores, types)
- `.tsx` - React components with JSX syntax

### 3. Structural Issues
- Cache-related files scattered across services
- Some components in wrong directories
- Inconsistent naming patterns

## Reorganization Plan

### Phase 1: Remove Unused Files
- Delete `src/services/officialScheduleService.ts`
- Delete `src/data/officialSchedules.ts`
- Remove `src/data/` directory if empty

### Phase 2: Rename Core Files
- `consolidatedCache.ts` → `cacheManager.ts`
- `SimplifiedCacheManager.tsx` → `CacheManagerPanel.tsx`

### Phase 3: Update Imports
- Update all imports to use new file names
- Ensure consistency across the codebase

### Phase 4: Verify Structure
- Ensure all files are in correct directories
- Verify naming conventions are followed
- Test that all imports work correctly

## Implementation Status
- [x] Phase 1: Remove unused files
- [x] Phase 2: Rename core files  
- [x] Phase 3: Update imports
- [x] Phase 4: Verify structure

## Changes Made

### Files Removed
- `src/services/officialScheduleService.ts` - Unused service
- `src/data/officialSchedules.ts` - Unused data file
- `src/data/` directory - Now empty, removed

### Files Renamed
- `src/services/consolidatedCache.ts` → `src/services/cacheManager.ts`
- `src/components/features/Settings/SimplifiedCacheManager.tsx` → `src/components/features/Settings/CacheManagerPanel.tsx`
- `src/utils/loggerFixed.ts` → `src/utils/logger.ts`

### Services Consolidated
- `src/services/enhancedTranzyApi.ts` + `src/services/tranzyApiService.ts` → `src/services/tranzyApiService.ts`
  - Combined the best features of both API services
  - Added request debouncing from legacy service
  - Maintained backward compatibility with multiple export patterns
  - Eliminated confusion between two similar services

### Classes/Components Renamed
- `ConsolidatedCacheManager` → `CacheManager`
- `consolidatedCache` → `cacheManager` (singleton instance)
- `SimplifiedCacheManager` → `CacheManagerPanel` (React component)

### Import Updates
- Updated 18+ files to import from new locations
- Maintained backward compatibility with legacy aliases
- All imports now use cleaner, more logical names

## File Extension Clarification
- `.ts` files: Pure TypeScript (services, utilities, stores, types)
- `.tsx` files: React components with JSX syntax

## Benefits Achieved
- ✅ Clearer, more logical file names
- ✅ Removed unused/dead code
- ✅ Consistent naming conventions
- ✅ Better developer experience
- ✅ Maintained backward compatibility during transition