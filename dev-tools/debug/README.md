# 🔍 Debug Tools

Debug utilities for troubleshooting and development.

## 📁 Structure

- **`browser/`** - Browser-based debug scripts and HTML tools
- **`components/`** - React debug components (TypeScript)
- **`hooks/`** - Debug hooks for development
- **`utils/`** - Debug utility functions
- **`scripts/`** - Node.js debug scripts

## 🚀 Quick Access

```bash
# Debug configuration
npm run debug:config

# Debug favorites system
npm run debug:favorites

# Open browser debug tools
npm run debug:nearby
```

## 🔧 Usage

### Browser Debug Tools
Open HTML files directly in browser or use npm scripts:
- `debug-nearby-view.js` - Debug nearby view data flow
- `test-modern-refresh.js` - Test modern refresh system
- `check-api-status.html` - Interactive API status checker
- `check-config.html` - Configuration validation tool

### Debug Components
Temporarily import into development builds:
```typescript
import { DebugPanel } from '../../../dev-tools/debug/components/DebugPanel'

// Use only in development
{process.env.NODE_ENV === 'development' && <DebugPanel />}
```

### Node.js Scripts
Run from project root:
```bash
node dev-tools/debug/scripts/debug-config.js
node dev-tools/debug/scripts/debug-favorites.js
```