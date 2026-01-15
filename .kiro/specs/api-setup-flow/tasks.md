# Implementation Plan: API Setup Flow

## Overview

This implementation adds a guided setup flow for API key and agency configuration. The approach follows existing patterns: new Zustand store for agencies, reusable Material-UI components, enhanced service layer with standalone validation functions, and view routing logic in main.tsx.

## Tasks

- [x] 1. Create agency store with indefinite caching
  - Create `src/stores/agencyStore.ts` following existing store patterns
  - Use Zustand with persist middleware (localStorage)
  - Include `agencies`, `loading`, `error`, `lastUpdated` state
  - Implement `loadAgencies()`, `clearAgencies()`, `setAgencies()` actions
  - No auto-refresh logic (cache persists until cleared)
  - _Requirements: 2.1, 2.2, 2.4, 7.3, 7.5_

- [ ]* 1.1 Write property test for agency store persistence
  - **Property 9: Configuration Persistence Round-Trip**
  - **Validates: Requirements 7.3**

- [ ]* 1.2 Write property test for agency cache persistence
  - **Property 10: Agency Cache Persistence Until Key Change**
  - **Validates: Requirements 2.4, 7.5**

- [x] 2. Enhance service layer with standalone validation functions
  - [x] 2.1 Add `validateApiKey()` to agencyService
    - Create standalone function that doesn't require app context
    - Takes `apiKey` parameter, calls `/agency` endpoint
    - Returns agency list on success, throws on error
    - Use existing error handling patterns
    - _Requirements: 1.3, 1.4_

  - [x] 2.2 Add `validateAgency()` to routeService
    - Create standalone function that doesn't require app context
    - Takes `apiKey` and `agencyId` parameters, calls `/routes` endpoint
    - Returns boolean (true on success, false on error)
    - Use existing error handling patterns
    - _Requirements: 3.2, 3.3, 3.4_

- [ ]* 2.3 Write unit tests for validation functions
  - Test `validateApiKey()` with valid/invalid keys
  - Test `validateAgency()` with valid/invalid combinations
  - Test error handling for different HTTP status codes
  - _Requirements: 1.3, 1.4, 3.2, 3.3, 3.4_

- [x] 3. Enhance config store with API key validation
  - Add `validateApiKey()` method to configStore
  - Method should call `agencyService.validateApiKey()`
  - On success: save API key, clear agency_id, load agencies into agency store
  - On error: set error state, throw to prevent navigation
  - Update `validateAndSave()` to use `routeService.validateAgency()`
  - _Requirements: 1.5, 2.3, 5.3, 5.4_

- [ ]* 3.1 Write property test for API key change invalidation
  - **Property 6: API Key Change Invalidates Dependent Data**
  - **Validates: Requirements 2.3, 5.3, 5.4**

- [ ]* 3.2 Write property test for app context synchronization
  - **Property 11: App Context Synchronization**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 4. Create ApiKeySetupView component
  - Create `src/components/features/views/ApiKeySetupView.tsx`
  - Accept props: `initialApiKey`, `onSuccess`, `isUpdate`
  - Use Material-UI TextField for API key input
  - Mask initial API key if provided (show last 4 chars or asterisks)
  - Enable Continue button when input is non-empty
  - On Continue: call `configStore.validateApiKey()`
  - Show loading state during validation
  - Display error using Material-UI Alert
  - Call `onSuccess()` callback after successful validation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.2_

- [ ]* 4.1 Write property test for continue button enablement
  - **Property 2: Continue Button Enablement**
  - **Validates: Requirements 1.2**

- [ ]* 4.2 Write property test for API key masking
  - **Property 8: API Key Pre-fill and Masking**
  - **Validates: Requirements 5.2**

- [ ]* 4.3 Write property test for validation failure state preservation
  - **Property 3: Validation Failure Preserves State**
  - **Validates: Requirements 1.4, 3.4, 3.5**

