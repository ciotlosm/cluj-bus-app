# Google Transit Service Extraction - Pre-Extraction Analysis

## Analysis Date
December 18, 2024

## Backup Status
✅ **Backup Created**: Git stash created with message "Pre-Google-extraction backup - Thu Dec 18 06:53:58 EET 2025"

## Current Build Status
⚠️ **Build Issues Found**: There are 2 TypeScript errors in `tranzyApiService.ts` related to `dataCacheManager` (unrelated to Google functionality)

## Google Transit Service Usage Analysis

### ✅ **VERIFIED: No Active Usage**
- **googleTransitService**: No imports or usage found in the codebase
- **TransitEstimate/TransitRequest interfaces**: Only used within googleTransitService.ts itself
- **Service exports**: Not exported from `src/services/index.ts`

### 📁 **Files Identified for Removal/Modification**

#### Core Service Files
1. **`src/services/googleTransitService.ts`** - Complete file for deletion
   - Contains GoogleTransitService class
   - Exports TransitEstimate and TransitRequest interfaces
   - Exports googleTransitService singleton instance
   - Uses CacheKeys import (unused)

#### UI Components
2. **`src/components/features/Configuration/sections/GoogleMapsApiKeySection.tsx`** - Complete file for deletion
   - React component for Google Maps API key configuration
   - Contains form fields, validation, and help text

3. **`src/components/features/Settings/ApiConfigurationPanel.tsx`** - Requires modification
   - Line 11: Import GoogleMapsApiKeySection
   - Lines 56-61: GoogleMapsApiKeySection usage
   - Form handling for googleMapsApiKey field

#### Type Definitions
4. **`src/types/index.ts`** - Requires modification
   - Line 52: `googleMapsApiKey?: string;` in UserConfig interface

5. **`src/hooks/shared/useConfigurationManager.ts`** - Requires modification
   - Line 12: `googleMapsApiKey?: string;` in interface

#### UI Messages and Tooltips
6. **`src/components/ui/Card/Card.tsx`** - Requires modification
   - Line 152: Tooltip "Configure Google Maps API key for accurate ETAs"

#### Cache References
7. **`src/services/cacheManager.ts`** - Requires cleanup
   - Line 61: `transitEstimates` cache configuration
   - Line 848: `transitEstimate` cache key function

### 🔍 **Environment Variables**
- **VITE_GOOGLE_MAPS_API_KEY**: Referenced in googleTransitService.ts only
- No other environment variable usage found

### 📚 **Documentation References**
Multiple documentation files reference Google functionality:
- `.kiro/specs/service-store-alignment/requirements.md`
- `docs/archive/implementation/google-maps-api-integration.md`
- `docs/archive/implementation/cache-*.md` files
- Various architecture documentation files

### 🎯 **Extraction Impact Assessment**

#### ✅ **Safe to Remove (No Dependencies)**
- `googleTransitService.ts` - No active imports or usage
- `GoogleMapsApiKeySection.tsx` - Only used in ApiConfigurationPanel
- TransitEstimate/TransitRequest interfaces - Only used internally

#### ⚠️ **Requires Careful Modification**
- UserConfig interface - Remove googleMapsApiKey field
- ApiConfigurationPanel - Remove Google section and form handling
- Card component - Remove Google-related tooltip
- Cache manager - Remove transit-related cache entries

#### 📋 **Verification Steps Needed**
1. Build verification after each removal
2. Type checking for interface changes
3. UI testing for settings panel
4. Cache system verification

## Recommendations

### Extraction Order
1. Remove core service file first (no dependencies)
2. Remove UI components (GoogleMapsApiKeySection)
3. Update type definitions and interfaces
4. Clean up UI messages and cache references
5. Update documentation

### Risk Assessment
- **Low Risk**: Core service removal (no active usage)
- **Medium Risk**: Type interface changes (may affect other components)
- **Low Risk**: UI component removal (isolated component)

## Next Steps
1. Proceed with systematic removal following the task plan
2. Verify build after each major change
3. Test settings interface functionality
4. Update documentation references

---
**Analysis Complete**: Ready to proceed with Google Transit service extraction.