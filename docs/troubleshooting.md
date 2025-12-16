# Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Build & Development Issues

#### Favorite Buses Empty After Setup
**Problem**: Favorite buses section shows empty even after completing setup

**Root Cause**: Favorite bus system required home location to be set, but home/work locations are now optional

**Solution**: Updated favorite bus system with intelligent location fallback
- Removed home location requirement from favorite bus system
- Added location priority: current GPS → home → work → Cluj center default
- Favorite buses now work immediately after API key + city setup

**Prevention**: Ensure optional features don't block core functionality

#### Setup Wizard Complete Button Not Working
**Problem**: Clicking "Complete Setup" after city selection doesn't transition to main app

**Root Cause**: Setup wizard wasn't saving complete configuration - missing `refreshRate` required for `isConfigured` state

**Solution**: Added default configuration values to setup wizard
- Added `refreshRate: 30000` (30 seconds default)
- Added `staleDataThreshold: 2` (2 minutes default)
- Ensures `isConfigured` state becomes true after setup completion

**Prevention**: Always verify complete configuration requirements when updating setup flow

#### MUI Menu Fragment Warning
**Problem**: `The Menu component doesn't accept a Fragment as a child. Consider providing an array instead.`

**Root Cause**: Menu component contained React Fragments (`<>...</>`) as direct children

**Solution**: Replaced Fragment children with arrays using keys
- Changed `<>...</>` to `[<Element key="..." />, ...]` pattern
- Added proper keys to array elements for React reconciliation
- Maintained same functionality without MUI warnings

**Prevention**: Use arrays instead of Fragments when rendering multiple children in MUI components

#### Station Display Showing Duplicate Vehicles
**Problem**: Station display showing multiple duplicate entries for the same bus routes and stations

**Root Cause**: Vehicle assignment logic was showing all vehicles for each station group instead of filtering vehicles by which stations they actually serve

**Solution**: Fixed vehicle-to-station assignment logic
- Updated vehicle filtering to check which stations each vehicle's trip actually serves
- Added proper trip_id to stop_times mapping for accurate vehicle-station relationships

#### Missing Components After Checkpoint Restore
**Problem**: After restoring from a checkpoint, some FavoriteBuses components are missing, causing build errors like "Cannot find module './components/RouteTypeFilters'"

**Root Cause**: Checkpoint restore moved some files to an archive folder, but imports still reference the original locations

**Solution**: Restore missing components from git history
1. **Identify missing files** from git history:
   ```bash
   git log --name-only --oneline | head -50
   ```

2. **Restore from git history:**
   ```bash
   # Find the commit with the files
   git show COMMIT_HASH:path/to/file.tsx > /tmp/file.tsx
   cp /tmp/file.tsx src/path/to/file.tsx
   ```

3. **Key files to restore:**
   - `BusRouteMapModal.tsx` - Route map modal component
   - `RoutesList.tsx` - Routes list display
   - `RouteListItem.tsx` - Individual route item
   - `RouteTypeFilters.tsx` - Route type filtering
   - `StatusMessages.tsx` - Status message display

4. **Verify build:**
   ```bash
   npm run build
   ```

**Prevention**: Always verify that all imported components exist before committing changes
- Fixed TypeScript interface issues with LiveVehicle vs raw API response data
- Added station name deduplication to handle multiple stations with same names

**Code Changes**:
- Fixed `StationDisplay.tsx` vehicle grouping logic
- Updated type imports from `Vehicle` to `LiveVehicle`
- Fixed property access for transformed vehicle data structure
- Added `_internalDirection` field for UI display logic

**Prevention**: Always verify data relationships when displaying grouped information

#### Settings Component Export Error
**Problem**: `SyntaxError: Indirectly exported binding name 'Settings' is not found`

**Root Cause**: Conflicting named and default exports in Settings component

