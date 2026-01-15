# Design Document

## Overview

This feature adds visual GPS data age indicators and improved tooltips to vehicle cards. The design focuses on simplicity: reuse existing components, add a small utility function for data age logic, and enhance the existing tooltip system to support mobile touch interactions.

**Terminology Note**: This system is independent from the existing cache freshness system. The existing system checks if cached data needs refreshing (cache validity), while this new system shows users how old the vehicle's GPS timestamp is (data age).

## Architecture

### Component Changes
- **StationVehicleList.tsx**: Modify the VehicleCard component to add data age indicator icon and new data popup
- **Existing Tooltip System**: Enhance Material-UI Tooltip to support mobile touch (tap to open/close)

### New Utilities
- **dataAgeUtils.ts**: Single utility file with GPS data age calculation logic
- **constants.ts**: Add new independent constants for GPS data age thresholds

### No New Components
- Reuse existing Material-UI components (Tooltip, Popover, Icons)
- No new custom components needed

## Components and Interfaces

### 1. GPS Data Age Constants

**File**: `src/utils/core/constants.ts` (add new section)

```typescript
/**
 * GPS Data Age Indicator Configuration
 * Independent from cache freshness system - these control user-facing indicators
 * showing how old vehicle GPS timestamps are
 */
export const GPS_DATA_AGE_THRESHOLDS = {
  // GPS timestamp age threshold for "current" status (green indicator)
  CURRENT_THRESHOLD: 2 * 60 * 1000, // 2 minutes
  
  // GPS timestamp age threshold for "stale" status (red indicator when fetch is fresh)
  STALE_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  
  // API fetch age threshold for considering fetch "fresh"
  FETCH_FRESH_THRESHOLD: 1 * 60 * 1000, // 1 minute
} as const;
```

### 2. Data Age Utility

**File**: `src/utils/vehicle/dataAgeUtils.ts`

```typescript
export type DataAgeStatus = 'current' | 'aging' | 'stale';

export interface DataAgeResult {
  status: DataAgeStatus;
  icon: 'green-clock' | 'yellow-warning' | 'red-error';
  gpsAge: number; // milliseconds
  fetchAge: number; // milliseconds
  tip: string;
}

export function calculateDataAge(
  vehicleTimestamp: string,
  fetchTimestamp: number,
  currentTime: number = Date.now()
): DataAgeResult
```

**Logic**:
1. Calculate GPS age: `currentTime - new Date(vehicleTimestamp).getTime()`
2. Calculate fetch age: `currentTime - fetchTimestamp`
3. Check if GPS newer than fetch → Red (invalid timestamp)
4. Check if GPS < 2 min → Green (current)
5. Check if GPS > 5 min AND fetch < 1 min → Red (stale GPS, fresh fetch)
6. Otherwise → Yellow (aging)

### 3. VehicleCard Timestamp Section

**Current Structure**:
```tsx
<Box display="flex" alignItems="center" gap={0.5}>
  <TimeIcon fontSize="small" color="action" />
  <Tooltip title={...}>
    <Typography>{formatTimestamp(vehicle.timestamp)}</Typography>
  </Tooltip>
</Box>
```

**New Structure**:
```tsx
<Box display="flex" alignItems="center" gap={0.5}>
  {/* Data age indicator icon */}
  <DataAgeIcon status={dataAgeStatus} />
  
  {/* Clickable timestamp with data popup */}
  <ClickableTooltip
    title={<DataPopupContent {...} />}
    onClick={handleClick}
  >
    <Typography>{formatTimestamp(vehicle.timestamp)}</Typography>
  </ClickableTooltip>
</Box>
```

### 4. Data Age Icon Component

Simple inline component in VehicleCard:

```typescript
const DataAgeIcon: FC<{ status: DataAgeStatus }> = ({ status }) => {
  if (status === 'current') {
    return <AccessTimeIcon fontSize="small" sx={{ color: 'success.main' }} />;
  } else if (status === 'aging') {
    return <WarningIcon fontSize="small" sx={{ color: 'warning.main' }} />;
  } else {
    return <ErrorIcon fontSize="small" sx={{ color: 'error.main' }} />;
  }
};
```

### 5. Data Popup Content

Simple inline component in VehicleCard:

```typescript
const DataPopupContent: FC<{
  vehicleTimestamp: string;
  fetchTimestamp: number;
  dataAgeResult: DataAgeResult;
}> = ({ vehicleTimestamp, fetchTimestamp, dataAgeResult }) => {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2">
        Vehicle GPS: {formatAbsoluteTime(vehicleTimestamp)} 
        ({formatDetailedRelativeTime(dataAgeResult.gpsAge)})
      </Typography>
      <Typography variant="body2">
        Last API fetch: {formatAbsoluteTime(fetchTimestamp)}
        ({formatDetailedRelativeTime(dataAgeResult.fetchAge)})
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
        💡 {dataAgeResult.tip}
      </Typography>
    </Box>
  );
};
```

### 6. Mobile-Friendly Tooltip

