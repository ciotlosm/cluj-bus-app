# Performance & Caching Issues

## Storage Problems

### Storage Quota Exceeded
**Problem**: "QuotaExceededError: The quota has been exceeded"
**Solution**: Clear browser data or restart browser. Cache now auto-manages size.

### Cache Inconsistency
**Problem**: Different data in different tabs or after refresh
**Solution**: Clear all caches and restart browser

**Clear All Caches (Browser Console)**:
```javascript
// Clear localStorage
localStorage.clear();

// Clear service worker caches
caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))));

// Unregister service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
});
```

## Performance Issues

### Slow Loading
**Problem**: App takes long time to load or respond
**Solution**: Check network connection, clear cache, or restart browser

### Memory Issues
**Problem**: Browser becomes unresponsive or crashes
**Solution**: Close other tabs, restart browser, or reduce cache size

### JavaScript Heap Out of Memory (FIXED)
**Problem**: "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory"
**Solution**: This critical memory leak in useVehicleDisplay hook has been fixed (Dec 18, 2024). Update to latest version.

### Infinite Loops
**Problem**: Browser crashes with excessive logging
**Solution**: Check React useEffect dependencies and callback stability

## Service Worker Issues

### Stale Data
**Problem**: App shows old data despite refresh
**Solution**: Unregister service worker and hard refresh (Ctrl+Shift+R)

### Update Not Working
**Problem**: App doesn't update to new version
**Solution**: Clear service worker cache and reload

## Quick Fixes

### Hard Refresh
- **Chrome/Firefox**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Safari**: Cmd+Option+R

### Clear Site Data
1. Open browser settings
2. Find "Clear browsing data" or "Storage"
3. Select this site only
4. Clear all data types
5. Restart browser