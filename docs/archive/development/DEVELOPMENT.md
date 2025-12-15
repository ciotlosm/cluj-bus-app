# 🛠️ Development Guide

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **Git** for version control

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd cluj-bus
npm install

# Start development server
npm run dev
```

## 📁 Project Architecture

### Core Directories
```
src/
├── components/          # React UI components
├── hooks/              # Custom React hooks
├── services/           # Business logic & API calls
├── stores/             # State management (Zustand)
├── types/              # TypeScript definitions
└── utils/              # Helper functions
```

### Key Services
- **`favoriteBusService.ts`** - Main business logic for bus schedules
- **`ctpClujScheduleService.ts`** - CTP Cluj official schedule integration
- **`enhancedTranzyApi.ts`** - Tranzy API wrapper with error handling
- **`agencyService.ts`** - Transit agency management

### State Management
- **`enhancedBusStore.ts`** - Main application state
- **`configStore.ts`** - User configuration and preferences
- **`locationStore.ts`** - GPS location and user position

## 🔧 Development Workflow

### Running the App
```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Testing
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Test specific file
npm test -- favoriteBusService.test.ts
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 🌐 API Integration

### Proxy Configuration
The app uses Vite proxy to handle CORS issues:

```typescript
// vite.config.ts
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
}
```

### API Services Structure
```typescript
// Example service pattern
class ApiService {
  private baseUrl = '/api/endpoint';
  
  async getData(): Promise<DataType> {
    try {
      const response = await fetch(`${this.baseUrl}/data`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('API call failed', { error });
      throw error;
    }
  }
}
```

## 🧪 Testing Strategy

### Test Structure
```
src/
├── services/
│   ├── favoriteBusService.ts
│   └── favoriteBusService.test.ts    # Unit tests
├── components/
│   ├── BusDisplay.tsx
│   └── BusDisplay.test.tsx           # Component tests
└── integration.test.ts               # Integration tests
```

### Testing Best Practices
1. **Unit Tests** - Test individual functions and methods
2. **Component Tests** - Test React component behavior
3. **Integration Tests** - Test service interactions
4. **Mock External APIs** - Use mocks for reliable testing

### Example Test
```typescript
describe('FavoriteBusService', () => {
  it('should get next departure time', async () => {
    const service = new FavoriteBusService();
    const result = await service.getNextDeparture('42', 'station-id');
    
    expect(result).toBeDefined();
    expect(result.time).toBeInstanceOf(Date);
    expect(result.confidence).toBe('official');
  });
});
```

## 🎨 UI Development

### Component Structure
```typescript
// Component template
interface ComponentProps {
  data: DataType;
  onAction?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ data, onAction }) => {
  const [state, setState] = useState();
  
  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  );
};
```

### Styling Guidelines
- **Tailwind CSS** for utility-first styling
- **Mobile-first** responsive design
- **Consistent spacing** using Tailwind scale
- **Accessible colors** and contrast ratios

### State Management
```typescript
// Zustand store pattern
interface StoreState {
  data: DataType[];
  isLoading: boolean;
  error: string | null;
}

interface StoreActions {
  fetchData: () => Promise<void>;
  clearError: () => void;
}

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  data: [],
  isLoading: false,
  error: null,
  
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiService.getData();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  clearError: () => set({ error: null }),
}));
```

## 🔍 Debugging

### Debug Tools
Located in `/tools/debug/`:
- **`debug-config.js`** - Validate configuration
- **`debug-favorites.js`** - Test favorites system
- **`debug-schedule-issue.js`** - Diagnose schedule problems

### Browser DevTools
1. **Network Tab** - Monitor API calls and proxy behavior
2. **Console** - Check for errors and debug logs
3. **Application Tab** - Inspect service worker and storage
4. **React DevTools** - Debug component state and props

### Logging
```typescript
import { logger } from '../utils/logger';

// Different log levels
logger.debug('Debug information', { data });
logger.info('General information', { context });
logger.warn('Warning message', { issue });
logger.error('Error occurred', { error });
```

## 🚀 Performance Optimization

### Code Splitting
```typescript
// Lazy load components
const LazyComponent = lazy(() => import('./LazyComponent'));

// Use with Suspense
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

### API Optimization
- **Caching** - Cache API responses to reduce requests
- **Debouncing** - Debounce user inputs to prevent spam
- **Error Boundaries** - Graceful error handling
- **Retry Logic** - Automatic retry for failed requests

### Bundle Optimization
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'vendor': ['zustand', 'axios'],
      },
    },
  },
}
```

## 📚 Documentation

### Code Documentation
- **JSDoc comments** for functions and classes
- **TypeScript interfaces** for data structures
- **README files** for complex modules
- **Inline comments** for complex logic

### API Documentation
- Document all service methods
- Include parameter types and return values
- Provide usage examples
- Document error conditions

## 🔧 Configuration Management

### Environment Variables
```typescript
// Use environment variables for configuration
const config = {
  apiKey: import.meta.env.VITE_API_KEY,
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  isDevelopment: import.meta.env.DEV,
};
```

### Configuration Files
- **`vite.config.ts`** - Build and development configuration
- **`tsconfig.json`** - TypeScript compiler options
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`eslint.config.js`** - Code linting rules

## 🚀 Deployment

### Build Process
```bash
# Create production build
npm run build

# Test production build locally
npm run preview
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Service worker configured
- [ ] Error monitoring setup
- [ ] Performance metrics enabled

### CI/CD Pipeline
1. **Lint and Test** - Ensure code quality
2. **Build** - Create production bundle
3. **Deploy** - Deploy to hosting platform
4. **Monitor** - Track performance and errors

## 🤝 Contributing

### Code Style
- Use **TypeScript** for type safety
- Follow **ESLint** configuration
- Use **Prettier** for code formatting
- Write **meaningful commit messages**

### Pull Request Process
1. Create feature branch from `main`
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass
5. Submit pull request with clear description

### Review Guidelines
- Code follows project conventions
- Tests cover new functionality
- Documentation is updated
- No breaking changes without discussion