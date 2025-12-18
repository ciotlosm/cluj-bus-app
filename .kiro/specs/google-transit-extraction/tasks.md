# Google Transit Service Extraction - Implementation Plan

## Overview
This implementation plan systematically removes all Google Transit service and Google Maps API key related functionality from the Cluj Bus App. The extraction focuses on cleaning up unused code while maintaining all existing functionality that relies on the Tranzy API.

## Implementation Tasks

- [x] 1. Pre-extraction analysis and verification
  - Verify that googleTransitService has no active imports or usage in the codebase
  - Document all files that reference Google functionality for systematic removal
  - Create backup of current state before beginning extraction
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Remove core Google Transit service
  - [x] 2.1 Delete googleTransitService.ts file
    - Remove the complete GoogleTransitService class implementation
    - Remove TransitEstimate and TransitRequest interface exports
    - Remove singleton instance export
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.2 Verify no broken imports after service removal
    - Run build process to check for import errors
    - Search codebase for any remaining googleTransitService references
    - _Requirements: 3.1, 3.4_

- [x] 3. Remove Google API key configuration UI components
  - [x] 3.1 Remove GoogleMapsApiKeySection component
    - Delete src/components/features/Configuration/sections/GoogleMapsApiKeySection.tsx
    - Remove component export from any index files
    - _Requirements: 4.1, 4.5_

  - [x] 3.2 Update ApiConfigurationPanel to remove Google section
    - Remove GoogleMapsApiKeySection import and usage
    - Remove googleMapsApiKey form field handling
    - Remove Google API key error handling
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 3.3 Update useConfigurationManager hook
    - Remove googleMapsApiKey from configuration interface
    - Remove Google API key form handling logic
    - _Requirements: 4.2, 4.5_

- [x] 4. Clean up type definitions and interfaces
  - [x] 4.1 Remove Google-related types from UserConfig interface
    - Remove googleMapsApiKey optional field from UserConfig
    - Verify no other interfaces depend on removed Google types
    - _Requirements: 5.1, 5.4, 5.5_

  - [x] 4.2 Remove unused Google service interfaces
    - Remove TransitEstimate and TransitRequest interfaces if not already removed
    - Clean up any Google-specific type exports
    - _Requirements: 5.2, 5.4_

  - [x] 4.3 Verify type system integrity after cleanup
    - Run TypeScript compilation to check for type errors
    - Ensure all remaining interfaces compile correctly
    - _Requirements: 5.3, 5.4_

- [x] 5. Remove environment variable references
  - [x] 5.1 Remove VITE_GOOGLE_MAPS_API_KEY references
    - Search and remove any remaining environment variable usage
    - Update any configuration documentation that mentions the variable
    - _Requirements: 6.1, 6.5_

  - [x] 5.2 Clean up Google-related logging and initialization
    - Remove Google API key configuration logging
    - Remove Google service initialization attempts
    - _Requirements: 6.3, 6.4_

- [x] 6. Update UI indicators and messaging
  - [x] 6.1 Remove Google-related status messages from Card component
    - Remove "Configure Google Maps API key for accurate ETAs" tooltip
    - Update offline indicators to reflect Tranzy API only functionality
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 6.2 Clean up Google-related help text and alerts
    - Remove any remaining Google API key status alerts
    - Update help text to reflect current Tranzy API capabilities
    - _Requirements: 7.3, 7.4, 7.5_

- [ ] 7. Update specifications and documentation
  - [ ] 7.1 Remove Google Maps directions from bus-tracker requirements
    - Remove requirement for "Directions" button opening Google Maps
    - Update station display requirements to reflect current functionality
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 7.2 Update service-store-alignment specifications
    - Remove googleTransitService from LocationStore dependencies
    - Update architecture documentation to reflect Tranzy API only approach
    - _Requirements: 8.2, 8.3, 8.5_

  - [ ] 7.3 Clean up archived documentation references
    - Update or remove Google Maps API integration documentation
    - Remove Google Transit service references from implementation docs
    - _Requirements: 8.5_

- [ ] 8. Final verification and testing
  - [ ] 8.1 Run complete build and test suite
    - Verify application builds without errors
    - Run existing tests to ensure no functionality is broken
    - _Requirements: 1.1, 1.2_

  - [ ] 8.2 Verify settings interface functionality
    - Test configuration panel loads and functions correctly
    - Verify only Tranzy API settings are displayed
    - _Requirements: 1.3, 4.5_

  - [ ] 8.3 Confirm no Google service dependencies remain
    - Search codebase for any remaining Google references
    - Verify no Google API calls are attempted
    - _Requirements: 1.4, 1.5_

- [ ] 9. Documentation update and cleanup
  - Update developer documentation to reflect removed functionality
  - Update user documentation to remove Google API key setup instructions
  - Document the extraction process for future reference
  - _Requirements: 2.5, 8.5_