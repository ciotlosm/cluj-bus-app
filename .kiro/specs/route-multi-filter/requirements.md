# Requirements Document

## Introduction

A chip-based filter system for the routes view that allows users to filter routes by transport type (Bus, Tram, Trolleybus, All) with single selection, and apply secondary meta-category filters (Transport Elevi, External) that work as additional constraints. The system uses enhanced route data with computed attributes and provides intuitive filter interactions.

## Glossary

- **Route_Filter_System**: The complete filtering interface and logic for route selection
- **Transport_Type_Filter**: Single-selection filter based on GTFS route_type values (Bus=3, Tram=0, Trolleybus=11, All=any)
- **Meta_Filter**: Secondary filters based on computed route attributes (Transport Elevi, External)
- **Enhanced_Route**: Route data augmented with computed isElevi and isExternal boolean attributes
- **Transport_Elevi_Route**: Routes with route_short_name or route_desc starting with "TE"
- **External_Route**: Routes with route_short_name starting with "M"
- **Filter_Chip**: Material-UI chip component representing a single filter option
- **Primary_Filter**: The transport type filter that determines the base set of routes
- **Secondary_Filter**: Meta filters that further constrain the primary filter results

## Requirements

### Requirement 1: Enhanced Route Data

**User Story:** As a developer, I want route data enhanced with computed attributes, so that filtering logic can be simplified and performant.

#### Acceptance Criteria

1. THE Route_Filter_System SHALL enhance route data with isElevi boolean attribute
2. WHEN a route has route_short_name OR route_desc starting with "TE", THE Enhanced_Route SHALL have isElevi set to true
3. THE Route_Filter_System SHALL enhance route data with isExternal boolean attribute  
4. WHEN a route has route_short_name starting with "M", THE Enhanced_Route SHALL have isExternal set to true
5. THE Route_Filter_System SHALL compute these attributes once when routes are loaded

### Requirement 2: Single-Selection Transport Type Filter

**User Story:** As a user, I want to filter routes by a single transport type, so that I can focus on one specific type of public transport at a time.

#### Acceptance Criteria

1. THE Transport_Type_Filter SHALL provide chips for "All", "Bus", "Tram", and "Trolleybus" options
2. THE Transport_Type_Filter SHALL allow only one option to be selected at a time
3. WHEN "All" is selected, THE Route_Filter_System SHALL include routes of all transport types
4. WHEN "Bus" is selected, THE Route_Filter_System SHALL include only routes where route_type equals 3
5. WHEN "Tram" is selected, THE Route_Filter_System SHALL include only routes where route_type equals 0
6. WHEN "Trolleybus" is selected, THE Route_Filter_System SHALL include only routes where route_type equals 11
7. THE Transport_Type_Filter SHALL default to "All" selection

### Requirement 3: Meta Filter Toggle Buttons

**User Story:** As a user, I want to toggle meta-category filters (Transport Elevi, External), so that I can apply additional constraints to my transport type selection.

#### Acceptance Criteria

1. THE Meta_Filter SHALL provide separate toggle chips for "Elevi" and "External" options
2. THE Meta_Filter chips SHALL function as independent toggles (can be on or off)
3. WHEN "Elevi" is active, THE Route_Filter_System SHALL show only routes where isElevi equals true
4. WHEN "External" is active, THE Route_Filter_System SHALL show only routes where isExternal equals true
5. THE Meta_Filter SHALL be inactive by default for both Elevi and External

### Requirement 4: Filter Interaction Logic

**User Story:** As a user, I want meta filters to reset other filters appropriately, so that I get predictable filtering behavior when switching between different filter types.

#### Acceptance Criteria

1. WHEN a Meta_Filter is activated, THE Route_Filter_System SHALL reset the Transport_Type_Filter to "All"
2. WHEN a Meta_Filter is activated, THE Route_Filter_System SHALL deactivate any other active Meta_Filter
3. WHEN the Transport_Type_Filter changes, THE Route_Filter_System SHALL preserve the current Meta_Filter state
4. WHEN a Meta_Filter is deactivated, THE Route_Filter_System SHALL maintain the current Transport_Type_Filter selection
5. THE Route_Filter_System SHALL apply both Primary_Filter and Secondary_Filter constraints simultaneously