- [x] 5. Enhance SettingsView with agency selection
  - [x] 5.1 Add "Manage API Key" button to SettingsView
    - Button navigates to view -1 (ApiKeySetupView)
    - Pass current API key as `initialApiKey` prop
    - Set `isUpdate={true}` prop
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Add agency dropdown to SettingsView
    - Use Material-UI Select component
    - Load agencies from agencyStore on mount
    - Display only `agency_name` in dropdown options
    - Show loading state while fetching
    - On selection: call `configStore.validateAndSave()` with current API key and selected agency
    - Display inline error using FormHelperText if validation fails
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 5.3 Write property test for agency display
  - **Property 5: Agency Display Shows Only Names**
  - **Validates: Requirements 2.5**

- [ ]* 5.4 Write property test for successful agency validation
  - **Property 7: Successful Agency Validation Saves Configuration**
  - **Validates: Requirements 3.3**

- [x] 6. Implement view routing logic in main.tsx
  - [x] 6.1 Update initial view state calculation
    - Check configStore for API key and agency_id
    - Return -1 if no API key
    - Return 2 if API key but no agency
    - Return 0 if both configured
    - _Requirements: 1.1, 1.6, 4.1, 4.2, 4.5_

  - [x] 6.2 Add ApiKeySetupView to renderContent switch
    - Case -1: render ApiKeySetupView
    - Pass appropriate props based on whether it's initial setup or update
    - Handle `onSuccess` callback to navigate to settings or stations
    - _Requirements: 1.6, 5.5_

  - [x] 6.3 Hide bottom navigation when in setup view
    - Conditionally render Navigation component
    - Hide when `currentView === -1`
    - _Requirements: 4.1_

- [ ]* 6.4 Write property test for view selection
  - **Property 1: View Selection Based on Configuration State**
  - **Validates: Requirements 1.1, 1.6, 4.1, 4.2, 4.5**

- [x] 7. Add configuration prompts to StationView and RouteView
  - Check if agency_id is null in both views
  - Display Material-UI Alert with message: "Please configure the agency in settings"
  - Include button/link to navigate to settings
  - Reuse existing message component if available
  - _Requirements: 4.3_

- [x] 8. Implement error recovery for invalid credentials
  - [x] 8.1 Add 401 error detection in error handlers
    - Update `handleApiError()` to detect 401 errors
    - Trigger navigation to settings view (view = 2)
    - Set error message in configStore
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Display error message in SettingsView
    - Check for error in configStore on mount
    - Display error using Material-UI Alert
    - Clear error after user takes action
    - _Requirements: 6.3, 6.5_

- [ ]* 8.3 Write property test for error message display
  - **Property 13: Error Message Display on Credential Failure**
  - **Validates: Requirements 6.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify setup flow works end-to-end
  - Test error recovery scenarios
  - Ask the user if questions arise

- [ ] 10. Integration and final testing
  - [ ] 10.1 Test initial setup flow
    - Start with no config → verify setup view appears
    - Enter valid API key → verify navigation to settings
    - Select agency → verify navigation to stations
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 3.1, 3.3_

  - [ ] 10.2 Test API key update flow
    - Start with valid config → navigate to settings
    - Click "Manage API Key" → verify setup view with masked key
    - Update key → verify return to settings
    - Re-select agency → verify return to stations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 10.3 Test error recovery flow
    - Simulate 401 error → verify navigation to settings
    - Update API key → verify validation
    - Select agency → verify full access restored
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 10.4 Test persistence across sessions
    - Configure API key and agency
    - Reload application
    - Verify configuration persists and app starts in stations view
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 10.5 Write property test for configuration persistence
  - **Property 9: Configuration Persistence Round-Trip**
  - **Validates: Requirements 7.1, 7.2, 7.4**

- [ ]* 10.6 Write property test for configuration validation
  - **Property 12: Configuration Validation**
  - **Validates: Requirements 8.4, 8.5**

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows existing patterns: Zustand stores, Material-UI components, service layer architecture
- Agency store has no auto-refresh (indefinite cache until API key changes)
- Setup view is reusable for both initial setup and updates
- Error recovery navigates to settings (which has API key management button)
