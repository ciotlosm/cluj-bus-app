# Cluj Bus App - Developer Guide

## 🚨 **CRITICAL: Deployment Policy**

### **NEVER Deploy to Production Automatically**

**❌ FORBIDDEN**: `netlify deploy --prod` without explicit request  
**✅ REQUIRED**: Wait for specific "deploy to prod" instruction

#### Workflow:
1. Make changes and test locally (`npm run build`)
2. Commit and push to repository (`git commit && git push`)
3. **STOP** - Do not deploy to production
4. Wait for explicit deployment request
5. Only then run `netlify deploy --prod`

This ensures all changes are reviewed before going live to users.

---

## 🏗️ Architecture Overview

### Tech Stack
- **React 19.2.0** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Material-UI 7.3.6** for component library
- **Zustand 5.0.9** for lightweight state management
- **Tailwind CSS 4.1.18** for utility-first styling
- **Leaflet + React-Leaflet** for map functionality

### Project Structure
```
src/
├── components/          # React components
│   ├── features/       # Business logic components
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
├── services/           # API services and business logic
├── stores/             # Zustand state management
├── hooks/              # Custom React hooks
├── utils/              # Pure utility functions
├── types/              # TypeScript definitions
└── theme/              # Material-UI theme
```

## 🔌 API Integration

### Data Sources (Priority Order)
1. **🔴 Live Vehicle Data** - Real-time GPS from Tranzy API
2. **📋 Official CTP Cluj Schedules** - Runtime fetched from ctpcj.ro
3. **⏱️ API Fallback Data** - Tranzy schedule data when available

### Proxy Configuration
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/tranzy': {
        target: 'https://api.tranzy.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tranzy/, ''),
      },
      '/api/ctp-cluj': {
        target: 'https://ctpcj.ro',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ctp-cluj/, ''),
      },
    },
  },
});
```

### Route Mapping
**Critical**: Route IDs vs Route Labels
- **Tranzy API Route ID**: "40"
- **CTP Cluj Route Label**: "42"
- **User sees**: Route 42
- **Code uses**: ID 40 for API calls, Label 42 for CTP Cluj schedules

## 🏪 State Management

### Zustand Stores

#### Enhanced Bus Store (`src/stores/enhancedBusStore.ts`)
```typescript
interface EnhancedBusStore {
  routes: Route[];
  vehicles: Vehicle[];
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchRoutes: () => Promise<void>;
  fetchVehicles: (routeId: string) => Promise<void>;
  fetchSchedules: (routeId: string) => Promise<void>;
}
```

#### Config Store (`src/stores/configStore.ts`)
```typescript
interface ConfigStore {
  apiKey: string;
  homeLocation: Location | null;
  workLocation: Location | null;
  favoriteRoutes: string[];
  
  // Actions
  setApiKey: (key: string) => void;
  addFavoriteRoute: (routeId: string) => void;
}
```

## 🧙‍♂️ Setup Flow

### Initial Setup Wizard (`src/components/features/Setup/SetupWizard.tsx`)
Two-step wizard for first-time configuration:

```typescript
// Step 1: API Key validation
const validateApiKey = async (key: string): Promise<boolean> => {
  const isValid = await validateAndFetchAgencies(key.trim());
  // Automatically fetches available cities/agencies
  return isValid;
};

// Step 2: City Selection (one-time)
const handleComplete = async () => {
  await updateConfig({
    apiKey: apiKey.trim(),
    city: selectedCity.value,
    agencyId: selectedCity.agencyId, // Stored permanently
  });
};
```

### Configuration Storage
- **API Key**: Stored in config, can be changed in Settings > API Keys tab
- **City/Agency**: Set once during setup, stored permanently in localStorage
- **Other settings**: Configurable in main Settings tab

## 🔧 Key Services

### Favorite Bus Service (`src/services/favoriteBusService.ts`)
Main business logic for route scheduling:

```typescript
class FavoriteBusService {
  // Get next departures with multiple data sources
  async getNextDepartures(routeId: string, stationId: string): Promise<Departure[]> {
    // 1. Try live vehicle data
    const liveData = await this.getLiveVehicleData(routeId);
    
    // 2. Try official CTP Cluj schedules
    const officialData = await this.getOfficialSchedule(routeId, stationId);
    
    // 3. Fallback to API schedule data
    const fallbackData = await this.getAPISchedule(routeId, stationId);
    
    return this.mergeAndPrioritize([liveData, officialData, fallbackData]);
  }
}
```

### CTP Cluj Schedule Service (`src/services/ctpClujScheduleService.ts`)
Fetches official schedules from CTP Cluj website:

```typescript
class CTPClujScheduleService {
  async getNextDeparture(routeSlug: string, stationId: string, currentTime: Date) {
    // Fetch route page via proxy
    const response = await fetch(`/api/ctp-cluj/orare/orar_linia.php?linia=${routeSlug}`);
    
    // Extract schedule data
    const schedule = await this.parseScheduleFromHTML(response);
    
    // Return next departure with confidence indicator
    return {
      time: nextDeparture,
      confidence: 'official' as const
    };
  }
}
```

### Enhanced Tranzy API (`src/services/enhancedTranzyApi.ts`)
Handles all Tranzy API interactions:

```typescript
class EnhancedTranzyAPI {
  async getVehicles(routeId: string): Promise<Vehicle[]> {
    const response = await fetch(`/api/tranzy/vehicles?route=${routeId}`);
    return response.json();
  }
  
