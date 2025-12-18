# Common Issues & Solutions

## 🚨 Most Frequent Problems

### "No Active Buses" Error
**Problem**: App shows "No buses are currently serving nearby stations. Try refreshing or check back later." even when buses should be running.

**Root Cause**: This happens when vehicles are being filtered out somewhere in the data pipeline, preventing them from reaching the display layer.

#### 🔧 Quick Diagnosis Steps

1. **Use Debug Tool**: Open `/debug.html` in your browser and run "Full Diagnosis"
   - Checks API key, location, data fetching, and vehicle-station matching
   - Provides detailed metrics on what's working vs. failing

2. **Check Browser Console**: Look for these debug patterns:
   ```
   🚌 VEHICLES: Found X vehicles, Y with trips, Z serving stations
   📍 STATIONS: Found X stations within Y km
   🔗 MATCHING: X vehicles matched to Y stations
   ```

#### 🎯 Systematic Troubleshooting

**Step 1: Verify Basic Configuration**
```javascript
// Run in browser console
const config = JSON.parse(localStorage.getItem('config') || '{}');
console.log('API Key:', config.state?.config?.apiKey ? 'SET' : 'MISSING');
console.log('Agency ID:', config.state?.config?.agencyId || 'MISSING');
console.log('City:', config.state?.config?.city || 'NOT SET');
```

**Step 2: Test API Connectivity**
- Open `/debug.html`
- Click "Validate API Key" - should show ✅ with agency count
- Click "Fetch Vehicles" - should show vehicle metrics
- Click "Fetch Stations" - should show station metrics

**Step 3: Check Vehicle Data Quality**
Look for these common filtering issues:
- **No tripId**: Vehicles without `trip_id` are filtered out
- **No coordinates**: Vehicles without valid GPS coordinates
- **No route**: Vehicles not assigned to routes

**Step 4: Analyze Location & Distance**
- Click "Analyze Location Filtering" in debug tool
- Check if stations are found within reasonable distance (2-5km)
- Verify GPS permission is granted

**Step 5: Check Vehicle-Station Matching**
- Click "Analyze Vehicle-Station Matching" in debug tool
- Should show vehicles with trips matching stations via stop_times data
- Low matching ratio indicates data synchronization issues

#### 🚨 Common Causes & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Invalid API Key** | All API calls fail | Get valid Tranzy API key, update in settings |
| **Wrong Agency ID** | No data or wrong city data | Select correct city (Cluj = Agency ID 2) |
| **GPS Disabled** | No nearby stations | Enable location services or set default location |
| **No Active Vehicles** | Vehicles=0 in debug | Normal during off-hours, holidays, or maintenance |
| **Trip Data Missing** | Vehicles>0 but no matches | API issue - vehicles lack trip_id assignments |
| **Distance Too Strict** | Stations found but no vehicles | Increase search radius in location settings |

#### ⚡ Quick Fixes

1. **Refresh Data**: Clear browser cache and reload
2. **Reset Location**: Disable/enable GPS to refresh location
3. **Try Different Time**: Check during peak hours (7-9 AM, 5-7 PM)
4. **Manual Location**: Set Cluj center coordinates if GPS fails
5. **Different Agency**: Try switching cities if available

### Build & Development Issues

#### Favorite Buses Empty After Setup
**Problem**: Favorite buses section shows empty even after completing setup

**Root Cause**: Favorite bus system required home location to be set, but home/work locations are now optional

**Solution**: Updated favorite bus system with intelligent location fallback
- Removed home location requirement from favorite bus system
- Added location priority: current GPS → home → work → Cluj center default
- Favorite buses now work immediately after API key + city setup

#### Setup Wizard Complete Button Not Working
**Problem**: Clicking "Complete Setup" after city selection doesn't transition to main app

**Root Cause**: Setup wizard wasn't saving complete configuration - missing `refreshRate` required for `isConfigured` state

**Solution**: Added default configuration values to setup wizard
- Added `refreshRate: 30000` (30 seconds default)
- Added `staleDataThreshold: 2` (2 minutes default)
- Ensures `isConfigured` state becomes true after setup completion

#### MUI Menu Fragment Warning
**Problem**: `The Menu component doesn't accept a Fragment as a child. Consider providing an array instead.`

**Root Cause**: Menu component contained React Fragments (`<>...</>`) as direct children

**Solution**: Replaced Fragment children with arrays using keys
- Changed `<>...</>` to `[<Element key="..." />, ...]` pattern
- Added proper keys to array elements for React reconciliation
- Maintained same functionality without MUI warnings

### Import/Export Issues

#### TypeScript Errors in Modern Hooks
**Problem**: TypeScript compilation errors in modern data hooks after migration

**Root Cause**: Interface mismatches and incorrect method names after migrating from Enhanced Bus Store

**Solution**: Fixed all interface and method call issues
1. Fixed import paths for data hooks (`./data/useStationData` instead of `./useStationData`)
2. Updated method calls from `refresh()` to `refetch()` to match actual data hook interface

#### Import Path Resolution Errors
**Problem**: Build fails with "Failed to resolve import" errors for hooks and utilities

**Root Cause**: Incorrect relative import paths after project restructuring

