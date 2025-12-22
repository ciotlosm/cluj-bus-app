# Design Document

## Overview

This design implements a global application context system to eliminate repetitive manual configuration store imports and parameter passing throughout the application. The solution uses a module-level context pattern that provides type-safe, centralized access to API configuration without React dependencies.

## Architecture

### Current Architecture Problems

```typescript
// Current problematic pattern (repeated everywhere)
const { useConfigStore } = await import('../stores/configStore');
const { apiKey, agency_id } = useConfigStore.getState();
vehicleService.getVehicles(apiKey, agency_id); // Parameter passing
```

### New Architecture Solution

```typescript
// New clean pattern
vehicleService.getVehicles(); // No parameters needed
```

The new architecture introduces a global application context that:
1. **Initializes once** at application startup
2. **Updates automatically** when configuration changes
3. **Provides type-safe access** to configuration from anywhere
4. **Eliminates parameter passing** throughout the service layer

## Components and Interfaces

### App Context Module

**File**: `src/context/appContext.ts`

```typescript
interface ApiConfig {
  apiKey: string;
  agencyId: number;
}

interface AppContextState {
  apiConfig: ApiConfig | null;
  isInitialized: boolean;
}

// Module-level state
let contextState: AppContextState = {
  apiConfig: null,
  isInitialized: false
};

// Public API
export const initializeAppContext = (config: ApiConfig) => void;
export const updateAppContext = (config: ApiConfig) => void;
export const getApiConfig = (): ApiConfig;
export const isContextReady = (): boolean;
```

### Context Initialization Service

**File**: `src/context/contextInitializer.ts`

Handles automatic initialization and synchronization with the config store:

```typescript
export const setupAppContext = () => {
  // Initialize with current config
  const currentConfig = getCurrentConfig();
  if (currentConfig) {
    initializeAppContext(currentConfig);
  }
  
  // Subscribe to config changes
  useConfigStore.subscribe(handleConfigChange);
};
```

### Updated Service Layer

Services will be updated to use the context instead of accepting parameters:

```typescript
// Before
async getVehicles(apiKey: string, agency_id: number): Promise<TranzyVehicleResponse[]>

// After  
async getVehicles(): Promise<TranzyVehicleResponse[]>
```

## Data Models

### ApiConfig Interface

```typescript
interface ApiConfig {
  apiKey: string;
  agencyId: number; // Normalized from agency_id
}
```

### Context State Model

```typescript
interface AppContextState {
  apiConfig: ApiConfig | null;
  isInitialized: boolean;
  lastUpdated: number;
}
```

## Error Handling

### Context Not Initialized Error

```typescript
class ContextNotInitializedError extends Error {
  constructor() {
    super('App context not initialized. Ensure setupAppContext() is called at startup.');
    this.name = 'ContextNotInitializedError';
  }
}
```

### Invalid Configuration Error

```typescript
class InvalidConfigurationError extends Error {
  constructor(reason: string) {
    super(`Invalid configuration: ${reason}`);
    this.name = 'InvalidConfigurationError';
  }
}
```

### Service Layer Error Handling

Services will handle context errors gracefully:

```typescript
export const vehicleService = {
  async getVehicles(): Promise<TranzyVehicleResponse[]> {
    try {
      const { apiKey, agencyId } = getApiConfig();
      // Make API call
    } catch (error) {
      if (error instanceof ContextNotInitializedError) {
        throw new Error('Application not ready. Please wait for initialization.');
      }
      throw error;
    }
  }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Context Configuration Synchronization
*For any* configuration change in the config store, the App_Context should automatically reflect the updated values within the next access
**Validates: Requirements 1.2, 4.2, 3.3, 4.5**

### Property 2: Service Layer Context Usage
*For any* service method call, the service should retrieve API credentials from App_Context and successfully make API calls without requiring credential parameters
**Validates: Requirements 2.1, 2.5**

### Property 3: Store Layer Context Integration  
*For any* store operation requiring API credentials, the store should access them through App_Context and maintain existing functionality
**Validates: Requirements 3.1, 3.5**

### Property 4: Context Error Handling
*For any* attempt to access App_Context before initialization or with invalid configuration, the system should throw descriptive, actionable error messages
**Validates: Requirements 1.4, 2.4, 3.4, 4.4**

### Property 5: Configuration State Handling
*For any* partial or incomplete configuration state, the App_Context should handle it gracefully without causing system failures
**Validates: Requirements 4.3**

### Property 6: Type Safety Guarantee
*For any* access to App_Context configuration, the returned values should match the ApiConfig interface exactly with full type safety
**Validates: Requirements 1.3**

## Testing Strategy

### Dual Testing Approach

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Context initialization with valid/invalid configurations
- Service method signature verification (no credential parameters)
- Migration completeness verification (no manual imports)
- Error message clarity and actionability

**Property Tests**: Verify universal properties across all inputs
- Context synchronization across configuration changes
- Service layer behavior with various context states
- Store layer integration with different configurations
- Error handling consistency across all access patterns

### Property-Based Testing Configuration

**Testing Framework**: Vitest with Fast-check
**Minimum Iterations**: 100 per property test
**Test Tags**: Each property test references its design document property

Example test tag format:
```typescript
// Feature: global-app-context, Property 1: Context Configuration Synchronization
```

### Test Configuration

```typescript
// Test setup - mock the context
jest.mock('../context/appContext', () => ({
  getApiConfig: jest.fn(() => ({ apiKey: 'test-key', agencyId: 123 })),
  isContextReady: jest.fn(() => true)
}));
```