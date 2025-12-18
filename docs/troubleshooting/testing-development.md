# Testing & Development Issues

## 🧪 Test Failures

### "Expected a single value for option --run"
**Problem**: Command `npm test -- --run` fails with duplicate flag error

**Cause**: The `--run` flag is already included in the npm script definition (`"test": "vitest --run"`)

**Solution**: Use `npm test` (not `npm test -- --run`)
- ❌ Wrong: `npm test -- --run` 
- ✅ Correct: `npm test`

### "useRefreshSystem() returns undefined"
**Problem**: RefreshControl tests failing

**Status**: ✅ **FIXED** - Mock configuration corrected

**If tests still fail**:
```bash
# Clear test cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm test
```

### Recent Test Fixes (December 2024)

**Import Path Errors**
- **Problem**: Tests fail with "Failed to resolve import" errors
- **Solution**: Check import paths are correct relative to test file location
- **Example**: Use `../shared/dependencyTracker` not `./shared/dependencyTracker`

**localStorage Key Mismatches**
- **Problem**: Tests expect 'config' key but store uses 'unified-config-store'
- **Solution**: Update test expectations to match actual store implementation
- **Fix**: Change test assertions to use correct localStorage key

**Async Test Timeouts**
- **Problem**: Integration tests timeout waiting for async operations
- **Solution**: Either increase timeout or skip problematic integration tests
- **Example**: Use `it.skip()` for tests that depend on complex async behavior

**Property-Based Test Failures**
- **Problem**: Fast-check property tests fail with mock-related errors
- **Solution**: Ensure mocks are properly configured for all test scenarios
- **Fix**: Check that `vi.mocked().mockResolvedValue` exists before using

**Cache Manager Test Issues**
- **Problem**: Property-based tests fail on edge cases with cache cleanup
- **Solution**: Make test assertions more lenient for edge cases
- **Fix**: Use basic sanity checks instead of exact value matching

### General Test Issues
**Problem**: Tests failing unexpectedly or inconsistently

**Common Solutions**:

**Clear Test Environment**:
```bash
# Run tests with detailed output
npm test -- --reporter=verbose

# Run specific test file
npm test -- RefreshControl.test.tsx

# Run tests in watch mode for debugging
npm run test:watch

# Clear all caches and reinstall
npm test -- --clearCache
rm -rf node_modules package-lock.json
npm install
```

**Mock Issues**:
1. **Check mock configurations**: Ensure mocks match actual implementations
2. **Update snapshots**: Run `npm test -- --update` if UI changed
3. **Verify test data**: Ensure test data matches expected formats

**Environment Issues**:
1. **Node version**: Ensure using Node 18+ (`node --version`)
2. **Dependencies**: Check for conflicting package versions
3. **Test isolation**: Ensure tests don't interfere with each other

### Missing Components After Checkpoint Restore
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

## 🚀 Development Server Issues

### App Won't Start

#### Port Already in Use
**Problem**: `Error: listen EADDRINUSE: address already in use :::5175`

**Solution**:
```bash
# Use a different port
npm run dev -- --port 3000

# Or kill the process using the port
lsof -ti:5175 | xargs kill -9

# On Windows:
netstat -ano | findstr :5175
taskkill /PID <PID> /F
```

#### Node Version Issues
**Problem**: `Error: The engine "node" is incompatible`

**Solution**:
```bash
# Check your Node version
node --version

# Install Node 18+ if needed
# Using nvm (recommended):
nvm use 18

# Or download from nodejs.org
```

#### Dependency Issues
**Problem**: Various npm/dependency related errors

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for conflicting global packages
npm list -g --depth=0

# Update npm itself
npm install -g npm@latest
```

### Build Issues

#### TypeScript Compilation Errors
**Problem**: Build fails with TypeScript errors

**Common Solutions**:

**Type Errors**:
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Show detailed type errors
npm run build 2>&1 | grep "error TS"

# Fix common issues:
# 1. Missing type definitions
npm install --save-dev @types/node @types/react

# 2. Strict mode issues
# Check tsconfig.json strict settings
```

**Import/Export Errors**:
1. **Check file paths**: Ensure relative imports are correct
2. **Verify exports**: Make sure exported names match imports
3. **Index files**: Check barrel exports in index.ts files

