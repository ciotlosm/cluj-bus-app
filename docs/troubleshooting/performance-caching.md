# Performance & Caching Issues

## 💾 Storage & Cache Problems

### Storage Quota Exceeded Error
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

### Cache Inconsistency Issues
**Problem**: App shows different data in different tabs or after refresh

**Root Cause**: Multiple cache layers not synchronized properly

**Common Scenarios**:
1. **Browser cache vs localStorage**: Different data sources out of sync
2. **Service worker cache**: Old cached responses served
3. **API cache vs UI cache**: Backend and frontend caches mismatched
4. **Multiple tabs**: Different tabs showing different cached data

**Solutions**:

**Immediate Fixes**:
```javascript
// Clear all caches (in browser console)
// 1. Clear localStorage
localStorage.clear();

// 2. Clear service worker caches
caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))));

// 3. Unregister service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
});

// 4. Hard refresh
location.reload(true);
```

**Systematic Approach**:
1. **Check cache timestamps**: Look for stale data indicators
2. **Force refresh**: Use app's refresh button to bypass cache
3. **Clear specific caches**: Target the problematic cache layer
4. **Restart browser**: Reset all cache states

### Dual Data Architecture Inconsistency
**Problem**: App has two different data systems running in parallel, causing confusion and performance issues.

**Root Cause**: Historical evolution where:
1. **Enhanced Bus Store** - Legacy system for favorite buses (only stores vehicles)
2. **Modern Data Hooks** - New system for nearby view (stations, routes, vehicles, stopTimes)

**Current Issues**:
- Duplicate API calls for vehicle data
- Inconsistent caching between systems  
- Developers unsure which system to use
- Performance overhead from redundant data fetching

**Components Affected**:
- `StationDisplay` uses both systems (enhanced store for refresh, hooks for data)
- `BusDisplay` uses enhanced store only
- `NearbyViewController` uses modern hooks only
- Debug tools had to be fixed to use correct data sources

**Recommended Solution**: Consolidate to single data architecture by either:
1. Extending enhanced bus store to include all data types, OR
2. Migrating all components to use modern data hooks

**Migration Plan**: 
1. ✅ **Phase 1**: Debug tools migrated to modern hooks
2. 🔄 **Phase 2**: Create `useModernRefreshSystem` hook (replaces enhanced store functionality)
3. 🔄 **Phase 3**: Migrate `StationDisplay`, `BusDisplay`, `RefreshControl` components
4. 🔄 **Phase 4**: Update app initialization and refresh system
5. 🔄 **Phase 5**: Remove enhanced bus store entirely

**Current Status**: Phase 1 complete - debug tools now use modern data hooks.

## 🚀 Performance Issues

### Slow Loading
**Problem**: App takes long time to load or becomes unresponsive

**Common Causes & Solutions**:

**Network-Related**:
1. **Check network speed**: App fetches data from multiple sources
   - **Solution**: Use WiFi instead of mobile data
   - **Solution**: Increase refresh intervals to reduce network load

2. **API response times**: Tranzy API may be slow
   - **Solution**: Check API status at tranzy.ai
   - **Solution**: Use cached data when available

3. **Multiple simultaneous requests**: Too many API calls at once
   - **Solution**: Implement request queuing
   - **Solution**: Use batch API calls where possible

**Browser-Related**:
1. **Clear browser cache**: Old data might be causing conflicts
   - **Solution**: DevTools → Application → Clear site data
   - **Solution**: Hard refresh (Ctrl+Shift+R)

2. **Disable auto-refresh**: Reduces background network activity
   - **Solution**: Go to Settings → Set refresh to manual
   - **Solution**: Increase refresh interval to 60+ seconds

3. **Close unused tabs**: Free up browser memory
   - **Solution**: Close other browser tabs
   - **Solution**: Restart browser if memory usage is high

**App-Specific**:
1. **Large datasets**: Too much data being processed
   - **Solution**: Check if filtering is working correctly
   - **Solution**: Limit number of vehicles/stations displayed

2. **Memory leaks**: JavaScript memory not being freed
   - **Solution**: Check DevTools → Memory tab
   - **Solution**: Restart browser tab

### High Battery Usage
**Problem**: App drains device battery quickly

**Root Causes**:
1. **Frequent GPS requests**: Continuous location updates
2. **Auto-refresh**: Regular API calls in background
3. **Screen always on**: App prevents device sleep
4. **Network activity**: Constant data fetching

**Solutions**:

**Immediate Actions**:
1. **Turn off auto-refresh** when not actively using
   - Go to Settings → Set refresh to manual
   - Only refresh when you need current data