### Requirement 5: Combined Filter Logic

**User Story:** As a user, I want filters to work together logically, so that I see routes that match both my transport type selection and any active meta filters, with special routes excluded by default.

#### Acceptance Criteria

1. WHEN both Transport_Type_Filter and Meta_Filter are active, THE Route_Filter_System SHALL show routes matching both constraints (AND logic)
2. WHEN only Transport_Type_Filter is active, THE Route_Filter_System SHALL show routes matching the transport type AND exclude Elevi and External routes
3. WHEN only Meta_Filter is active, THE Route_Filter_System SHALL show routes matching the meta filter (with transport type defaulted to "All")
4. THE Route_Filter_System SHALL update displayed routes immediately when any filter changes
5. THE Route_Filter_System SHALL exclude routes with isElevi=true OR isExternal=true when no Meta_Filter is active

### Requirement 6: Default State and Route Exclusion

**User Story:** As a user, I want to see only regular routes by default, so that special categories (Elevi, External) don't clutter my view unless I specifically want to see them.

#### Acceptance Criteria

1. WHEN the routes view loads, THE Route_Filter_System SHALL default to "All" transport types with no meta filters active
2. WHEN no Meta_Filter is active, THE Route_Filter_System SHALL exclude routes where isElevi equals true OR isExternal equals true
3. WHEN "Elevi" Meta_Filter is active, THE Route_Filter_System SHALL include only routes where isElevi equals true
4. WHEN "External" Meta_Filter is active, THE Route_Filter_System SHALL include only routes where isExternal equals true
5. THE Route_Filter_System SHALL show only regular routes (non-Elevi, non-External) by default

### Requirement 7: Empty Results and User Feedback

**User Story:** As a user, I want clear feedback about filter states and results, so that I understand what routes are being displayed and why.

#### Acceptance Criteria

1. WHEN no routes match the current filter combination, THE Route_Filter_System SHALL display a "no matching routes" message
2. THE Route_Filter_System SHALL show the total count of filtered routes
3. THE Route_Filter_System SHALL provide clear visual indication of which filters are currently active
4. THE Route_Filter_System SHALL persist filter state during the user session
5. THE Route_Filter_System SHALL indicate when special routes are being excluded by default

### Requirement 7: Empty Results and User Feedback

**User Story:** As a user, I want clear feedback about filter states and results, so that I understand what routes are being displayed and why.

#### Acceptance Criteria

1. WHEN no routes match the current filter combination, THE Route_Filter_System SHALL display a "no matching routes" message
2. THE Route_Filter_System SHALL show the total count of filtered routes
3. THE Route_Filter_System SHALL provide clear visual indication of which filters are currently active
4. THE Route_Filter_System SHALL persist filter state during the user session
5. THE Route_Filter_System SHALL indicate when special routes are being excluded by default

### Requirement 8: Filter Performance and Responsiveness

**User Story:** As a user, I want filter changes to be immediate and responsive, so that I can quickly explore different route combinations.

#### Acceptance Criteria

1. WHEN a filter state changes, THE Route_Filter_System SHALL update the displayed routes within 100ms
2. THE Route_Filter_System SHALL handle filtering of large route datasets (500+ routes) without noticeable delay
3. THE Route_Filter_System SHALL maintain smooth UI interactions during filter operations
4. THE Route_Filter_System SHALL not cause unnecessary re-renders of unaffected components
5. THE Route_Filter_System SHALL compute enhanced route attributes only once per data load

### Requirement 9: Accessibility and Visual Design

**User Story:** As a user with accessibility needs, I want the filter interface to be keyboard navigable and screen reader friendly, so that I can use the filtering functionality effectively.

#### Acceptance Criteria

1. THE Filter_Chip components SHALL be keyboard navigable using Tab and Enter keys
2. THE Route_Filter_System SHALL provide appropriate ARIA labels for screen readers
3. THE Route_Filter_System SHALL announce filter state changes to assistive technologies
4. THE Filter_Chip components SHALL have sufficient color contrast and visual indicators beyond color alone
5. THE Route_Filter_System SHALL group transport type and meta filter chips visually for clarity