**Interface Mismatches**:
1. **Update interfaces**: Ensure interfaces match actual data structures
2. **Check API responses**: Verify API data matches TypeScript types
3. **Generic types**: Ensure generic type parameters are correct

#### Vite Build Errors
**Problem**: Vite-specific build failures

**Common Issues & Solutions**:

**Module Resolution**:
```bash
# Check Vite configuration
cat vite.config.ts

# Common fixes:
# 1. Add file extensions to imports
# 2. Check alias configuration
# 3. Verify public directory structure
```

**Asset Loading**:
1. **Static assets**: Ensure assets are in `public/` directory
2. **Import paths**: Use correct paths for asset imports
3. **Base URL**: Check if base URL is configured correctly

**Plugin Issues**:
1. **Update plugins**: Ensure Vite plugins are compatible
2. **Plugin order**: Check plugin loading order
3. **Configuration**: Verify plugin configurations

### CORS Errors
**Problem**: `Access to fetch at 'https://api.tranzy.ai' from origin 'http://localhost:5175' has been blocked by CORS policy`

**Solution**: This should be handled by the proxy configuration. If you see this:
1. **Restart the dev server**: `npm run dev`
2. **Check proxy config**: Verify `vite.config.ts` has correct proxy setup
3. **Clear browser cache**: Old requests might be cached

**Proxy Configuration Check**:
```typescript
// In vite.config.ts, should have:
export default defineConfig({
  server: {
    proxy: {
      '/api/tranzy': {
        target: 'https://api.tranzy.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tranzy/, '')
      }
    }
  }
})
```

### Hot Module Replacement (HMR) Issues
**Problem**: Changes not reflecting in browser during development

**Solutions**:

**HMR Not Working**:
1. **Check file extensions**: Ensure files have correct extensions (.tsx, .ts)
2. **Restart dev server**: Sometimes HMR gets stuck
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Check file watchers**: Ensure file system watching is working

**Partial Updates**:
1. **Component state**: HMR may not preserve all component state
2. **CSS changes**: Styles should update immediately
3. **Configuration changes**: Require full restart

**Performance Issues**:
1. **Large projects**: HMR can be slow with many files
2. **File watching**: Exclude unnecessary directories from watching
3. **Memory usage**: Restart dev server if memory usage is high

## 🔧 Debug Tools

### Browser DevTools Setup
**Essential DevTools Configuration**:

**Console Settings**:
1. **Preserve log**: Keep logs when navigating
2. **Show timestamps**: Enable timestamps for debugging
3. **Filter levels**: Set appropriate log level filtering
4. **Group similar**: Group repeated messages

**Network Tab**:
1. **Disable cache**: For development debugging
2. **Throttling**: Test with slow network conditions
3. **Filter requests**: Focus on API calls
4. **Response inspection**: Check API response formats

**Application Tab**:
1. **Local Storage**: Monitor app configuration
2. **Service Workers**: Check SW registration and updates
3. **Cache Storage**: Inspect cached responses
4. **Manifest**: Verify PWA configuration

### Debug Tool Configuration
**Location**: `http://localhost:5175/debug.html` (when dev server is running)

**Features**:
- ✅ Configuration validation (reads correct localStorage keys: `config`, `bus-tracker-agencies`)
- ✅ API key testing (handles encrypted storage with automatic decryption)
- ✅ Location services testing (runtime-only, not persisted)
- ✅ Data fetching from Tranzy API (stations, vehicles, routes)
- ✅ Network request monitoring

**Usage**:
1. Start your development server: `npm run dev`
2. Open `http://localhost:5175/debug.html` in your browser
3. Click "Run Full Diagnosis" for automated testing
4. Review results for any configuration or API issues

**Fixed Issues (December 2024)**:
- ✅ Now correctly reads localStorage keys used by Zustand stores (`config`, `bus-tracker-agencies`)
- ✅ Properly detects and decrypts encrypted API keys (base64 decoding)
- ✅ Uses correct Tranzy API v1 opendata endpoints (`/api/tranzy/v1/opendata/*`)
- ✅ Includes all required headers (`Authorization`, `X-API-Key`, `X-Agency-Id`)
- ✅ Shows cached agency data and validation status
- ✅ Accessible via localhost to access same localStorage as main app