2. **Disable location services** when not needed
   - Use manual location instead of GPS
   - Set home/work locations as defaults

3. **Close app when not in use**
   - Don't leave app running in background
   - Use browser's tab management

**Configuration Changes**:
1. **Increase refresh intervals**:
   - Set to 60+ seconds instead of 30 seconds
   - Use manual refresh for immediate updates

2. **Enable battery saver mode**:
   - Most browsers have battery optimization
   - Reduces background activity automatically

3. **Use airplane mode** when not needed:
   - Turn off all network activity
   - App will use cached data

### Memory Usage Issues
**Problem**: App uses too much RAM or causes browser crashes

**Symptoms**:
- Browser becomes slow or unresponsive
- Other tabs start crashing
- Device becomes hot
- "Out of memory" errors in console

**Debugging Steps**:

**Check Memory Usage**:
1. **Chrome DevTools**: Performance → Memory tab
2. **Task Manager**: Chrome → More tools → Task Manager
3. **Browser stats**: Look for memory warnings in console

**Common Memory Leaks**:
1. **Event listeners**: Not properly removed
2. **Timers**: setInterval/setTimeout not cleared
3. **Large objects**: Cached data not garbage collected
4. **DOM references**: Detached DOM nodes

**Solutions**:

**Immediate Relief**:
```javascript
// Force garbage collection (Chrome DevTools Console)
// 1. Go to DevTools → Performance → Collect garbage
// 2. Or restart the browser tab
location.reload();
```

**Configuration Changes**:
1. **Reduce cache size**: Lower cache limits in settings
2. **Disable auto-refresh**: Reduces background processing
3. **Limit data retention**: Clear old cached data regularly

**Prevention**:
1. **Regular browser restarts**: Close and reopen browser daily
2. **Monitor memory usage**: Check DevTools periodically
3. **Update browser**: Ensure latest version for memory optimizations

## 🔄 Service Worker & Update Issues

### App Shows Old Content After Deployment
**Problem**: After deploying a new version, users see old content, blue screen, or broken display

**Root Cause**: Service worker caching strategy issues and version management problems

**Comprehensive Solution (December 2024)**:

**1. Immediate Fix for Users**:
```bash
# Force complete cache clear (for developers)
# In browser DevTools Console:
caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).then(() => location.reload())

# Or manually:
# 1. Open DevTools (F12)
# 2. Go to Application tab
# 3. Click "Storage" in left sidebar
# 4. Click "Clear site data"
# 5. Refresh page (Cmd+R / Ctrl+R)
```

**2. For Developers - Proper Deployment Process**:
```bash
# CRITICAL: Always run version update before deployment
node scripts/update-version.js    # Updates SW version and HTML meta tag
npm run build                     # Build with new version
# Deploy to production
```

**3. Root Cause Analysis**:

The issue stems from multiple service worker problems:

**Problem A: Service Worker Cache Strategy**
- Service worker uses cache-first strategy for static assets
- Old cached content served even when new version deployed
- `skipWaiting()` and `clients.claim()` not working effectively

**Problem B: Version Management**
- Version only updated in SW and HTML meta tag
- No mechanism to force cache invalidation on version mismatch
- Update detection relies on SW update events that may not fire

**Problem C: Update Notification System**
- Update detection depends on SW `updatefound` event
- Event may not fire if SW doesn't detect changes
- Manual "check for updates" doesn't force cache clear

**4. Technical Solutions Applied**:

**Enhanced Service Worker Strategy**:
- Modified SW to use network-first in development
- Added aggressive cache clearing on version mismatch
- Improved `skipWaiting()` and `clients.claim()` implementation

**Better Version Detection**:
- Added version comparison between SW and HTML meta tag
- Force cache clear when versions don't match
- Enhanced update notification system

**Improved Update Process**:
- "Check for updates" now forces cache clear
- Better error handling for update failures
- More reliable update detection

**5. Prevention Strategies**:

**For Developers**:
- Always run `node scripts/update-version.js` before deployment
- Test update process in production-like environment
- Verify version numbers match across SW, HTML, and package.json

**For Users**:
- Use "Check for updates" in Settings when issues occur
- Clear browser cache if problems persist
- Refresh page after seeing update notification

**6. Debug Information**:

Check browser console for these messages:
```
✅ Service Worker updated to version: 2025-12-16-1430
✅ All caches cleared
✅ Service Worker activated, claiming clients...
```

If you see errors like:
```
❌ Failed to check for updates
❌ Service Worker registration failed
```

This indicates a deeper service worker issue requiring manual cache clear.

