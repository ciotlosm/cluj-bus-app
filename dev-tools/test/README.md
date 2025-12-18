# 🧪 Test Scripts

Standalone test scripts for API verification and integration testing.

## 📁 Structure

- **`api/`** - API connectivity and authentication tests
- **`integration/`** - End-to-end functionality tests
- **`routes/`** - Route-specific data tests
- **`schedule/`** - Schedule data and pattern tests

## 🚀 Quick Access

```bash
# Test API connectivity
npm run test:api

# Test route data
npm run test:routes

# Test schedule integration
npm run test:schedule
```

## 🔧 Categories

### API Tests (`api/`)
- `test-api-linking.js` - Basic API connectivity
- `test-tranzy-api.js` - Tranzy API integration
- `test-ctp-cluj-proxy.js` - Proxy functionality
- `test-current-config.js` - Configuration validation

### Integration Tests (`integration/`)
- `test-app-functionality.js` - Core app features
- `test-app-integration.js` - Component integration
- `test-final-verification.js` - Complete system check

### Route Tests (`routes/`)
- `test-route-42-schedule.js` - Route 42 specific tests
- `test-route-data.js` - General route data
- `test-route-mapping.js` - Route ID/label mapping

### Schedule Tests (`schedule/`)
- `test-schedule-pattern.js` - Schedule generation patterns
- `test-schedule-browser.html` - Browser-based schedule testing
- `test-official-schedule-integration.js` - Official schedule data

## 📋 Usage

Run individual scripts from project root:
```bash
node dev-tools/test/api/test-api-linking.js
node dev-tools/test/routes/test-route-42-schedule.js
```

Open browser tests:
```bash
open dev-tools/test/schedule/test-schedule-browser.html
```