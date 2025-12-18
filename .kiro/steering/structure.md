# Cluj Bus App - Project Structure & Conventions

## Directory Organization

```
src/
├── components/           # React components (feature-based)
│   ├── features/        # Business logic components
│   ├── ui/              # Reusable UI components
│   └── layout/          # Layout and structural components
├── stores/              # Zustand state management
├── services/            # API services and business logic
├── hooks/               # Custom React hooks
├── utils/               # Pure utility functions
├── types/               # TypeScript type definitions
└── theme/               # Material-UI theme configuration
```

## Component Architecture

### Feature Components (`src/components/features/`)
- **Material Design First**: All components have `Material*` variants
- **Feature Folders**: Each feature has its own directory with index.ts
- **Sub-components**: Complex features have `components/` subdirectory
- **Examples**: `BusDisplay/`, `FavoriteBuses/`, `LocationPicker/`

### UI Components (`src/components/ui/`)
- **Reusable**: Generic components used across features
- **Material Wrappers**: Wrap MUI components with app-specific styling
- **Index Exports**: Each component folder exports via index.ts

### Component Naming
- **Material Components**: Prefix with `Material` (e.g., `MaterialButton`)
- **Feature Components**: Descriptive names (e.g., `IntelligentBusDisplay`)
- **File Names**: PascalCase matching component name

## State Management Patterns

### Zustand Stores (`src/stores/`)
- **Single Responsibility**: Each store handles one domain
- **Typed Interfaces**: All stores implement interfaces from `src/types/`
- **Persistence**: Use Zustand persist middleware for user data
- **Examples**: `configStore`, `busStore`, `locationStore`

### Store Conventions
- Export custom hook (e.g., `useConfigStore`)
- Include loading states and error handling
- Implement cleanup methods for subscriptions

## Service Layer (`src/services/`)

### API Services
- **Interface-Based**: All services implement TypeScript interfaces
- **Error Handling**: Consistent error types and retry logic
- **Caching**: Implement intelligent caching strategies
- **Proxy Aware**: Use `/api/` prefixes for proxied requests

### Service Patterns
- **Factory Functions**: Create service instances with configuration
- **Singleton Pattern**: Export configured instances
- **Dependency Injection**: Services can depend on other services

## File Naming Conventions

### Components
- **PascalCase**: `MaterialButton.tsx`, `IntelligentBusDisplay.tsx`
- **Test Files**: `ComponentName.test.tsx`
- **Index Files**: `index.ts` for barrel exports

### Services & Utilities
- **camelCase**: `favoriteBusService.ts`, `locationUtils.ts`
- **Test Files**: `serviceName.test.ts`

### Stores
- **camelCase**: `configStore.ts`, `busStore.ts`
- **Test Files**: `storeName.test.ts`

## Import/Export Patterns

### Barrel Exports
- Each major directory has `index.ts` for clean imports
- Re-export public APIs only
- Use named exports over default exports

### Import Organization
```typescript
// External libraries
import React from 'react';
import { Button } from '@mui/material';

// Internal imports (relative paths)
import { useConfigStore } from '../stores';
import { logger } from '../utils/logger';
```

## Error Handling Conventions

### Error Types
- **Network Errors**: API failures, timeouts
- **Parsing Errors**: Invalid data format
- **Authentication Errors**: Invalid API keys
- **Partial Errors**: Some data unavailable

### Error Boundaries
- Wrap major features in ErrorBoundary components
- Provide fallback UI and retry mechanisms
- Log errors with context for debugging

## Testing Conventions

### Test Organization
- **Co-located**: Test files next to source files
- **Integration Tests**: In `src/` root for cross-feature tests
- **Test Utilities**: In `src/test/` directory

### Test Patterns
- **Arrange-Act-Assert**: Clear test structure
- **Mock External Dependencies**: Use Vitest mocks for APIs
- **Test User Interactions**: Use Testing Library patterns

## Performance Guidelines

### Component Optimization
- **React.memo**: For expensive components
- **useCallback**: For event handlers passed to children
- **useMemo**: For expensive calculations

### Bundle Optimization
- **Code Splitting**: Lazy load non-critical features
- **Tree Shaking**: Use named imports
- **Vendor Chunks**: Separate vendor code in build

## Kiro Spec Task Format Requirements

### Task File Structure for Kiro IDE Integration

**CRITICAL: Tasks must follow this exact format for "Start task" buttons to appear in Kiro IDE**

#### ✅ Correct Format:
```markdown
# Implementation Tasks

## Phase 1: Description

- [ ] 1. Task description
  - Subtask details
  - More details
  - _Requirements: 1.1, 2.2_

- [ ] 2. Another task description
  - Subtask details
  - _Requirements: 3.1_

- [ ]* 3. Optional task description (marked with *)
  - **Property X: Property name**
  - **Validates: Requirements X.X**

## Phase 2: Description

- [ ] 4. Next phase task
  - Details
  - _Requirements: 4.1_
```

#### ❌ Incorrect Format (No Start Task Buttons):
```markdown
### 1. Section Header
- [ ] 1.1 Nested task (won't work)
- [ ] 1.2 Another nested task (won't work)

### 2. Another Section
- [ ] 2.1 More nested tasks (won't work)
```

#### Key Requirements:
1. **Flat numbered list**: Use `- [ ] N.` format (1, 2, 3, etc.)
2. **No nested numbering**: Avoid `1.1, 1.2` style numbering
3. **Optional tasks**: Mark with `*` like `- [ ]* N.`
4. **Phase headers**: Use `## Phase N:` for organization
5. **Requirements tracking**: Include `_Requirements: X.X, Y.Y_`
6. **Property tests**: Use `**Property X:** and **Validates:**` format

#### Examples from Working Specs:
- `.kiro/specs/store-architecture-consolidation/tasks.md`
- `.kiro/specs/nearby-view-stabilization/tasks.md`

**Always check existing working specs for reference when creating new task files!**