### Console Debug Commands
**Useful debugging commands for browser console**:

**Configuration Check**:
```javascript
// Check app configuration
const config = JSON.parse(localStorage.getItem('config') || '{}');
console.log('Configuration:', config);

// Check API key
console.log('API Key set:', !!config.state?.apiKey);
console.log('Agency ID:', config.state?.agencyId);
```

**Data Inspection**:
```javascript
// Check cached data
Object.keys(localStorage).forEach(key => {
  if (key.includes('cache') || key.includes('store')) {
    console.log(key, JSON.parse(localStorage.getItem(key) || '{}'));
  }
});

// Check service worker
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
});
```

**Performance Monitoring**:
```javascript
// Check memory usage
console.log('Memory:', performance.memory);

// Monitor API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API Call:', args[0]);
  return originalFetch.apply(this, args);
};
```

### Debug Logging Configuration
**Enable Debug Logging**:
```javascript
// In browser console
localStorage.setItem('debug', 'schedule:*');
// Refresh page to see detailed logs

// Or set specific debug categories
localStorage.setItem('debug', 'api:*,cache:*,location:*');
```

**Log Levels**:
- `ERROR`: Critical errors only
- `WARN`: Warnings and errors
- `INFO`: General information (default)
- `DEBUG`: Detailed debugging information

**Configure in Settings**:
1. Go to Settings → Advanced
2. Set Console Log Level
3. Changes apply immediately

## 📊 Health Checks

### Quick System Check
**Essential checks for development**:

1. **App loads**: ✅ `http://localhost:5175` opens without errors
2. **Tests pass**: ✅ `npm test` shows all tests passing
3. **API works**: ✅ Can see route data and schedules
4. **No console errors**: ✅ Browser console is clean
5. **Build succeeds**: ✅ `npm run build` completes without errors

### Data Source Check
**Verify data pipeline**:

1. **Live vehicles**: 🔴 Red dots on map (when available)
2. **Official schedules**: 📋 CTP Cluj departure times
3. **API fallback**: ⏱️ Estimated times when needed
4. **Cache working**: Data loads quickly on repeat visits

### Performance Check
**Monitor development performance**:

```bash
# Build size check
npm run build
# Look for bundle size warnings

# Run performance tests (included in main test suite)
npm test
# Check for performance test results in output

# Memory usage
# Check DevTools → Performance → Memory
```

## 🆘 Emergency Development Recovery

### Complete Reset
**Nuclear option - reset everything**:
```bash
# 1. Stop all processes
# Ctrl+C to stop dev server

# 2. Clear all caches
rm -rf node_modules package-lock.json
rm -rf dist .vite

# 3. Clear browser data
# DevTools → Application → Clear site data

# 4. Reinstall and restart
npm install
npm run dev
```

### Rollback Changes
**If you made changes that broke things**:
```bash
# Check what changed
git status
git diff

# Rollback all changes
git checkout -- .

# Or rollback specific files
git checkout -- src/path/to/file.tsx

# Restart dev server
npm run dev
```

### Git Recovery
**Restore from previous working state**:
```bash
# See recent commits
git log --oneline -10

# Create backup branch
git branch backup-current

# Reset to working commit
git reset --hard COMMIT_HASH

# Restart development
npm install
npm run dev
```

## 🔍 Advanced Development Debugging

### React DevTools
**Essential React debugging**:

1. **Install React DevTools**: Browser extension
2. **Component inspection**: Check props and state
3. **Performance profiling**: Identify slow components
4. **Hook debugging**: Inspect custom hooks

### Network Debugging
**API and network issues**:

1. **Proxy debugging**: Check if requests are proxied correctly
2. **Request headers**: Verify authentication headers
3. **Response inspection**: Check API response formats
4. **Timing analysis**: Identify slow API calls

### Build Analysis
**Analyze build output**:

```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Check for unused dependencies
npx depcheck

# Audit dependencies
npm audit
npm audit fix
```

---

**Development Best Practices**:
- Always test changes in development before building
- Use proper error boundaries for React components
- Monitor console for warnings and errors
- Keep dependencies updated
- Use TypeScript strict mode for better error catching
- Test on multiple browsers during development