**Solution**: Fixed by standardizing to named exports only
- Updated `Settings.tsx` to use only named export
- Updated `index.ts` to properly re-export named export

#### Vehicle Label Discrepancy
**Problem**: Different vehicle numbers shown in tooltip vs map popup (e.g., "354" in tooltip, "Bus 223" in popup)

**Root Cause**: Inconsistent use of vehicle identifiers - tooltip used `label` field, popup used `vehicleId` field

**Solution**: Standardized to use vehicle `label` field consistently
- Updated `FavoriteBusInfo` interface to include `label` field from API
- Changed all `vehicleLabel` references to use `bus.label` instead of `bus.routeName`
- Updated map popup to show `Bus {bus.label}` with fallback to `vehicleId`

**Prevention**: Use consistent data fields across all components displaying vehicle information

#### Station View Shows "Location Required" Despite Fallback Location Set
**Problem**: Station view displays "Location Required - Please enable location services" even when fallback location is configured

**Root Cause**: StationDisplay component only checked GPS location, ignored fallback location hierarchy

**Solution**: Implemented proper location fallback logic in StationDisplay
- Created `getEffectiveLocation()` utility function with priority: GPS → Home → Work → Default → Cluj center
- Updated StationDisplay to use effective location instead of GPS-only location
- Added fallback location dependencies to React useMemo for proper updates

**Prevention**: Always use location fallback utilities instead of direct GPS location checks

#### Station View Shows Wrong Buses or No Buses
**Problem**: Station view shows buses that don't actually stop at the displayed stations, or shows no buses despite routes serving those stations

**Root Cause**: Using proximity-based filtering instead of proper GTFS trip_id matching
- Proximity approach shows buses that happen to be nearby but don't serve the station
- Missing proper trip_id filtering based on stop_times data

**Solution**: Implemented proper GTFS trip_id filtering approach
- **Step 1**: Get stop_times data to find which trips serve target stations
- **Step 2**: Extract trip_ids for trips that stop at these stations  
- **Step 3**: Filter live vehicles by those trip_ids only
- **Step 4**: Enrich with route information and display results
- **Added proper loading states** and debug logging for troubleshooting

**Technical Details**:
- Tranzy API `/opendata/stop_times` returns `trip_id`, `stop_id`, and `stop_sequence`
- 127 out of 130 vehicle trip_ids match with stop_times trip_ids
- Proper approach: Use trip_id relationships to show only buses that serve the stations
- Enriches vehicle data with route names and descriptions from `/opendata/routes`

**Prevention**: 
- Always use GTFS relationships (trip_id matching) instead of GPS proximity for station-vehicle associations
- Verify that vehicles actually serve the stations before displaying them
- Ensure each view triggers its own data refresh instead of relying on other components

#### Station View Shows Empty Despite API Data Available
**Problem**: Station view displays "No buses currently serve these stations" even though API calls are successful and return vehicle data

**Root Cause**: StationDisplay component was using `useEnhancedBusStore` which requires complex configuration and location setup, but the store was returning empty arrays due to initialization issues

**Symptoms**:
- API calls to `/stops`, `/routes`, and `/vehicles` are successful (200 status)
- Console shows stores returning `null` or empty arrays
- No `/stop_times` API calls being made
- Debug logs show `targetStationsLength: 0, vehiclesLength: 0`

**Solution**: Modified StationDisplay to fetch vehicle data directly instead of relying on enhanced bus store
- **Removed dependency** on `useEnhancedBusStore` which was designed for favorite buses
- **Added direct API calls** to fetch vehicles using `enhancedTranzyApi.getVehicles()`
- **Simplified data flow** from API → component state → processing → display
- **Fixed timing issues** by ensuring vehicle data is available before processing

**Technical Changes**:
- Replaced `useEnhancedBusStore` with direct `useState` for vehicles
- Added dedicated `fetchVehicles` useEffect for API calls
- Updated vehicle filtering to work with raw `Vehicle[]` data instead of `EnhancedVehicleInfo[]`
- Maintained proper trip_id filtering logic for station-vehicle matching

