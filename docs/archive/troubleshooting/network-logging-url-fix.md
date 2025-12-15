# Network Logging URL Fix

**Date**: December 13, 2025  
**Issue**: Network logging showing "URL: unknown" instead of actual URL  
**Status**: ✅ RESOLVED

## Problem

Network request logging was showing "URL: unknown" in the performance summary:

```
[INFO] XHR Request Completed: 200 GET /api/tranzy/v1/opendata/vehicles
⏱️  Duration: 635.20ms | Status: 200 | URL: unknown
```

## Root Cause

The XHR logging in `logger.ts` was including the URL in the log message but not in the data object that gets used for the performance summary display.

## Technical Fix

### Before
```typescript
logger.info(`XHR Request Completed: ${xhr.status} ${method} ${url}`, {
  status: xhr.status,
  statusText: xhr.statusText,
  duration: `${duration.toFixed(2)}ms`,
  responseType: xhr.responseType
  // ❌ Missing: url property
}, 'NETWORK');
```

### After
```typescript
logger.info(`XHR Request Completed: ${xhr.status} ${method} ${url}`, {
  url: url, // ✅ Added: URL for performance summary
  status: xhr.status,
  statusText: xhr.statusText,
  duration: `${duration.toFixed(2)}ms`,
  responseType: xhr.responseType
}, 'NETWORK');
```

## Result

Network logging now shows the actual URL:

```
[INFO] XHR Request Completed: 200 GET /api/tranzy/v1/opendata/vehicles
⏱️  Duration: 635.20ms | Status: 200 | URL: /api/tranzy/v1/opendata/vehicles
```

## Files Modified

- `src/utils/logger.ts` - Added URL to both success and error XHR logging data objects

## Benefits

- **Better Debugging**: Immediately see which endpoint was called
- **Performance Monitoring**: Track response times per endpoint
- **Network Analysis**: Understand API usage patterns
- **Troubleshooting**: Quickly identify slow or failing endpoints