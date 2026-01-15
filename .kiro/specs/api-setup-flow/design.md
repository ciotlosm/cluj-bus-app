# Design Document: API Setup Flow

## Overview

This design implements a guided onboarding flow for new users to configure API credentials and select a transit agency. The solution follows existing application patterns using Zustand stores, Material-UI components, and the established service layer architecture.

The design introduces:
1. A new `agencyStore` for caching the agency list (no auto-refresh)
2. A reusable `ApiKeySetupView` component for initial setup and updates
3. Enhanced `SettingsView` with agency dropdown and API key management
4. View routing logic in `main.tsx` to enforce setup completion
5. Validation services for API key and agency combinations

## Architecture

### Component Hierarchy

```
App (main.tsx)
├── ApiKeySetupView (view = -1)
│   ├── TextField (API key input)
│   ├── Button (Continue/Validate)
│   └── Alert (Error messages)
├── SettingsView (view = 2)
│   ├── Button (Manage API Key)
│   ├── Select (Agency dropdown)
│   ├── Alert (Error messages)
│   └── [existing settings components]
├── StationView (view = 0)
│   └── [conditional: config prompt if no agency]
└── RouteView (view = 1)
    └── [conditional: config prompt if no agency]
```

### Data Flow

```
User Input → Component → Store Action → Service Call → API
                ↓                           ↓
         Update UI ← Store State ← Response/Error
                ↓
         App Context (auto-sync via contextInitializer)
```

### Store Architecture

```
configStore (existing)
├── apiKey: string | null
├── agency_id: number | null
├── setApiKey()
├── setAgency()
└── validateAndSave() [modified]

agencyStore (new)
├── agencies: TranzyAgencyResponse[]
├── loading: boolean
├── error: string | null
├── lastUpdated: number | null
├── loadAgencies()
└── clearAgencies()

App Context (existing)
├── apiConfig: { apiKey, agencyId }
└── [auto-syncs from configStore]
```

## Components and Interfaces

### ApiKeySetupView Component

**Purpose**: Reusable view for API key entry and validation

**Props**:
```typescript
interface ApiKeySetupViewProps {
  initialApiKey?: string;  // Pre-fill for updates (masked)
  onSuccess: () => void;   // Callback after successful validation
  isUpdate?: boolean;      // True when updating existing key
}
```

**State**:
- `apiKey: string` - Current input value (always masked as password)
- `loading: boolean` - Validation in progress
- `error: string | null` - Validation error message

**Behavior**:
1. Displays Material-UI TextField for API key input (type="password")
2. Shows masked value if `initialApiKey` provided
3. Enables Continue button when input is non-empty
4. On Continue click:
   - Calls `validateApiKey()` service function
   - Shows loading state during validation
   - On success: saves to configStore, calls `onSuccess()`
   - On error: displays error message, keeps user in view
5. Uses existing Material-UI Alert for error display

**Security**: API key field is always type="password" to prevent shoulder surfing and accidental exposure

### Enhanced SettingsView Component

**New Elements**:
1. **API Key Management Section**:
   - Button: "Manage API Key"
   - On click: navigates to ApiKeySetupView (view = -1)

2. **Agency Selection Section**:
   - Material-UI Select dropdown
   - Populated from `agencyStore.agencies`
   - Shows loading state while fetching
   - On selection change:
     - Immediately validates via `validateAgency()` service
     - Shows inline error if validation fails
     - Saves to configStore if validation succeeds

**Integration**:
- Loads agencies on mount if not cached
- Displays current agency selection
- Shows error alerts for validation failures

### View Routing Logic (main.tsx)

**Current State**:
```typescript
const [currentView, setCurrentView] = useState(0);
// 0 = stations, 1 = routes, 2 = settings
```

**Enhanced State**:
```typescript
const [currentView, setCurrentView] = useState<number>(() => {
  const { apiKey, agency_id } = useConfigStore.getState();
  
  // No API key → Setup view
  if (!apiKey) return -1;
  
  // Has API key but no agency → Settings
  if (!agency_id) return 2;
  
  // Fully configured → Stations
  return 0;
});
```

**View Rendering**:
```typescript
const renderContent = () => {
  switch (currentView) {
    case -1:
      return <ApiKeySetupView 
        initialApiKey={apiKey}
        isUpdate={!!apiKey}
        onSuccess={() => {
          // After API key validation
          if (!agency_id) {
            setCurrentView(2); // Go to settings for agency
          } else {
            setCurrentView(0); // Go to stations
          }
        }}
      />;
    case 0:
      return <StationView />;
    case 1:
      return <RouteView />;
    case 2:
      return <SettingsView />;
    default:
      return <StationView />;
  }
};
```

