# CTP Cluj Official Data Integration Guide

## Official Data Source ✅
**URL**: https://ctpcj.ro/index.php/ro/orare-linii/linii-urbane
**Source**: CTP Cluj Official Website - Urban Lines Schedules

## Integration Steps

### Step 1: Extract Route 42 Data
1. **Visit**: https://ctpcj.ro/index.php/ro/orare-linii/linii-urbane
2. **Find Route 42** in the urban lines list
3. **Click on Route 42** to view detailed schedule
4. **Look for Campului station** (Str. Campului) schedules
5. **Note departure times** for both directions

### Step 2: Update Official Schedule Data
Edit `src/data/officialSchedules.ts` and replace the example data:

```typescript
// Replace this example entry with real CTP Cluj data
{
  routeId: '40', // Route ID 40 = Route "42"
  routeShortName: '42',
  stationId: 'campului', // Use actual station ID if available
  stationName: 'Str. Campului', // Exact name from CTP website
  direction: 'outbound', // or 'inbound' based on direction
  weekdayDepartures: [
    // REPLACE WITH REAL TIMES FROM ctpcj.ro
    '06:15', '06:45', '07:15', '07:45', '08:15', '08:45',
    '09:15', '09:45', '10:15', '10:45', '11:15', '11:45',
    '12:15', '12:45', '13:15', '13:45', '14:15', '14:45',
    '15:15', '15:45', '16:15', '16:45', // ← Should include 15:45
    // ... add all real departure times
  ],
  saturdayDepartures: [
    // Weekend schedule from CTP website
  ],
  sundayDepartures: [
    // Sunday schedule from CTP website
  ],
  source: 'https://ctpcj.ro/index.php/ro/orare-linii/linii-urbane',
  lastUpdated: '2025-12-12'
}
```

### Step 3: Add More Routes
For each additional route you want to support:
1. **Find the route** on ctpcj.ro
2. **Extract schedule data** for key stations
3. **Add entry** to `officialSchedules` array
4. **Test in the app**

## Data Extraction Template

When viewing a route on ctpcj.ro, look for:

### Route Information:
- **Route Number**: (e.g., "42")
- **Route Name**: Full descriptive name
- **Directions**: Usually 2 directions (inbound/outbound)

### Station Information:
- **Station Names**: Exact names as shown on website
- **Station IDs**: If available, or use normalized names

### Schedule Information:
- **Weekday Times**: Monday-Friday departures
- **Saturday Times**: Saturday departures  
- **Sunday Times**: Sunday departures
- **Valid Period**: When schedule is effective

## Example Data Structure

Based on what you find on ctpcj.ro, create entries like:

```typescript
{
  routeId: '40', // Internal route ID
  routeShortName: '42', // Display name
  stationId: 'str_campului', // Normalized station ID
  stationName: 'Str. Campului', // Exact name from website
  direction: 'outbound', // Direction of travel
  weekdayDepartures: [
    // Real times from ctpcj.ro in HH:MM format
    '05:30', '06:00', '06:30', '07:00', '07:30',
    // ... continue with all departure times
  ],
  saturdayDepartures: [
    // Saturday schedule
  ],
  sundayDepartures: [
    // Sunday schedule  
  ],
  validFrom: '2024-09-01', // When schedule became effective
  validTo: '2025-08-31', // When schedule expires
  source: 'https://ctpcj.ro/index.php/ro/orare-linii/linii-urbane',
  lastUpdated: '2025-12-12'
}
```

## Validation Checklist

After adding official data, verify:

- ✅ **Times are in HH:MM format** (e.g., "15:45", not "3:45 PM")
- ✅ **Times are sorted chronologically** (earliest to latest)
- ✅ **All three schedules included** (weekday, Saturday, Sunday)
- ✅ **Station names match exactly** what's on ctpcj.ro
- ✅ **Route numbers match** (42 = route ID 40)
- ✅ **Source URL is correct**
- ✅ **Last updated date is current**

## Testing the Integration

After updating the data:

1. **Restart the app** to load new schedule data
2. **Set Route 42 as favorite** in settings
3. **Check timing display** - should show "📋 OFFICIAL"
4. **Verify times match** what you saw on ctpcj.ro
5. **Test at different times** to see next departures

## Benefits of Official Data

Once integrated, users will see:
- **📋 OFFICIAL** confidence indicator
- **Exact departure times** from CTP Cluj
- **Accurate next departure** calculations
- **Day-of-week specific** schedules (weekday/weekend)
- **No more estimated times** for routes with official data

## Automation Opportunities

Future enhancements could include:
- **Web scraping** to auto-update from ctpcj.ro
- **Schedule change detection** to alert when updates needed
- **Bulk import tools** for multiple routes at once
- **API integration** if CTP Cluj provides one

## Priority Routes to Add

Start with the most popular routes:
1. **Route 42** (you mentioned this specifically)
2. **Route 24** (if it's popular)
3. **Route 35** (if it's popular)
4. **Other frequently used routes**

The system is ready - it just needs the real schedule data from ctpcj.ro to provide users with official CTP Cluj timing information!