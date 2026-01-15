# Requirements Document

## Introduction

This feature implements a guided setup flow for new users to configure their API key and select an agency before accessing the main application. The setup ensures valid credentials are configured before allowing access to transit data features.

## Glossary

- **API_Key**: Authentication credential required for all Tranzy API requests
- **Agency**: Transit agency entity that provides bus/transit data through the Tranzy API
- **Agency_List**: Collection of all available agencies returned by the Tranzy API
- **Setup_View**: Initial screen shown when API key is not configured
- **Settings_View**: Configuration screen for managing API key, agency, and other preferences
- **Config_Store**: Zustand store that persists API key and agency ID to localStorage
- **Agency_Store**: Zustand store that caches the list of available agencies
- **App_Context**: Module-level state that provides API configuration to all services
- **Route_Validation**: Process of testing API key + agency combination by calling the routes endpoint

## Requirements

### Requirement 1: API Key Setup Screen

**User Story:** As a new user, I want to enter my API key when first opening the app, so that I can authenticate with the Tranzy API.

#### Acceptance Criteria

1. WHEN the application starts AND the Config_Store has no API key, THEN THE System SHALL display the Setup_View
2. WHEN a user enters an API key in the Setup_View, THEN THE System SHALL enable the continue button
3. WHEN a user clicks the continue button, THEN THE System SHALL validate the API key by calling the agency endpoint
4. IF the API key validation fails, THEN THE System SHALL display an error message and keep the user in the Setup_View
5. WHEN the API key validation succeeds, THEN THE System SHALL store the API key in the Config_Store and load the Agency_List
6. WHEN the API key validation succeeds AND no agency is configured, THEN THE System SHALL navigate to the Settings_View

### Requirement 2: Agency List Management

**User Story:** As a user, I want to see all available agencies in a dropdown, so that I can select the agency I want to track.

#### Acceptance Criteria

1. WHEN the Agency_Store is empty AND a valid API key exists, THEN THE System SHALL fetch the Agency_List from the Tranzy API
2. WHEN the Agency_List is fetched successfully, THEN THE System SHALL cache it in the Agency_Store with localStorage persistence
3. WHEN the API key changes, THEN THE System SHALL clear the cached Agency_List and fetch a new list
4. THE Agency_Store SHALL NOT participate in automatic refresh cycles
5. WHEN displaying agencies in the Settings_View, THEN THE System SHALL show only the agency name in the dropdown

### Requirement 3: Agency Selection and Validation

**User Story:** As a user, I want to select an agency from the dropdown and have it validated, so that I know my configuration works correctly.

#### Acceptance Criteria

1. WHEN a user selects an agency from the dropdown in Settings_View, THEN THE System SHALL immediately validate the API key + agency combination
2. WHEN validating the agency selection, THEN THE System SHALL call the routes endpoint with the selected agency ID
3. IF the route validation succeeds, THEN THE System SHALL save the agency ID to the Config_Store
4. IF the route validation fails, THEN THE System SHALL display an error message for the dropdown and NOT save the agency ID
5. WHEN the route validation fails, THEN THE System SHALL keep the user in the Settings_View

### Requirement 4: Navigation and Access Control

**User Story:** As a user, I want to access different views only when my configuration is complete, so that I don't encounter errors from missing credentials.

#### Acceptance Criteria

1. WHEN the API key is not configured, THEN THE System SHALL show the Setup_View and prevent access to other views
2. WHEN the API key is configured AND the agency ID is not configured, THEN THE System SHALL allow navigation to Settings_View
3. WHEN the API key is configured AND the agency ID is not configured, THEN THE System SHALL show a message in Stations_View and Routes_View prompting configuration
4. WHEN both API key and agency ID are configured and validated, THEN THE System SHALL allow full access to all views
5. WHEN the application starts with valid configuration, THEN THE System SHALL default to the Stations_View

### Requirement 5: API Key Management in Settings

**User Story:** As a user, I want to access the API key setup view from settings with my current key pre-filled, so that I can update my credentials if needed.

#### Acceptance Criteria

1. WHEN a user opens the Settings_View, THEN THE System SHALL display a button to manage the API key
2. WHEN a user clicks the API key management button, THEN THE System SHALL navigate to the Setup_View with the current API key pre-filled and masked
3. WHEN the API key is changed and validated successfully, THEN THE System SHALL clear the Agency_List cache
4. WHEN the API key is changed and validated successfully, THEN THE System SHALL clear the agency ID from the Config_Store
5. WHEN the API key is changed and validated successfully, THEN THE System SHALL return to the Settings_View for agency re-selection
6. THE Setup_View SHALL be reusable for both initial setup and API key updates

### Requirement 6: Error Recovery

**User Story:** As a user, I want to be notified if my API key becomes invalid during normal operation, so that I can fix my configuration.

#### Acceptance Criteria

1. WHEN an API call fails with a 401 error during normal operation, THEN THE System SHALL detect the invalid API key
2. WHEN an invalid API key is detected, THEN THE System SHALL navigate to Settings_View with an error message
3. WHEN in Settings_View after an error, THEN THE System SHALL allow the user to click the API key management button to update credentials
4. WHEN the user updates the API key via the Setup_View, THEN THE System SHALL return to Settings_View for agency re-selection
5. WHEN navigating due to invalid credentials, THEN THE System SHALL display a clear error message explaining the issue

### Requirement 7: Configuration Persistence

**User Story:** As a user, I want my API key and agency selection to persist across browser sessions, so that I don't have to reconfigure every time.

#### Acceptance Criteria

1. WHEN the API key is saved, THEN THE Config_Store SHALL persist it to localStorage
2. WHEN the agency ID is saved, THEN THE Config_Store SHALL persist it to localStorage
3. WHEN the Agency_List is fetched, THEN THE Agency_Store SHALL persist it to localStorage
4. WHEN the application starts, THEN THE System SHALL load persisted configuration from localStorage
5. THE Agency_Store cache SHALL persist indefinitely until the API key changes

### Requirement 8: App Context Synchronization

**User Story:** As a developer, I want the App_Context to automatically update when configuration changes, so that all services have access to current credentials.

#### Acceptance Criteria

1. WHEN the API key is saved to Config_Store, THEN THE App_Context SHALL update automatically
2. WHEN the agency ID is saved to Config_Store, THEN THE App_Context SHALL update automatically
3. WHEN the App_Context updates, THEN THE System SHALL make the new configuration available to all services
4. THE App_Context SHALL validate configuration values before accepting them
5. IF configuration validation fails, THEN THE App_Context SHALL throw an InvalidConfigurationError
