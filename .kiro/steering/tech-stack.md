# Technical Stack

## Core Technologies
- **React 19.2.0** with TypeScript for type safety
- **Vite** as build tool with Rolldown optimization
- **Material-UI (MUI) 7.3.6** for component library and theming
- **Zustand 5.0.9** for lightweight state management
- **Tailwind CSS 4.1.18** for utility-first styling
- **Leaflet + React-Leaflet** for map functionality

## Testing & Quality
- **Vitest** for unit and integration testing
- **Testing Library** for component testing
- **ESLint + TypeScript ESLint** for code quality
- **Fast-check** for property-based testing

## API & Data
- **Axios** for HTTP requests
- **Tranzy API** for all transit data (live vehicles + schedules via proxy)
- **Service Worker** for offline functionality

## Build Configuration
- **Vite config** includes API proxies to avoid CORS
- **Code splitting** with manual chunks for vendors
- **Terser minification** for production builds
- **Source maps disabled** in production for performance

## API Proxy Configuration
Development server proxies API requests:
- `/api/tranzy` → `https://api.tranzy.ai` (single data source for all transit data)

## Performance Optimizations
- React deduplication in Vite config
- Manual chunk splitting for vendors
- HMR and WebSocket disabled for stability
- Dependency optimization for core libraries

## Version Management

### When to Update Version
Update app version for major changes: new features, bug fixes, performance optimizations, API changes, UI/UX improvements, security updates.

### Commands
```bash
node scripts/update-version.js    # Updates timestamp-based version
npm version patch                 # Updates semantic version (patch/minor/major)
```