**Navigation Guard**:
- When `currentView === -1`, hide bottom navigation
- When `currentView === 2` and no agency, allow navigation but show prompts in other views

## Data Models

### Agency Store State

```typescript
interface AgencyStore {
  // Raw API data
  agencies: TranzyAgencyResponse[];
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Cache tracking (no freshness check - indefinite cache)
  lastUpdated: number | null;
  
  // Actions
  loadAgencies: () => Promise<void>;
  clearAgencies: () => void;
  clearError: () => void;
}
```

### Agency Response Type (existing)

```typescript
interface TranzyAgencyResponse {
  agency_id: number;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
  agency_lang: string;
  agency_phone: string;
}
```

### Validation Service Functions

```typescript
// Validates API key by calling /agency endpoint
async function validateApiKey(apiKey: string): Promise<TranzyAgencyResponse[]>

// Validates API key + agency by calling /routes endpoint
async function validateAgency(apiKey: string, agencyId: number): Promise<boolean>
```

## Service Layer

### Agency Service (existing - to be enhanced)

**Current**:
```typescript
export const agencyService = {
  async getAgencies(): Promise<TranzyAgencyResponse[]>
};
```

**Enhancement**:
Add standalone validation function that doesn't require app context:

```typescript
export const agencyService = {
  async getAgencies(): Promise<TranzyAgencyResponse[]>,
  
  // New: Validate API key without requiring app context
  async validateApiKey(apiKey: string): Promise<TranzyAgencyResponse[]> {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/agency`, {
      headers: { 'X-API-Key': apiKey }
    });
    return response.data;
  }
};
```

### Route Service (existing - to be enhanced)

**Enhancement**:
Add standalone validation function:

```typescript
export const routeService = {
  async getRoutes(): Promise<TranzyRouteResponse[]>,
  
  // New: Validate API key + agency without requiring app context
  async validateAgency(apiKey: string, agencyId: number): Promise<boolean> {
    try {
      await axios.get(`${API_CONFIG.BASE_URL}/routes`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Agency-Id': agencyId.toString()
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
};
```

### Config Store Enhancements

**Modified `validateAndSave` method**:

```typescript
validateAndSave: async (apiKey: string, agencyId: number) => {
  set({ loading: true, error: null, success: null });
  
  try {
    // Validate using standalone service function
    await routeService.validateAgency(apiKey, agencyId);
    
    // Save to store (triggers app context update)
    set({ 
      apiKey, 
      agency_id: agencyId,
      loading: false, 
      success: 'Configuration validated and saved successfully'
    });
  } catch (error) {
    set({ 
      loading: false, 
      error: error instanceof Error ? error.message : 'Failed to validate configuration',
      success: null
    });
  }
}
```

**New method for API key-only validation**:

```typescript
validateApiKey: async (apiKey: string) => {
  set({ loading: true, error: null, success: null });
  
  try {
    // Validate and get agencies
    const agencies = await agencyService.validateApiKey(apiKey);
    
    // Clear agency selection when API key changes
    set({ 
      apiKey,
      agency_id: null,
      loading: false,
      success: 'API key validated successfully'
    });
    
    // Load agencies into agency store
    const { useAgencyStore } = await import('../stores/agencyStore');
    useAgencyStore.getState().setAgencies(agencies);
    
  } catch (error) {
    set({ 
      loading: false, 
      error: error instanceof Error ? error.message : 'Failed to validate API key',
      success: null
    });
    throw error; // Re-throw to prevent navigation
  }
}
```

## Error Handling

### Error Types and Messages

Based on existing `errorHandlers.ts`:

| HTTP Status | Error Message | User Action |
|-------------|---------------|-------------|
| 401 | "Invalid API key" | Re-enter API key |
| 403 | "Access denied - check API key permissions" | Check API key permissions |
| 404 | "Agency not found - check agency ID" | Select different agency |
| 500+ | "Server error - please try again later" | Wait and retry |
| Network | "Network error - check your connection" | Check internet connection |

### Error Display Locations

1. **ApiKeySetupView**: Material-UI Alert below input field
2. **SettingsView - Agency Dropdown**: FormHelperText with error styling
3. **StationView/RouteView**: Existing "Please configure agency" message

### Error Recovery Flow

```
401 Error Detected
    ↓
Navigate to Settings (view = 2)
    ↓
Show error: "API key is invalid"
    ↓
User clicks "Manage API Key"
    ↓
Navigate to ApiKeySetupView (view = -1)
    ↓
User enters new key → Validates → Success
    ↓
Return to Settings (view = 2)
    ↓
User selects agency → Validates → Success
    ↓
Navigate to Stations (view = 0)
```

## Testing Strategy

### Unit Tests

**Store Tests**:
- `agencyStore.test.ts`: Test load, clear, error handling
- `configStore.test.ts`: Test new `validateApiKey` method

**Service Tests**:
- `agencyService.test.ts`: Test `validateApiKey` function
- `routeService.test.ts`: Test `validateAgency` function

**Component Tests**:
- `ApiKeySetupView.test.tsx`: Test input, validation, error display
- `SettingsView.test.tsx`: Test agency dropdown, validation, error display

### Integration Tests

1. **Initial Setup Flow**:
   - Start with no config → See setup view
   - Enter valid API key → See settings view
   - Select agency → See stations view

2. **API Key Update Flow**:
   - Start with valid config → Navigate to settings
   - Click "Manage API Key" → See setup view with masked key
   - Update key → Return to settings
   - Re-select agency → Return to stations

3. **Error Recovery Flow**:
   - Simulate 401 error → Navigate to settings
   - Update API key → Validate → Select agency
   - Verify full access restored

### Property-Based Tests

Property tests will be defined after prework analysis in the next section.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: View Selection Based on Configuration State

*For any* application state, the displayed view should be determined by the configuration completeness: no API key → Setup_View (-1), API key but no agency → Settings_View (2), both configured → last selected view or Stations_View (0).

**Validates: Requirements 1.1, 1.6, 4.1, 4.2, 4.5**

### Property 2: Continue Button Enablement

*For any* input string in the API key field, the continue button should be enabled if and only if the string is non-empty after trimming whitespace.

**Validates: Requirements 1.2**

### Property 3: Validation Failure Preserves State

*For any* validation failure (API key or agency), the system should display an error message, remain in the current view, and not save any configuration changes to the store.

**Validates: Requirements 1.4, 3.4, 3.5**

### Property 4: Successful API Key Validation Triggers State Updates

*For any* valid API key, successful validation should result in: (1) the API key being stored in Config_Store, (2) the Agency_List being loaded into Agency_Store, and (3) navigation to Settings_View if no agency is configured.

**Validates: Requirements 1.5, 1.6**

### Property 5: Agency Display Shows Only Names

*For any* agency object in the Agency_Store, the dropdown in Settings_View should display only the `agency_name` field, not other fields like ID, URL, or timezone.

**Validates: Requirements 2.5**

### Property 6: API Key Change Invalidates Dependent Data

*For any* API key change (whether initial setup or update), the system should clear the cached Agency_List, clear the agency_id from Config_Store, and fetch a new Agency_List with the new key.

**Validates: Requirements 2.3, 5.3, 5.4**

### Property 7: Successful Agency Validation Saves Configuration

*For any* valid agency ID, successful route validation should result in the agency ID being saved to Config_Store and the App_Context being updated with the new configuration.

**Validates: Requirements 3.3**

### Property 8: API Key Pre-fill and Masking

*For any* existing API key, when navigating to Setup_View for updates, the input field should be pre-filled with a masked version of the key (e.g., showing only last 4 characters or using asterisks).

**Validates: Requirements 5.2**

### Property 9: Configuration Persistence Round-Trip

*For any* valid configuration (API key, agency ID, or agency list), saving to the store should persist to localStorage, and reloading the application should restore the exact same configuration values.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 10: Agency Cache Persistence Until Key Change

*For any* cached Agency_List, the cache should remain valid indefinitely (no time-based expiration) until the API key changes, at which point it should be cleared.

**Validates: Requirements 2.4, 7.5**

### Property 11: App Context Synchronization

*For any* change to Config_Store (API key or agency ID), the App_Context should automatically update to reflect the new values, making them immediately available to all services.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 12: Configuration Validation

*For any* configuration value passed to App_Context, invalid values (empty strings, null, negative numbers, zero) should be rejected with an InvalidConfigurationError before being stored.

**Validates: Requirements 8.4, 8.5**

### Property 13: Error Message Display on Credential Failure

*For any* credential-related error (401, 403, invalid API key), the system should display a clear, user-friendly error message explaining the issue and the required action.

**Validates: Requirements 6.5**
