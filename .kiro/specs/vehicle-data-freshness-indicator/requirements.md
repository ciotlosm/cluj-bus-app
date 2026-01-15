# Requirements Document

## Introduction

This feature enhances the vehicle card display with improved data freshness indicators and user-friendly tooltips. The system will provide visual indicators showing the age of vehicle GPS data and API fetch times, along with contextual tips to help users understand data reliability and take appropriate actions.

## Glossary

- **Vehicle_Card**: The UI component displaying individual vehicle information in the station view
- **GPS_Timestamp**: The timestamp when the vehicle's GPS sensor last reported its position
- **API_Fetch_Timestamp**: The timestamp when the application last received data from the Tranzy API
- **Data_Age**: The time difference between current time and a timestamp
- **Freshness_Indicator**: A visual icon showing the reliability status of vehicle data
- **Data_Popup**: A mobile-friendly popup displaying detailed timestamp information and contextual tips
- **Arrival_Chip**: The chip component showing estimated arrival time on the vehicle card

## Requirements

### Requirement 1: Visual Freshness Indicators

**User Story:** As a user, I want to see at a glance whether vehicle data is fresh and reliable, so that I can decide whether to trust the arrival predictions.

#### Acceptance Criteria

1. WHEN the vehicle GPS timestamp is less than 2 minutes old, THE Freshness_Indicator SHALL display a green clock icon
2. WHEN the vehicle GPS timestamp is older than 5 minutes AND the API fetch timestamp is less than 1 minute old, THE Freshness_Indicator SHALL display a red error icon
3. WHEN the vehicle GPS timestamp is 2 minutes or older AND the condition for red is not met, THE Freshness_Indicator SHALL display a yellow warning icon
4. WHEN the vehicle GPS timestamp is newer than the API fetch timestamp, THE Freshness_Indicator SHALL display a red error icon indicating invalid timestamp
5. THE Freshness_Indicator SHALL be positioned in front of the API timestamp on the vehicle card
6. THE Freshness_Indicator SHALL be clearly visible on both mobile and desktop displays

### Requirement 2: Data Popup Display

**User Story:** As a user, I want to tap or hover on the timestamp to see detailed information about data freshness, so that I can understand why a vehicle might be unreliable.

#### Acceptance Criteria

1. WHEN a user taps the timestamp area on mobile, THE Data_Popup SHALL open and display detailed information
2. WHEN a user hovers over the timestamp area on desktop, THE Data_Popup SHALL open and display detailed information
3. THE Data_Popup SHALL display the vehicle GPS timestamp in format "xx:yy (Xm Ys ago)"
4. THE Data_Popup SHALL display the API fetch timestamp in format "xx:yy (Xm Ys ago)"
5. THE Data_Popup SHALL be usable on mobile devices with touch interaction
6. THE Data_Popup SHALL close when the user taps outside or moves away

### Requirement 3: Contextual Tips

**User Story:** As a user, I want to receive helpful tips based on data conditions, so that I know what actions to take when data seems unreliable.

#### Acceptance Criteria

1. WHEN the vehicle GPS data is old AND the API fetch is also old, THE Data_Popup SHALL display a tip advising the user to press the manual refresh button
2. WHEN the vehicle GPS data is old BUT the API fetch is fresh, THE Data_Popup SHALL display a tip warning that the vehicle GPS sensor might be broken and the vehicle may be unreliable
3. WHEN the vehicle GPS data is fresh, THE Data_Popup SHALL display a tip confirming the data is reliable
4. THE tips SHALL be concise and actionable
5. THE tips SHALL use clear, non-technical language

### Requirement 4: Simplified Arrival Chip Tooltip

**User Story:** As a user, I want the arrival chip tooltip to be simpler and more focused, so that I can quickly understand arrival information without information overload.

#### Acceptance Criteria

1. WHEN a user hovers over the Arrival_Chip on desktop, THE System SHALL display a simplified tooltip
2. WHEN a user taps the Arrival_Chip on mobile, THE System SHALL display a simplified tooltip
3. THE simplified tooltip SHALL contain essential arrival information including estimated arrival time and confidence level
4. THE simplified tooltip SHALL display position prediction method and confidence
5. THE simplified tooltip SHALL display speed prediction method and confidence
6. THE simplified tooltip SHALL NOT include technical debug details such as coordinates, vehicle ID, or raw metadata
7. THE simplified tooltip SHALL NOT duplicate timestamp freshness information available in the Data_Popup
8. THE simplified tooltip SHALL be readable on mobile devices

### Requirement 5: Mobile Touch Interaction

**User Story:** As a mobile user, I want to interact with tooltips and popups through touch, so that I can access detailed information on my phone.

#### Acceptance Criteria

1. WHEN a user taps on the timestamp area, THE Data_Popup SHALL open
2. WHEN a user taps on the Arrival_Chip, THE arrival tooltip SHALL open
3. WHEN a popup or tooltip is open AND the user taps outside, THE popup or tooltip SHALL close
4. THE touch targets SHALL be large enough for comfortable mobile interaction (minimum 44x44 pixels)
5. THE popups and tooltips SHALL not overlap or interfere with each other

### Requirement 6: Data Age Calculation

**User Story:** As a developer, I want accurate data age calculations, so that the freshness indicators and tips are reliable.

#### Acceptance Criteria

1. THE System SHALL calculate GPS data age as the difference between current time and vehicle timestamp
2. THE System SHALL calculate API fetch age as the difference between current time and vehicleRefreshTimestamp
3. THE System SHALL format time differences in a human-readable format (e.g., "2m 30s ago")
4. THE System SHALL update displayed ages in real-time as time passes
5. THE System SHALL handle edge cases where timestamps are missing or invalid

### Requirement 7: Timestamp Display Format

**User Story:** As a user, I want timestamps displayed in a consistent and readable format, so that I can easily understand when data was last updated.

#### Acceptance Criteria

1. THE System SHALL display absolute times in 24-hour format (HH:MM)
2. THE System SHALL display relative times with appropriate units (seconds, minutes, hours)
3. WHEN relative time is less than 60 seconds, THE System SHALL display in seconds
4. WHEN relative time is between 1 and 60 minutes, THE System SHALL display in minutes and seconds
5. WHEN relative time is greater than 60 minutes, THE System SHALL display in hours and minutes