**Prevention**: 
- Use appropriate data sources for each component's needs
- Avoid complex store dependencies when simple API calls suffice
- Ensure data availability before processing in useEffect chains
- Test component isolation to verify data flow works independently

#### Station View Overcomplicated Vehicle Processing
**Problem**: Station view had complex GTFS sequence analysis that was slow and error-prone

**Root Cause**: Overcomplicated logic trying to determine vehicle arrival/departure status using sequence analysis

**Solution**: Simplified to basic vehicle-station relationship check
- **Simple Logic**: Station ID → Vehicle trip_id → Check if station is in trip's stops
- **Removed Complexity**: Eliminated route ID mapping, sequence analysis, arrival/departure logic
- **Direct Relationship**: Just show vehicles whose trips serve the closest station
- **Better Performance**: Much faster processing with fewer API calls

**Prevention**: Start with simple solutions before adding complexity

#### Station View Inefficient Vehicle Filtering
**Problem**: Station view was making individual API calls for each vehicle to check if it serves a station

**Root Cause**: Wrong approach - checking each vehicle's trip individually instead of bulk filtering

**Solution**: Implemented efficient bulk filtering approach
- **Step 1**: Get all stop_times once (bulk API call)
- **Step 2**: Filter stop_times by target station IDs to get relevant trip_ids
- **Step 3**: Filter vehicles by those trip_ids (in-memory filtering)
- **Result**: Much faster with fewer API calls

**Prevention**: Use bulk operations and in-memory filtering instead of individual API calls in loops
- Removed conflicting default export

**Prevention**: Always use consistent export patterns (prefer named exports)

#### Console Log Level Not Updating
**Problem**: Changing console log level in configuration doesn't affect actual console output

**Root Cause**: Log level was only applied locally in component but not persisted to config store until entire configuration was submitted

**Solution**: Fixed immediate log level application
- Added `handleLogLevelChange` function that immediately updates both form data and config store
- Log level changes are now applied instantly when dropdown value changes
- Removed redundant useEffect that was trying to sync log level

**Prevention**: Ensure configuration changes that affect global state are persisted immediately, not just on form submission

#### Console Log Level Not Respected by Debug Messages
**Problem**: Setting console log level to WARN still shows DEBUG and INFO messages in console

**Root Cause**: Many debug messages were using `console.log()` directly instead of the logger system, bypassing log level filtering

**Solution**: Replaced direct console.log calls with proper logger calls
- Converted `console.log()` calls to `logger.debug()`, `logger.info()`, or `logger.warn()` as appropriate
- Debug messages now respect the configured log level setting
- Console output is now properly filtered based on user's log level preference

**Prevention**: Always use the logger system (`logger.debug()`, `logger.info()`, etc.) instead of direct `console.log()` calls

#### Repeated Google Maps API Key Warnings
**Problem**: Console shows repeated "Google Maps API key not configured" warnings every time transit calculations are performed

**Root Cause**: The Google Transit Service was checking for API key on every calculation and logging a warning each time, instead of checking once and remembering the result

**Solution**: Implemented smart API key checking with state caching
- Added `apiKeyChecked` and `hasApiKey` flags to remember API key status
- Only logs the warning once when first checking API key availability
- Subsequent calls use cached result without logging
- API key check resets when Google Maps API key configuration changes
- Changed warning level from WARN to INFO for less intrusive logging

**Prevention**: Cache expensive checks and avoid repeated logging of the same condition

#### Multiple Log Level Change Messages
**Problem**: Console shows repeated "Log level changed to: WARN" messages when managing favorite buses or other configuration changes

**Root Cause**: The config store was calling `setLogLevel()` on every `updateConfig()` call, even when the log level hadn't actually changed

