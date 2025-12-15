# Cluj Bus App - Project Structure

## 📁 Directory Overview

```
cluj-bus/
├── 📂 src/                          # Source code
│   ├── 📂 components/               # React components
│   ├── 📂 hooks/                    # Custom React hooks
│   ├── 📂 services/                 # API services and business logic
│   ├── 📂 stores/                   # Zustand state management
│   ├── 📂 types/                    # TypeScript type definitions
│   └── 📂 utils/                    # Utility functions
├── 📂 public/                       # Static assets
├── 📂 docs/                         # Documentation
│   ├── 📂 implementation/           # Implementation guides and summaries
│   └── 📂 troubleshooting/          # Bug fixes and troubleshooting
├── 📂 tools/                        # Development tools
│   ├── 📂 debug/                    # Debug scripts and utilities
│   └── 📂 test/                     # Test scripts and verification tools
├── 📄 README.md                     # Main project documentation
├── 📄 SETUP_GUIDE.md               # Setup and installation guide
└── ⚙️  Configuration files          # Vite, TypeScript, ESLint, etc.
```

## 🎯 Key Files

### Core Application
- `src/main.tsx` - Application entry point
- `src/App.tsx` - Main application component
- `index.html` - HTML template

### Configuration
- `vite.config.ts` - Vite build configuration (includes proxy setup)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration

### Services (Business Logic)
- `src/services/favoriteBusService.ts` - Main bus schedule logic
- `src/services/ctpClujScheduleService.ts` - CTP Cluj official schedules
- `src/services/enhancedTranzyApi.ts` - Tranzy API integration
- `src/services/agencyService.ts` - Transit agency management

### State Management
- `src/stores/enhancedBusStore.ts` - Main application state
- `src/stores/configStore.ts` - User configuration
- `src/stores/locationStore.ts` - GPS location management

## 📚 Documentation Structure

### `/docs/implementation/`
Contains detailed implementation guides and feature summaries:
- Implementation summaries for major features
- Integration guides for external services
- Technical architecture documentation

### `/docs/troubleshooting/`
Contains bug fixes and troubleshooting information:
- Error fix summaries
- Runtime issue resolutions
- Test failure solutions

## 🛠️ Development Tools

### `/tools/debug/`
Debug utilities for development:
- `debug-config.js` - Configuration debugging
- `debug-favorites.js` - Favorites system debugging
- `debug-schedule-issue.js` - Schedule service debugging
- `check-config.html` - Configuration validation tool

### `/tools/test/`
Test scripts and verification tools:
- API integration tests
- Schedule verification scripts
- Proxy functionality tests
- Route mapping validation

## 🚀 Getting Started

1. **Setup**: See `SETUP_GUIDE.md` for installation instructions
2. **Development**: Run `npm run dev` to start development server
3. **Testing**: Run `npm test` to execute test suite
4. **Documentation**: Check `/docs/` for detailed guides

## 🔧 Key Features

### CTP Cluj Integration
- **Proxy Setup**: `/api/ctp-cluj` → `https://ctpcj.ro`
- **Schedule Service**: `src/services/ctpClujScheduleService.ts`
- **Route Mapping**: Route Label "42" ↔ Route ID "40"

### Real-time Data
- **Live Vehicles**: Tranzy API integration
- **Official Schedules**: CTP Cluj website data
- **Fallback Data**: API schedule data when available

### User Interface
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: Auto-refresh system
- **Confidence Indicators**: 🔴 LIVE, 📋 OFFICIAL, ⏱️ ESTIMATED

## 📊 Data Flow

```
User Request → Enhanced Bus Store → Favorite Bus Service
                                         ↓
                              ┌─ Live Vehicle Data (Tranzy API)
                              ├─ Official Schedules (CTP Cluj)
                              └─ API Fallback Data
                                         ↓
                              Schedule Processing & Validation
                                         ↓
                              UI Display with Confidence Indicators
```

## 🎯 Architecture Principles

1. **Separation of Concerns**: Clear separation between UI, business logic, and data
2. **Error Resilience**: Graceful fallbacks and comprehensive error handling
3. **Real-time First**: Prioritize live data over static schedules
4. **User Experience**: Clear confidence indicators and reliable timing
5. **Maintainability**: Well-documented code and clear project structure