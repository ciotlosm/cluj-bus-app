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
**CRITICAL: Update app version for all major changes including:**
- New features or significant improvements
- Bug fixes that affect user experience
- Performance optimizations
- API changes or integrations
- UI/UX improvements
- Security updates

### Version Update Process
1. **Update package.json version** using semantic versioning (semver)
2. **Run version update script** to sync across all files
3. **Test locally** to verify version appears correctly
4. **Deploy to production** with new version visible to users

### Commands
```bash
# For major changes (recommended workflow):
node scripts/update-version.js    # Updates timestamp-based version in SW and HTML
npm version patch                 # Updates semantic version in package.json

# Alternative semantic versioning:
npm version patch         # Bug fixes (1.0.0 → 1.0.1)
npm version minor         # New features (1.0.0 → 1.1.0)  
npm version major         # Breaking changes (1.0.0 → 2.0.0)
```

### AI Assistant Workflow
**When making major changes, always:**
1. Run `node scripts/update-version.js` to update cache-busting version
2. Update `package.json` version appropriately (patch/minor/major)
3. Mention version update in commit/summary

### Version Display
- Version shown in app footer via MaterialVersionControl component
- Helps users and developers track which version is running
- Essential for debugging and support