**Solution**: Added log level change detection
- Only call `setLogLevel()` when the log level actually changes
- Check `currentConfig?.logLevel !== updatedConfig.logLevel` before setting
- Removed duplicate log level initialization from logger.ts
- Config store now handles all log level management

**Prevention**: Always check if a value has actually changed before triggering side effects

### App Won't Start

#### Port Already in Use
**Problem**: `Error: listen EADDRINUSE: address already in use :::5175`

**Solution**:
```bash
# Use a different port
npm run dev -- --port 3000

# Or kill the process using the port
lsof -ti:5175 | xargs kill -9
```

#### Node Version Issues
**Problem**: `Error: The engine "node" is incompatible`

**Solution**:
```bash
# Check your Node version
node --version

# Install Node 18+ if needed
# Using nvm (recommended):
nvm install 18
nvm use 18
```

### API Issues

#### "API Key Invalid" Error / 403 Forbidden
**Problem**: Can't fetch bus data, getting 403 Forbidden or API key rejected

**Root Cause**: API authentication is failing, but network connectivity is working

**Diagnostic Tool**: Open `tools/debug/check-api-status.html` in your browser to:
- Check if API key is stored correctly
- Test API calls with detailed error information
- Verify network connectivity vs API authentication

**Solutions**:
1. **Check API key format**: Ensure it's the correct format from Tranzy.ai
2. **Verify key permissions**: Log into Tranzy account and check key status
3. **Test key directly**: Use the diagnostic tool to test API calls
4. **Clear and re-enter**: Delete and re-enter the API key in Settings
5. **Check account status**: Ensure your Tranzy.ai account is active

**Enhanced Connectivity Tracking (December 2024)**: Online/offline indicator now shows actual API connectivity status:
- **Green "Online"**: Network connected AND API accessible
- **Red "Offline"**: No network connection
- **Red "API Error"**: Network connected but API unavailable (403, timeouts, etc.)

#### "No Schedule Data Available"
**Problem**: Routes show no departure times

**Root Cause**: This was a major issue caused by station name mismatches between CTP Cluj website and Tranzy API.

**Fixed**: The app now provides route-level timing for any station request, so this should no longer occur.

**If it still happens**:
1. **Refresh the page** - data might be temporarily unavailable
2. **Check route number** - ensure it's a valid CTP Cluj route
3. **Try different time** - some routes have limited schedules

#### CORS Errors
**Problem**: `Access to fetch at 'https://api.tranzy.ai' from origin 'http://localhost:5175' has been blocked by CORS policy`

**Solution**: This should be handled by the proxy configuration. If you see this:
1. **Restart the dev server**: `npm run dev`
2. **Check proxy config**: Verify `vite.config.ts` has correct proxy setup
3. **Clear browser cache**: Old requests might be cached

### Route & Schedule Issues

#### Route 42 Not Showing 15:45 Departure
**Problem**: Expected departure time missing from schedule

**Status**: ✅ **FIXED** - Route 42 now includes 15:45 departure

**If still missing**:
1. **Check current time**: Schedule might be filtered by time of day
2. **Refresh data**: Pull down to refresh or wait for auto-refresh
3. **Verify route direction**: Make sure you're looking at the right direction

#### Wrong Route Numbers
**Problem**: Route shows as "40" instead of "42"

**Explanation**: 
- **Tranzy API uses Route ID**: "40"
- **CTP Cluj uses Route Label**: "42"
- **App should show**: "42" (the user-facing number)

**If showing wrong number**: This indicates a bug in the route mapping logic.

#### Live Tracking Not Working
**Problem**: No red dots showing live buses

**Possible Causes**:
1. **No buses currently running** - check if it's operating hours
2. **API key issues** - live data requires valid Tranzy API key
3. **Network issues** - check internet connection
4. **Route not supported** - not all routes have live tracking

### Test Failures

#### "useRefreshSystem() returns undefined"
**Problem**: RefreshControl tests failing