**Solution**: Fixed import paths across the codebase
1. Updated data hook imports: `../hooks/data/useStationData` (not `./data/useStationData`)
2. Fixed shared hook imports: `../hooks/shared/useAsyncOperation` (not `../hooks/useAsyncOperation`)
3. Corrected controller hook imports: `../hooks/controllers/useVehicleProcessingOrchestration`
4. Fixed cross-directory imports in orchestration files: `../shared/dependencyTracker` (not `./shared/dependencyTracker`)

#### Export/Import Binding Errors
**Problem**: Build fails with "Indirectly exported binding name not found" or "Duplicate identifier" errors

**Root Cause**: Incorrect exports in index files and missing hook exports after refactoring

**Solution**: Fixed export/import issues across hook index files
1. Fixed `cacheManager` export: Export actual exports (`globalCache`, `CacheManager`) instead of non-existent `cacheManager`
2. Fixed `dependencyTracker` export: Export actual functions (`createDependencyTracker`, `useDependencyTracker`) instead of non-existent instance
3. Added missing `useApiKeyForm` export to shared hooks index
4. Removed duplicate `useVehicleProcessing` exports from controllers index

### Configuration Issues

#### Console Log Level Not Updating
**Problem**: Changing console log level in configuration doesn't affect actual console output

**Root Cause**: Log level was only applied locally in component but not persisted to config store until entire configuration was submitted

**Solution**: Fixed immediate log level application
- Added `handleLogLevelChange` function that immediately updates both form data and config store
- Log level changes are now applied instantly when dropdown value changes
- Removed redundant useEffect that was trying to sync log level

#### Console Log Level Not Respected by Debug Messages
**Problem**: Setting console log level to WARN still shows DEBUG and INFO messages in console

**Root Cause**: Many debug messages were using `console.log()` directly instead of the logger system, bypassing log level filtering

**Solution**: Replaced direct console.log calls with proper logger calls
- Converted `console.log()` calls to `logger.debug()`, `logger.info()`, or `logger.warn()` as appropriate
- Debug messages now respect the configured log level setting
- Console output is now properly filtered based on user's log level preference

### Critical React Issues

#### Critical React Infinite Loop Crash (December 2024)
**Problem**: App crashes browser with infinite console logging, showing "Maximum update depth exceeded" error and 30,000+ log messages per second

**Symptoms**:
- Browser becomes unresponsive and may crash
- Console shows: `Maximum update depth exceeded. This can happen when a component calls setState inside useEffect`
- Thousands of repeated log messages: `[SYSTEM] [APP] No vehicles data available for nearby view`
- Error points to `useNearbyViewController.ts` lines 200, 103, 324

**Root Cause**: Infinite re-render loop in `useNearbyViewController` hook caused by unstable dependencies in useCallback
- `processNearbyView` useCallback had array dependencies (`stations`, `vehicles`, `routes`, `stopTimes`) that changed on every render
- This caused the function to be recreated constantly, triggering infinite useEffect loops
- Data hooks were returning new array instances instead of stable references

**Solution Applied (December 2024)**:
- **Stabilized useCallback dependencies**: Changed from array references to array lengths (`stations?.length` instead of `stations`)
- **Removed circular dependencies**: Removed `processNearbyView` from useEffect dependency arrays to break the loop
- **Fixed dependency chain**: Auto-refresh and manual refresh functions no longer depend on the recreated callback

**Prevention**: 
- Always use stable values in useCallback dependencies (lengths, IDs, not object/array references)
- Avoid including callback functions in useEffect dependencies when possible
- Use React DevTools Profiler to detect infinite re-render loops during development

### Logging Issues


#### Multiple Log Level Change Messages
**Problem**: Console shows repeated "Log level changed to: WARN" messages when managing favorite buses or other configuration changes

**Root Cause**: The config store was calling `setLogLevel()` on every `updateConfig()` call, even when the log level hadn't actually changed

**Solution**: Added log level change detection
- Only call `setLogLevel()` when the log level actually changes
- Check `currentConfig?.logLevel !== updatedConfig.logLevel` before setting
- Removed duplicate log level initialization from logger.ts
- Config store now handles all log level management

## 🔍 Advanced Debugging

### Check Vehicle Filtering Pipeline
```javascript
// In browser console during app use
// Look for these debug logs:
// "LiveVehicleService: Filtered out X vehicles"
// "Filtering reasons: { noTripId: X, noRouteId: Y, invalidCoords: Z }"
```

### Monitor Network Requests
- Use debug tool "Network Monitoring"
- Watch for failed API calls or slow responses
- Check if proxy endpoints are working correctly

### Verify Data Transformation
- Raw API uses `trip_id` (snake_case)
- Internal app uses `tripId` (camelCase)
- Inconsistent transformation causes filtering failures

## 🛠️ Developer Debug Commands

```javascript
// Force refresh all data
localStorage.clear(); location.reload();

// Check vehicle processing
console.log('Vehicle store:', JSON.parse(localStorage.getItem('vehicles') || '{}'));

// Monitor live updates
// Enable debug logs in browser dev tools console
```

## 🆘 When to Contact Support

### Report to Developers When:
- Debug tool shows API key valid but no vehicles
- Vehicles found but zero station matches
- All systems green but still no buses displayed
- Consistent failures across multiple browsers/devices

### Include in Reports:
- **Exact error messages** from console
- **Steps to reproduce** the issue
- **Browser and version** information
- **Network conditions** (WiFi/mobile, speed)
- **API key status** (valid/invalid, account type)
- **App version** from Settings

---

**Remember**: Most common issues are configuration or timing problems. Follow the systematic approach above before assuming there's a deeper problem.