Enhance existing Tooltip usage with click handler:

```typescript
const [popupOpen, setPopupOpen] = useState(false);

<Tooltip
  open={popupOpen}
  onClose={() => setPopupOpen(false)}
  onClick={() => setPopupOpen(!popupOpen)}
  disableHoverListener={isMobile}
  title={<DataPopupContent {...} />}
>
  <Typography sx={{ cursor: 'pointer' }}>...</Typography>
</Tooltip>
```

### 7. Simplified Arrival Chip Tooltip

**Current tooltip** has lots of debug info. **New tooltip** keeps only:
- Estimated arrival time
- Position prediction method and confidence
- Speed prediction method and confidence

**Remove**:
- Vehicle ID, coordinates, speeds
- Vehicle data age (moved to data popup)
- Precise ETA (redundant with chip label)

```typescript
const arrivalTooltipContent = `
⏰ ${formatArrivalTime(arrivalTime)}

📍 Position: ${vehicle.predictionMetadata.positionMethod} (${positionConfidence})
🏃 Speed: ${vehicle.predictionMetadata.speedMethod} (${vehicle.predictionMetadata.speedConfidence})
`.trim();
```

## Data Models

### DataAgeResult Interface

```typescript
export interface DataAgeResult {
  status: 'current' | 'aging' | 'stale';
  icon: 'green-clock' | 'yellow-warning' | 'red-error';
  gpsAge: number; // milliseconds
  fetchAge: number; // milliseconds
  tip: string; // Contextual tip for user
}
```

### Time Formatting

Add one new utility function to existing `timestampFormatUtils.ts`:

```typescript
/**
 * Format time difference as "Xm Ys ago" for detailed display
 */
export function formatDetailedRelativeTime(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${seconds}s ago`;
  } else {
    return `${minutes}m ${remainingSeconds}s ago`;
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data Age Status Calculation
*For any* vehicle timestamp and fetch timestamp, the data age status should be: 'current' (green) if GPS < 2 min old; 'stale' (red) if GPS > 5 min AND fetch < 1 min OR GPS newer than fetch; 'aging' (yellow) otherwise.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Timestamp Format Consistency
*For any* timestamp, the formatted output should contain "HH:MM (Xm Ys ago)" where HH:MM is 24-hour format and the relative time uses appropriate units based on duration.
**Validates: Requirements 2.3, 2.4, 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 3: Age Calculation Accuracy
*For any* timestamp, the calculated age should equal the difference between current time and the timestamp, measured in milliseconds.
**Validates: Requirements 6.1, 6.2**

### Property 4: Tip Contextual Relevance
*For any* data age result, the tip should advise refreshing when status is 'aging', warn about GPS sensor issues when status is 'stale' with old GPS, and confirm reliability when status is 'current'.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Arrival Tooltip Content Completeness
*For any* vehicle with prediction metadata, the arrival tooltip should contain arrival time, position method, position confidence, speed method, and speed confidence.
**Validates: Requirements 4.3, 4.4, 4.5**

### Property 6: Arrival Tooltip Content Exclusion
*For any* arrival tooltip, it should NOT contain vehicle coordinates, vehicle ID, raw metadata, or timestamp age information.
**Validates: Requirements 4.6, 4.7**

### Property 7: Relative Time Unit Selection
*For any* duration, the formatted relative time should use seconds if < 60s, minutes and seconds if 60s-3600s, and hours and minutes if > 3600s.
**Validates: Requirements 7.2, 7.3, 7.4, 7.5**

## Error Handling

### Invalid Timestamps
- If vehicle timestamp is invalid/unparseable → Treat as 'stale' (red icon)
- If vehicle timestamp is in the future → Treat as 'stale' (red icon)
- If fetch timestamp is missing → Should never happen (we control it), but default to current time

### Missing Data
- If vehicle timestamp is missing → Show gray icon with "No data" message
- If predictionMetadata is missing → Arrival tooltip shows "Prediction data unavailable"

### Mobile Detection
- Use simple window width check: `window.innerWidth < 768`
- Or use Material-UI's `useMediaQuery` hook for consistency

## Testing Strategy

### Unit Tests
- Test `calculateDataAge` with specific timestamp combinations
- Test edge cases: exactly 2 minutes, exactly 5 minutes, exactly 1 minute fetch
- Test invalid timestamps: future dates, null values, unparseable strings
- Test `formatDetailedRelativeTime` with various durations

### Property-Based Tests
- Generate random timestamps and verify data age logic consistency
- Generate random valid timestamps and verify formatting round-trips
- Generate random age values and verify monotonicity of relative time

### Integration Tests
- Test tooltip opens on hover (desktop)
- Test tooltip opens on tap (mobile)
- Test tooltip closes on outside click
- Test arrival chip tooltip shows correct simplified content

### Manual Testing
- Verify icons display correctly on mobile and desktop
- Verify touch interactions work on actual mobile devices
- Verify tooltips are readable and don't overflow
- Verify tips are helpful and contextually appropriate
