# Troubleshooting Guide

## 🚨 Common Issues & Solutions

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
4. **Check if it's a known issue** - look at recent changes

### Providing Debug Information
When reporting issues, include:
- **Error message** (exact text from console)
- **Steps to reproduce** (what you did before the error)
- **Browser and version** (Chrome 91, Safari 14, etc.)
- **Operating system** (macOS, Windows, Linux)
- **Node version** (`node --version`)

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