**Status**: ✅ **FIXED** - Mock configuration corrected

**If tests still fail**:
```bash
# Clear test cache
npm run test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm test
```

#### General Test Issues
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- RefreshControl.test.tsx

# Run tests in watch mode for debugging
npm run test:watch
```

### Performance Issues

#### Storage Quota Exceeded Error
**Problem**: Browser console shows "QuotaExceededError: The quota has been exceeded"

**Root Cause**: App cache grows too large for browser's localStorage limit (5-10MB)

**Solution Applied (December 2024)**: 
- **Intelligent cache management**: Monitors both total size and individual entry sizes
- **Large entry prevention**: Blocks individual entries over 2MB from being cached
- **Size-based cleanup**: Removes largest entries first (more effective than age-based)
- **Conservative limits**: Warning at 2MB, hard limit at 3MB (more aggressive prevention)
- **Enhanced emergency handling**: Keeps only 20 smallest entries if quota exceeded
- **Graceful fallback**: Continues working even if storage completely fails

**Manual Solutions**:
- **Clear browser data**: Go to browser settings and clear site data
- **Restart browser**: Sometimes helps reset storage quotas
- **Check available space**: Ensure device has sufficient storage

**Prevention**: Cache now self-manages storage size automatically

#### Slow Loading
**Solutions**:
1. **Check network speed** - app fetches data from multiple sources
2. **Clear browser cache** - old data might be causing conflicts
3. **Disable auto-refresh** - reduces background network activity
4. **Use WiFi** - mobile data might be slower

#### High Battery Usage
**Solutions**:
1. **Turn off auto-refresh** when not actively using
2. **Close unused browser tabs**
3. **Use airplane mode** when not needed
4. **Enable battery saver** in browser settings

### Browser-Specific Issues

#### Safari Issues
- **Location not working**: Check Safari location permissions
- **Service worker issues**: Try clearing Safari cache
- **Display problems**: Safari sometimes has CSS issues

#### Chrome Issues
- **Memory usage**: Chrome can use lots of RAM with auto-refresh
- **CORS in dev mode**: Make sure you're using `localhost:5175`

#### Mobile Browser Issues
- **Touch not working**: Try refreshing the page
- **Zoom issues**: Use pinch-to-zoom for better view
- **Add to home screen**: For better mobile experience

## 🔧 Debug Tools

### Browser Console
Always check the browser console (F12) for error messages:
- **Red errors**: Critical issues that break functionality
- **Yellow warnings**: Non-critical issues
- **Blue info**: Debug information

### Debug Scripts
Located in `tools/debug/`:

```bash
# Test API configuration
open tools/debug/check-config.html

# Debug favorites system
node tools/debug/debug-favorites.js

# Debug schedule issues
node tools/debug/debug-schedule-issue.js
```

### Enable Debug Logging
```javascript
// In browser console
localStorage.setItem('debug', 'schedule:*');
// Refresh page to see detailed logs
```

## 📊 Health Checks

### Quick System Check
1. **App loads**: ✅ `http://localhost:5175` opens without errors
2. **Tests pass**: ✅ `npm test` shows 271/271 passing
3. **API works**: ✅ Can see route data and schedules
4. **No console errors**: ✅ Browser console is clean

### Data Source Check
1. **Live vehicles**: 🔴 Red dots on map (when available)
2. **Official schedules**: 📋 CTP Cluj departure times
3. **API fallback**: ⏱️ Estimated times when needed

### Performance Check
```bash
# Build size check
npm run build
# Look for bundle size warnings

# Test performance
npm run test:coverage
# Check for performance test results
```

## 🆘 Getting Help

### Before Asking for Help
1. **Check this guide** - most issues are covered here
2. **Look at browser console** - error messages are helpful
3. **Try basic fixes** - refresh, clear cache, restart server
4. **Check version info** - Click the version icon in Settings to see:
   - App version and last update check
   - City name and Agency ID (for troubleshooting)
   - Service worker status