**7. Emergency Recovery**:

If app is completely broken:
```bash
# Complete reset (in browser console)
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
}).then(() => {
  caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
}).then(() => location.reload())
```

**8. Monitoring & Verification**:

After deployment, verify:
- Version number in Settings matches deployment
- No console errors related to service worker
- App content reflects latest changes
- Update notification system works

### Service Worker Registration Issues
**Problem**: Service worker fails to register or update

**Common Error Messages**:
- `Failed to register service worker`
- `Service worker registration failed`
- `Update check failed`

**Debugging Steps**:

**Check Service Worker Status**:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered service workers:', registrations.length);
  registrations.forEach((reg, i) => {
    console.log(`SW ${i}:`, reg.scope, reg.active?.state);
  });
});
```

**Check for Errors**:
1. **DevTools → Application → Service Workers**: Look for error messages
2. **Console tab**: Check for SW-related errors
3. **Network tab**: Verify SW file loads correctly

**Common Solutions**:

**Registration Failures**:
1. **HTTPS requirement**: Ensure site uses HTTPS (or localhost)
2. **SW file path**: Verify service worker file exists and is accessible
3. **Syntax errors**: Check service worker JavaScript for errors
4. **Scope issues**: Ensure SW scope covers the app

**Update Failures**:
1. **Browser cache**: Clear browser cache and try again
2. **SW cache**: Unregister and re-register service worker
3. **Version mismatch**: Ensure SW version is updated
4. **Network issues**: Check if SW file can be downloaded

**Manual Recovery**:
```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  return Promise.all(registrations.map(reg => reg.unregister()));
}).then(() => {
  console.log('All service workers unregistered');
  location.reload();
});
```

## 📊 Performance Monitoring

### Performance Metrics
**Key Metrics to Monitor**:

**Loading Performance**:
- **First Contentful Paint (FCP)**: < 2 seconds
- **Largest Contentful Paint (LCP)**: < 4 seconds
- **Time to Interactive (TTI)**: < 5 seconds

**Runtime Performance**:
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Memory usage**: < 50MB for typical usage

**Network Performance**:
- **API response times**: < 2 seconds
- **Cache hit ratio**: > 80%
- **Failed requests**: < 5%

### Performance Testing Tools

**Browser DevTools**:
1. **Lighthouse**: Automated performance audit
2. **Performance tab**: Detailed performance profiling
3. **Network tab**: Monitor API calls and timing
4. **Memory tab**: Check for memory leaks

**Performance Commands**:
```bash
# Build performance check
npm run build
# Check bundle size and optimization

# Run performance tests (included in main test suite)
npm test
# Check for performance test results in output

# Lighthouse CLI (if installed)
lighthouse http://localhost:5175 --output html
```

**Performance Optimization Checklist**:
- ✅ Enable service worker caching
- ✅ Optimize image sizes and formats
- ✅ Minimize JavaScript bundle size
- ✅ Use efficient API caching strategy
- ✅ Implement proper loading states
- ✅ Avoid memory leaks in React components
- ✅ Use React.memo for expensive components
- ✅ Implement virtual scrolling for large lists

### Cache Performance Optimization

**Cache Strategy Best Practices**:

**API Caching**:
1. **Cache frequently accessed data**: Stations, routes, agency info
2. **Short TTL for live data**: Vehicles (30 seconds)
3. **Long TTL for static data**: Routes, stops (1 hour)
4. **Intelligent invalidation**: Clear cache when data changes

**Browser Caching**:
1. **Service worker**: Cache static assets aggressively
2. **localStorage**: Cache user preferences and configuration
3. **Memory cache**: Cache processed data for current session
4. **Network cache**: Use HTTP cache headers appropriately

**Cache Monitoring**:
```javascript
// Check cache performance (in console)
// 1. Cache hit/miss ratios
console.log('Cache stats:', localStorage.getItem('cache-stats'));

// 2. Cache sizes
Object.keys(localStorage).forEach(key => {
  const size = localStorage.getItem(key)?.length || 0;
  if (size > 1000) console.log(`${key}: ${(size/1024).toFixed(1)}KB`);
});

// 3. Service worker cache
caches.keys().then(names => {
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        console.log(`Cache ${name}: ${keys.length} entries`);
      });
    });
  });
});
```

---

**Performance Optimization Summary**:
- Monitor key performance metrics regularly
- Use appropriate caching strategies for different data types
- Clear caches when experiencing issues
- Test performance on actual mobile devices
- Keep service worker and app versions synchronized
- Implement proper error handling for cache failures