  async getRoutes(): Promise<Route[]> {
    const response = await fetch('/api/tranzy/routes');
    return response.json();
  }
}
```

## 🧪 Testing Strategy

### Test Structure
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API interactions and data flow
- **Component Tests**: React component behavior
- **E2E Tests**: Critical user flows

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # Visual test runner
npm run test:coverage # Coverage report
```

### Test Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

## 🔄 Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Run tests in parallel
npm run test:watch

# Check code quality
npm run lint
```

### Code Quality
- **ESLint** for code quality
- **TypeScript** for type safety
- **Prettier** for formatting (via ESLint)
- **Vitest** for testing

### Build Process
```bash
# Production build
npm run build

# Preview build locally
npm run preview

# Analyze bundle
npm run build -- --analyze
```

## 🚀 Deployment

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          maps: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
});
```

### Performance Optimizations
- **Code splitting** with manual chunks
- **Tree shaking** for smaller bundles
- **Service worker** for offline functionality
- **React deduplication** in Vite config

## 🐛 Debugging

### Debug Tools
Located in `tools/debug/`:
- `debug-config.js` - Configuration debugging
- `debug-favorites.js` - Favorites system debugging
- `debug-schedule-issue.js` - Schedule service debugging
- `check-config.html` - Configuration validation

### Common Debug Scenarios

#### Route Mapping Issues
```typescript
// Check route ID vs label mapping
const routeDetails = allRoutes.find(route => route.id === routeId);
const routeLabel = routeDetails?.shortName || routeId;
console.log(`Route ID: ${routeId}, Label: ${routeLabel}`);
```

#### API Proxy Issues
```bash
# Check proxy logs in terminal
# Look for "Proxying request" messages
# Verify target URLs and response codes
```

#### Schedule Data Issues
```typescript
// Enable debug logging
localStorage.setItem('debug', 'schedule:*');
// Check browser console for detailed logs
```

## 📊 Performance Monitoring

### Key Metrics
- **Bundle size**: < 1MB gzipped
- **First load**: < 2 seconds
- **Test coverage**: > 90%
- **TypeScript coverage**: 100%

### Optimization Techniques
- **Lazy loading** for non-critical components
- **React.memo** for expensive components
- **useCallback/useMemo** for performance
- **Service worker caching** for offline support

## 🔧 Configuration

### Environment Variables
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:5175/api
VITE_DEBUG_MODE=true
```

### Build Targets
- **Development**: Fast builds, source maps, HMR
- **Production**: Optimized bundles, minification, tree shaking
- **Preview**: Production build with local server

## 📝 Code Conventions

### Component Naming
- **Material Components**: Prefix with `Material` (e.g., `MaterialButton`)
- **Feature Components**: Descriptive names (e.g., `IntelligentBusDisplay`)
- **File Names**: PascalCase matching component name

### Import Organization
```typescript
// External libraries
import React from 'react';
import { Button } from '@mui/material';

// Internal imports (relative paths)
import { useConfigStore } from '../stores';
import { logger } from '../utils/logger';
```

### Error Handling
```typescript
// Consistent error types
interface APIError {
  type: 'network' | 'parsing' | 'authentication' | 'partial';
  message: string;
  details?: unknown;
}
```

## 🔄 Version Management

### Updating Versions
```bash
# Update app version for major changes
node scripts/update-version.js    # Updates timestamp-based version
npm version patch                 # Updates semantic version

# For different types of changes
npm version patch    # Bug fixes (1.0.0 → 1.0.1)
npm version minor    # New features (1.0.0 → 1.1.0)
npm version major    # Breaking changes (1.0.0 → 2.0.0)
```

### Version Display
- Version shown in app footer via MaterialVersionControl component
- Helps users and developers track which version is running
- Essential for debugging and support

---

**Need help with a specific technical issue?** Check the [troubleshooting guide](troubleshooting.md) or examine the debug tools in `tools/debug/`.