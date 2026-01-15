# Requirements Document

## Introduction

This feature restructures the initial setup experience (view -1) to combine API key validation and agency selection into a single, unified two-phase view. Currently, API key setup and agency selection are split between the setup view and settings view, creating a fragmented onboarding experience. This change consolidates the setup process while simplifying the settings view to focus on configuration management.

## Glossary

- **Setup_View**: The initial configuration view (view -1) where users enter their API key and select their transit agency
- **Settings_View**: The configuration management view (view 2) where users can adjust app preferences and reconfigure their setup
- **API_Key**: The Tranzy API authentication key required to access transit data
- **Agency**: A transit agency/provider that the user wants to track (e.g., a specific bus company or transit authority)
- **Agency_List**: The list of available transit agencies returned by the Tranzy API after successful API key validation
- **Phase_1**: The API key entry and validation step in the Setup_View
- **Phase_2**: The agency selection step in the Setup_View (enabled only after Phase_1 completes)
- **Reconfigure_Action**: The action in Settings_View that navigates users back to Setup_View to change their API key or agency

## Requirements

### Requirement 1: Unified Setup View with Two-Phase Flow

**User Story:** As a new user, I want to complete both API key validation and agency selection in a single view, so that I have a streamlined onboarding experience.

#### Acceptance Criteria

1. WHEN a user first opens the app without an API key, THE Setup_View SHALL display with both Phase_1 and Phase_2 sections visible
2. WHEN the Setup_View loads, THE Phase_1 section SHALL be enabled and THE Phase_2 section SHALL be disabled
3. WHEN Phase_1 is incomplete, THE Phase_2 agency dropdown SHALL remain disabled to prevent premature interaction
4. WHEN the view layout is rendered, THE Setup_View SHALL maintain consistent height regardless of phase state to prevent layout shifts
5. THE Setup_View SHALL block navigation to other views until both phases are completed successfully

### Requirement 2: Phase 1 - API Key Validation

**User Story:** As a user, I want to enter and validate my API key, so that the system can fetch available agencies for my key.

#### Acceptance Criteria

1. WHEN a user enters an API key in Phase_1, THE Setup_View SHALL enable the "Validate" button
2. WHEN a user clicks the "Validate" button, THE System SHALL call the Tranzy API /agency endpoint with the provided API key
3. WHEN the API key validation succeeds, THE System SHALL store the API key and cache the returned agency list
4. WHEN the API key validation succeeds, THE System SHALL enable Phase_2 and populate the agency dropdown with the cached agencies
5. WHEN the API key validation fails, THE System SHALL display an error message and allow the user to retry
6. WHEN a user presses Enter in the API key field, THE System SHALL trigger the validation action

### Requirement 3: Phase 2 - Agency Selection

**User Story:** As a user, I want to select my transit agency from a dropdown, so that I can access transit data specific to my region.

#### Acceptance Criteria

1. WHEN Phase_1 completes successfully, THE Phase_2 agency dropdown SHALL become enabled and populated with agencies
2. WHEN the agency dropdown is disabled, THE System SHALL display it in a disabled state with placeholder text
3. WHEN a user selects an agency from the dropdown, THE System SHALL enable the "Continue" button
4. WHEN a user clicks the "Continue" button, THE System SHALL validate the API key and agency combination
5. WHEN the validation succeeds, THE System SHALL save the agency_id and navigate to the main app (view 0)
6. WHEN the validation fails, THE System SHALL display an error message and prevent navigation

### Requirement 4: Agency List Caching

**User Story:** As a user, I want the system to cache my agency list, so that I can change agencies without re-entering my API key.

#### Acceptance Criteria

1. WHEN the API key validation succeeds, THE System SHALL store the agency list in the Agency_Store
2. WHEN the agency list is stored, THE System SHALL persist it to localStorage for future sessions
3. WHEN a user returns to Setup_View with a cached agency list, THE System SHALL pre-populate the agency dropdown
4. WHEN the API key changes, THE System SHALL clear the cached agency list and all agency-specific data
5. THE System SHALL maintain the cached agency list indefinitely until the API key changes

### Requirement 5: Reconfiguration from Settings

**User Story:** As an existing user, I want to reconfigure my API key and agency from settings, so that I can switch to a different transit provider.

#### Acceptance Criteria

1. WHEN a user clicks "Reconfigure" in Settings_View, THE System SHALL navigate to Setup_View
2. WHEN Setup_View loads for reconfiguration, THE System SHALL pre-fill the API key field with the masked current key
3. WHEN the pre-filled API key is not modified, THE System SHALL use the original unmasked key for validation
4. WHEN a user modifies the pre-filled API key, THE System SHALL treat it as a new key and validate accordingly
5. WHEN reconfiguration completes successfully, THE System SHALL navigate back to the main app (view 0)

### Requirement 6: Simplified Settings View

**User Story:** As a user, I want a clean settings interface focused on essential controls, so that I can easily manage my app preferences.

#### Acceptance Criteria

1. THE Settings_View SHALL display only the theme toggle and reconfigure button
2. THE Settings_View SHALL NOT display the agency selection dropdown
3. THE Settings_View SHALL NOT display the API key management card
4. WHEN a user clicks the "Reconfigure" button, THE System SHALL navigate to Setup_View (view -1)
5. THE Settings_View SHALL reserve space for future cache management controls

### Requirement 7: Navigation Blocking During Setup

**User Story:** As a user in the setup process, I want to be prevented from navigating away, so that I complete the required configuration before using the app.

#### Acceptance Criteria

1. WHEN a user is in Setup_View (view -1), THE System SHALL hide the bottom navigation bar
2. WHEN the API key is not configured, THE System SHALL prevent navigation to views 0, 1, or 2
3. WHEN the API key is configured but agency is not, THE System SHALL prevent navigation to views 0 or 1
4. WHEN both API key and agency are configured, THE System SHALL allow navigation to all views

### Requirement 8: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when validation fails, so that I can understand and fix the problem.

#### Acceptance Criteria

1. WHEN API key validation fails, THE System SHALL display a descriptive error message above the API key field
2. WHEN agency validation fails, THE System SHALL display a descriptive error message above the Continue button
3. WHEN a user types in an input field with an active error, THE System SHALL clear the error message
4. WHEN validation is in progress, THE System SHALL display loading indicators on the relevant buttons
5. WHEN validation is in progress, THE System SHALL disable form inputs to prevent concurrent submissions

### Requirement 9: Data Persistence and State Management

**User Story:** As a user, I want my configuration to persist across sessions, so that I don't need to reconfigure the app every time I open it.

#### Acceptance Criteria

1. WHEN the API key is saved, THE System SHALL persist it to the Config_Store in localStorage
2. WHEN the agency_id is saved, THE System SHALL persist it to the Config_Store in localStorage
3. WHEN the app loads, THE System SHALL read the persisted configuration from localStorage
4. WHEN the API key changes, THE System SHALL clear all agency-specific cached data from all stores
5. WHEN the agency changes, THE System SHALL clear all agency-specific cached data from all stores