5. **Check if it's a known issue** - look at recent changes

### Providing Debug Information
When reporting issues, include:
- **Error message** (exact text from console)
- **Steps to reproduce** (what you did before the error)
- **Browser and version** (Chrome 91, Safari 14, etc.)
- **Operating system** (macOS, Windows, Linux)
- **Node version** (`node --version`)
- **App version and city info** (from Settings > Version menu)

### Emergency Fixes

#### Complete Reset
```bash
# Nuclear option - reset everything
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Rollback Changes
```bash
# If you made changes that broke things
git status
git checkout -- .
npm run dev
```

---

**Still having issues?** Check the [developer guide](developer-guide.md) for technical details or look at the debug tools in `tools/debug/`.

### Favorite Buses Data Issues

#### "Route information unavailable" or "No real-time data available"
**Problem**: Favorite buses show error messages instead of vehicle data

**Major Fix Applied (December 2024)**: Fixed Tranzy API vehicle lookup issue

**Root Cause**: Tranzy API vehicles endpoint design inconsistency:
- `/routes` endpoint: Uses internal route IDs (e.g., `route_id: 40` for `route_short_name: "42"`)
- `/vehicles` endpoint: Uses route short names in the route_id field (e.g., `route_id: "42"`)

**Solution Applied**: Modified `favoriteBusService.ts` to look up vehicles using route short names instead of internal route IDs.

**Verification**: Check console logs for:
- `🗺️ DEBUGGING: Route mapping found` with explanation about API design
- `🚌 DEBUGGING: Vehicle cache lookup results` showing `routesWithVehicles` populated
- Route correction showing proper vehicle lookup strategy

**Debugging Steps Using DevTools**:

1. **Open Browser DevTools** (F12 or right-click → Inspect)

2. **Go to Console Tab** and look for debugging messages with these prefixes:
   - `🔍 DEBUGGING: Agency lookup` - Check if agency ID is found
   - `🗺️ DEBUGGING: Route mapping found` - Check if route mapping works
   - `🔄 DEBUGGING: Route correction summary` - See route ID corrections
   - `🚛 DEBUGGING: Raw vehicles received` - Check if vehicles are fetched from API
   - `🚛 DEBUGGING: Vehicle filtering results` - See how many vehicles pass filtering
   - `🚌 DEBUGGING: Vehicle cache lookup results` - Check final vehicle availability

3. **Common Issues & Solutions**:

   **Agency Not Found**:
   ```
   ❌ No agency found for city: Cluj-Napoca
   ```
   **Solution**: Check API key configuration and city name

   **Route Mapping Failed**:
   ```
   ❌ DEBUGGING: No route mapping found for favorite route: {routeName: "42"}
   ```
   **Solution**: Route "42" doesn't exist in API. Check available routes in Settings.

   **No Vehicles with Valid Trip IDs**:
   ```
   🚛 DEBUGGING: Vehicle filtering results: {
     totalVehicles: 150,
     activeVehicles: 0,
     filteredOut: 150,
     filterReasons: {noTripId: 145, noRouteId: 5}
   }
   ```
   **Solution**: All vehicles have `tripId: null`, indicating operational issues. This is correct behavior - the route has no active vehicles with proper GTFS data.

   **Route ID Mismatch**:
   ```
   🚌 DEBUGGING: Vehicle cache lookup results: {
     requestedRoutes: ["123"],
     routesWithVehicles: ["456", "789"],
     vehicleBreakdown: []
   }
   ```
   **Solution**: Requested route ID "123" doesn't match available vehicle route IDs. Check route mapping service.

4. **Manual Testing Steps**:

   **Check Raw API Data**:
   - Open Network tab in DevTools
   - Look for requests to `/api/tranzy/v1/opendata/vehicles`
   - Check response to see if vehicles have `trip_id` values
   - Vehicles with `trip_id: null` are filtered out (this is correct)

   **Check Route Mapping**:
   - Look for requests to route mapping service
   - Verify route "42" maps to correct API route ID
   - Check if mapped route ID exists in vehicle data

   **Check Configuration**:
   - Go to Application tab → Local Storage
   - Look for `config-store` entry
   - Verify `favoriteBuses` array contains correct route names
   - Verify `agencyId` is set (should be "2" for Cluj)

5. **Expected Behavior**:
   - **If no vehicles have valid `trip_id`**: "Route information unavailable" is correct
   - **If route mapping fails**: Route doesn't exist in current GTFS data
   - **If agency lookup fails**: API key or configuration issue

#### Performance Issues with Favorite Buses
**Problem**: Favorite buses take long time to load or cause app to freeze

**Debugging**: Check console for:
- Multiple rapid API calls (indicates caching issues)
- Large vehicle datasets being processed
- Memory usage in DevTools Performance tab

**Solution**: 
- Verify cache is working properly
- Check if auto-refresh intervals are too aggressive
- Ensure proper cleanup of subscriptions

#### Cache Issues
**Problem**: Favorite buses show stale data or don't update

**Debugging**: Look for cache-related logs:
- Cache hit/miss ratios
- Cache age information
- Force refresh triggers

**Solution**:
- Clear browser cache and localStorage
- Check cache TTL settings
- Verify auto-refresh is working

### PWA & Mobile Issues

#### Dark Mode Not Persisting in PWA (iPhone Add to Home Screen)
**Problem**: Dark mode setting doesn't stay when exiting and re-entering the browser/PWA

**Root Cause**: Theme persistence issues in PWA mode due to localStorage timing and theme flash prevention

**Solution Applied (December 2024)**:
- **Enhanced theme store persistence**: Changed storage key to `cluj-bus-theme` for better PWA isolation
- **Immediate theme application**: Added `onRehydrateStorage` callback to apply theme immediately on load
- **Document root theme attribute**: Added `data-theme` attribute to prevent theme flash
- **PWA meta theme-color**: Dynamic theme-color meta tag updates based on current theme
- **Theme initialization**: Improved theme detection and application on app startup

**Technical Changes**:
- Updated `themeStore.ts` with better PWA persistence
- Added theme initialization in `main.tsx` with React useEffect
- Updated `manifest.json` and `index.html` with correct theme colors
- Added document-level theme attributes for consistent theming

**Prevention**: Always test PWA functionality on actual mobile devices, not just desktop browser dev tools

#### GPS Location Not Refreshing on Manual Refresh
**Problem**: Pressing the refresh button doesn't update GPS location for user

**Root Cause**: Location refresh logic was checking permission status instead of always attempting fresh location

**Solution Applied (December 2024)**:
- **Always attempt GPS refresh**: Modified RefreshControl to always try location refresh regardless of permission status
- **Force fresh location**: Set `maximumAge: 0` in geolocation options to prevent cached location
- **Increased timeout**: Extended GPS timeout to 20 seconds for better reliability
- **Better error handling**: Improved GPS error logging while continuing with data refresh

**Technical Changes**:
- Updated `RefreshControl.tsx` to always call `requestLocation()`
- Modified `LocationService.getCurrentPosition()` to force fresh location
- Added better GPS refresh logging for debugging
- Maintained graceful fallback when GPS fails

**Prevention**: Test location refresh on actual mobile devices with GPS enabled

#### PWA Theme Color Not Matching App Theme
**Problem**: PWA status bar color doesn't match the app's current theme (light/dark)

**Solution Applied**: 
- Updated `manifest.json` theme_color to match Material Design primary color
- Added dynamic meta theme-color updates in `main.tsx`
- Updated `index.html` meta theme-color to correct value

**Prevention**: Keep PWA manifest colors in sync with app theme colors