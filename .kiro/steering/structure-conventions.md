# Structure Conventions

## Component Architecture

### Component Naming (ACTUAL PATTERNS)
- **UI Components**: Simple names matching their purpose (e.g., `Button`, `Card`, `Input`)
- **Feature Components**: Descriptive names (e.g., `LocationPicker`, `StationDisplay`)
- **File Names**: PascalCase matching component name

**IMPORTANT**: Components do NOT use "Material" prefix. Use simple, descriptive names like `Button` instead of `MaterialButton`.

## State Management Patterns

### Zustand Stores (`src/stores/`)
- **Single Responsibility**: Each store handles one domain
- **Typed Interfaces**: All stores implement interfaces from `src/types/`
- **Persistence**: Use Zustand persist middleware for user data

### Store Conventions
- Include loading states and error handling
- Implement cleanup methods for subscriptions

## File Naming Conventions

### Human-Friendly Naming
- **Clear purpose indication**: File names should clearly indicate the module's primary responsibility
- **Logical workflow**: Names should follow a logical progression matching developer mental models
- **Avoid abbreviations**: Use full words instead of unclear abbreviations
- **Consistent patterns**: Follow established naming patterns within each domain

### Components
- **PascalCase**: `Button.tsx`, `StationDisplay.tsx`, `VehicleCard.tsx`
- **Test Files**: `ComponentName.test.tsx`
- **Integration Test Files**: `Feature.integration.test.tsx`
- **Index Files**: `index.ts` for barrel exports

### Services & Utilities
- **camelCase**: `tranzyApiService.ts`, `locationUtils.ts`
- **Descriptive names**: `vehicleTransformationService.ts` not `vehTransSvc.ts`
- **Test Files**: `serviceName.test.ts`

### Stores
- **camelCase**: `configStore.ts`
- **Test Files**: `storeName.test.ts`

## Import/Export Patterns

### Simple Exports (Preferred)
- Use direct named exports for services and utilities
- Avoid complex factory patterns and dependency injection
- Keep imports straightforward and traceable

### Import Organization
```typescript
// External libraries
import React from 'react';
import { Button as MuiButton } from '@mui/material';

// Internal components (explicit paths preferred)
import { Button } from '@/components/ui/Button';
import { VehicleCard } from '@/components/features/VehicleCard';

// Internal services/stores (direct imports)
import { useConfigStore } from '@/stores/configStore';
import { logger } from '@/utils/logger';
```

## Testing Conventions

### Test Organization
- **Co-located**: Test files next to source files
- **Integration Tests**: In `src/` root for cross-feature tests
- **Test Utilities**: In `src/test/` directory

### Test Patterns
- **Arrange-Act-Assert**: Clear test structure
- **Mock External Dependencies**: Use Vitest mocks for APIs
- **Test User Interactions**: Use Testing Library patterns

## Kiro Spec Task Format

**CRITICAL: Tasks must follow this exact format for "Start task" buttons to appear in Kiro IDE**

### ✅ Correct Format:
```markdown
# Implementation Tasks

## Phase 1: Description

- [ ] 1. Task description
  - Subtask details
  - _Requirements: 1.1, 2.2_

- [ ] 2. Another task description
  - _Requirements: 3.1_

- [ ]* 3. Optional task description (marked with *)
  - **Property X: Property name**
  - **Validates: Requirements X.X**
```

### Key Requirements:
1. **Flat numbered list**: Use `- [ ] N.` format (1, 2, 3, etc.)
2. **No nested numbering**: Avoid `1.1, 1.2` style numbering
3. **Optional tasks**: Mark with `*` like `- [ ]* N.`
4. **Requirements tracking**: Include `_Requirements: X.X, Y.Y_`