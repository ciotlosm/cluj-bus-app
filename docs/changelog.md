# Changelog

## Recent Updates

### December 2024 - Major Fixes & CTP Cluj Integration

#### ✅ Critical Issues Resolved
- **Fixed "No schedule data available" error** - Station name mismatch between CTP Cluj and Tranzy API resolved
- **Added CTP Cluj proxy** - Direct integration with official CTP Cluj schedules via `/api/ctp-cluj`
- **Fixed Route 42 timing** - Now correctly shows 15:45 departure from official CTP Cluj data
- **Resolved TypeError crashes** - Added input validation for time parsing functions
- **Fixed all test failures** - 271/271 tests now passing (100% success rate)

#### 🔧 Technical Improvements
- **Route mapping clarification** - Route ID "40" (Tranzy) ↔ Route Label "42" (CTP Cluj)
- **Removed pattern-based schedules** - Only real data sources now used
- **Enhanced error handling** - Graceful fallbacks for all edge cases
- **Improved proxy configuration** - Both Tranzy and CTP Cluj APIs working via proxy

#### 📊 Data Sources (Current Priority)
1. **🔴 Live Vehicle Data** - Real-time GPS tracking from Tranzy API
2. **📋 Official CTP Cluj Schedules** - Runtime fetched from ctpcj.ro website
3. **⏱️ API Fallback Data** - Tranzy schedule data when available

#### 🎯 User Experience
- **Route 42 fully functional** - Shows expected 15:45 departure time
- **Confidence indicators** - Clear labeling of data source reliability
- **Mobile optimization** - Responsive design for phone usage
- **Offline support** - Service worker for core functionality

### November 2024 - Foundation & Setup

#### 🏗️ Initial Architecture
- **React 19.2.0 + TypeScript** - Modern frontend stack
- **Vite build system** - Fast development and optimized builds
- **Material-UI 7.3.6** - Component library and theming
- **Zustand state management** - Lightweight and efficient
- **Tailwind CSS** - Utility-first styling approach

#### 🔌 API Integration
- **Tranzy API integration** - Live vehicle tracking and route data
- **Proxy configuration** - CORS handling for external APIs
- **Error handling** - Robust error boundaries and fallbacks

#### 🧪 Testing Setup
- **Vitest test framework** - Fast and reliable testing
- **Testing Library** - Component testing utilities
- **100% TypeScript coverage** - Type safety throughout

## Breaking Changes

### December 2024
- **Removed pattern-based schedules** - Apps relying on fake schedule data will need updates
- **Changed route mapping logic** - Now uses route labels for CTP Cluj integration

## Migration Guide

### From Pattern-Based to Real Data
If you were using the old pattern-based schedule system:

1. **Update API calls** - Use new service methods that fetch real data
2. **Handle confidence levels** - New system provides confidence indicators
3. **Test with real routes** - Verify your routes work with official CTP Cluj data

### Route Mapping Updates
If you were using route IDs directly:

```typescript
// OLD: Using route ID for everything
const routeId = "40";
const schedule = await getSchedule(routeId);

// NEW: Use appropriate identifier for each service
const routeId = "40"; // For Tranzy API
const routeLabel = "42"; // For CTP Cluj (user-facing)
const schedule = await getOfficialSchedule(routeLabel);
```

## Known Issues

### Current Limitations
- **Limited route coverage** - Not all CTP Cluj routes have live tracking
- **Schedule accuracy** - Official schedules may not reflect real-time delays
- **API rate limits** - Tranzy API has usage limitations

### Planned Improvements
- **Enhanced caching** - Better offline support and performance
- **More data sources** - Additional transit agencies beyond CTP Cluj
- **Push notifications** - Alerts for favorite routes
- **Route planning** - Multi-modal trip planning

## Technical Debt

### Addressed in December 2024
- ✅ **Test failures** - All 271 tests now passing
- ✅ **Error handling** - Comprehensive error boundaries added
- ✅ **Code organization** - Clear separation of concerns
- ✅ **Documentation** - Consolidated and human-friendly docs

### Still To Address
- **Bundle size optimization** - Could be smaller with better tree shaking
- **Performance monitoring** - Need better metrics and alerting
- **Accessibility** - Could improve screen reader support
- **Internationalization** - Currently only supports Romanian/English

## Version History

### v1.2.0 (December 2024)
- CTP Cluj integration
- Major bug fixes
- Test suite improvements
- Documentation overhaul

### v1.1.0 (November 2024)
- Material-UI upgrade
- Enhanced state management
- Mobile optimizations

### v1.0.0 (October 2024)
- Initial release
- Basic Tranzy API integration
- Core functionality

---

**Note**: This changelog focuses on user-facing changes and major technical improvements. For detailed technical changes, see the [developer guide](developer-guide.md).