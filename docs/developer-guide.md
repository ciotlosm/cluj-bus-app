# Developer Guide

## 🚨 Deployment Policy

**NEVER deploy to production automatically**
- Make changes and test locally
- Commit and push to repository  
- **WAIT** for explicit deployment request
- Only then run `netlify deploy --prod`

## Architecture Overview

### Tech Stack
- **React 19.2.0** with TypeScript
- **Vite** for build tooling
- **Material-UI 7.3.6** for components
- **Zustand 5.0.9** for state management
- **Tailwind CSS 4.1.18** for styling
- **Leaflet** for maps

### Project Structure
```
src/
├── components/     # React components
├── services/       # API services
├── stores/         # State management
├── hooks/          # Custom hooks
├── utils/          # Utilities
├── types/          # TypeScript types
└── theme/          # UI theme
```

## API Integration

### Tranzy API
- **Single source**: All data from Tranzy API
- **Authentication**: Use `enhancedTranzyApi` singleton
- **Endpoints**: `/api/tranzy/v1/opendata/*`

### Data Flow
1. **Setup**: API key configuration
2. **Fetch**: Real-time vehicle and station data
3. **Process**: Filter and transform data
4. **Display**: Show in UI components

## Development Commands

### Local Development
```bash
npm run dev          # Start dev server (port 5175)
npm run build        # Production build
npm run preview      # Preview build
```

### Testing
```bash
npm test             # Run tests once
npm run test:watch   # Watch mode
npm run test:ui      # Visual test runner
```

### Code Quality
```bash
npm run lint         # ESLint
```

## Key Components

### StationDisplay
- Shows buses at nearby stations
- Uses GPS or fallback location
- Filters by trip_id relationships

### FavoriteRoutesView  
- Shows user's favorite bus routes
- Configurable home/work directions
- Smart vehicle filtering

### Settings
- API key configuration
- Location preferences
- Favorite route management

## State Management

### Stores (Zustand)
- **configStore**: User configuration
- **vehicleStore**: Live vehicle data
- **locationStore**: GPS and fallback locations

### Data Hooks (Legacy - Being Migrated to Store-Based)
- **useStationData**: Station information (use useStationStoreData instead)
- **useRouteData**: Route definitions (use useRouteStoreData instead)

### Store-Based Data Hooks (Recommended)
- **useVehicleStoreData**: Live vehicle positions via store
- **useStationStoreData**: Station information via store
- **useRouteStoreData**: Route definitions via store
- **useStopTimesStoreData**: Stop times via store

## Common Patterns

### Error Handling
- Graceful degradation for API failures
- User-friendly error messages
- Fallback data when possible

### Performance
- React.memo for expensive components
- Intelligent caching with TTL
- Debounced API calls

### Testing
- Unit tests for utilities and hooks
- Integration tests for components
- Property-based testing with fast-check

## Debugging

### Debug Tools
- Visit `/debug.html` for API testing
- Browser console for error logs
- Network tab for API inspection

### Common Issues
- Authentication timing problems
- Location permission issues
- Cache inconsistencies

## Build & Deploy

### Production Build
```bash
npm run build        # Creates dist/ folder
npm run preview      # Test production build
```

### Netlify Deployment
```bash
# Preview deployment
netlify deploy

# Production deployment (ONLY when requested)
netlify deploy --prod
```

### Environment Variables
- `VITE_TRANZY_API_BASE_URL`: API base URL
- Production uses environment-specific configs

## Version Management

### Update Version
```bash
node scripts/update-version.js    # Update cache-busting version
npm version patch                 # Update package.json version
```

### When to Update
- Major features or improvements
- Bug fixes affecting users
- Performance optimizations
- Security updates