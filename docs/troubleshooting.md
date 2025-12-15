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

#### Settings Component Export Error
**Problem**: `SyntaxError: Indirectly exported binding name 'Settings' is not found`

**Root Cause**: Conflicting named and default exports in Settings component

**Solution**: Fixed by standardizing to named exports only
- Updated `Settings.tsx` to use only named export
- Updated `index.ts` to properly re-export named export
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

#### "API Key Invalid" Error
**Problem**: Can't fetch bus data, API key rejected

**Solutions**:
1. **Double-check the key**: Copy-paste carefully from Tranzy.ai
2. **Verify key is active**: Log into your Tranzy account
3. **Check network**: Try accessing Tranzy.ai directly
4. **Clear browser cache**: Sometimes old keys get cached

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