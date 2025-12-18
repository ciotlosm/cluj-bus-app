# 🛠️ Development Tools

Consolidated development utilities for the Cluj Bus App. This directory contains all debug tools, test scripts, and archived code organized for easy access without interfering with production builds.

## 📁 Directory Structure

```
dev-tools/
├── debug/                    # Debug utilities and diagnostic tools
│   ├── browser/             # Browser-based debug scripts and HTML tools
│   ├── components/          # React debug components (TypeScript)
│   ├── hooks/               # Debug hooks for development
│   ├── utils/               # Debug utility functions
│   ├── scripts/             # Node.js debug scripts
│   └── README.md
├── test/                    # Test scripts and verification tools
│   ├── api/                 # API testing scripts
│   ├── integration/         # Integration test scripts
│   ├── routes/              # Route-specific test scripts
│   ├── schedule/            # Schedule testing tools
│   └── README.md
├── archive/                 # Historical code and migration files
│   └── README.md
└── README.md               # This file
```

## 🚀 Quick Start

### Debug Store Data
```bash
npm run debug:config        # Check app configuration
npm run debug:favorites     # Test favorites system
npm run debug:nearby        # Open nearby view debugger
```

### Test API Integration
```bash
npm run test:api           # Test API connectivity
npm run test:routes        # Test route data
```

### Access Debug Components
```typescript
// Temporarily add to any component during development
import { DebugPanel } from '../../dev-tools/debug/components/DebugPanel'

// Use in development only
{process.env.NODE_ENV === 'development' && <DebugPanel />}
```

## 🔧 Build Safety

This directory is **excluded from production builds**:
- TypeScript compilation skips `dev-tools/`
- Vite build process ignores this directory
- No impact on bundle size or performance

## 📋 Available Tools

### Debug Tools
- **Store inspection** - View current state of all Zustand stores
- **API monitoring** - Track API calls and responses
- **Component debugging** - Debug specific features like nearby view
- **Configuration validation** - Verify app settings and API keys

### Test Scripts
- **API testing** - Verify Tranzy API integration
- **Route testing** - Test specific routes and schedules
- **Integration testing** - End-to-end functionality verification
- **Performance testing** - Monitor app performance metrics

### Archive
- **Legacy implementations** - Historical code for reference
- **Migration tools** - Infrastructure used for major refactoring
- **Benchmark data** - Performance comparison data

## 🎯 Usage Guidelines

1. **Development only** - These tools are for development and debugging
2. **No production imports** - Don't import dev-tools in production code
3. **Temporary usage** - Debug components should be removed before commits
4. **Documentation** - Update README files when adding new tools

## 🔍 Common Debugging Workflows

### Store Data Issues
1. Run `npm run debug:config` to check configuration
2. Use browser debug tools to inspect store state
3. Add temporary debug components to problematic areas

### API Problems
1. Run `npm run test:api` to verify connectivity
2. Check browser network tab for failed requests
3. Use API debug tools to monitor request/response flow

### Performance Issues
1. Use browser performance tools
2. Run integration tests to identify bottlenecks
3. Compare with archived benchmark data

---

*All tools in this directory are development utilities and do not affect the production application.*