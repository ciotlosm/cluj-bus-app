# How to Extract CTP Cluj Official Schedule Data

## Step-by-Step Guide

### 1. Visit the Official Website
**URL**: https://ctpcj.ro/index.php/ro/orare-linii/linii-urbane

### 2. Navigate to Route 42
1. Look for "Linia 42" or "Route 42" in the list
2. Click on it to view the detailed schedule
3. You should see schedule tables for different directions

### 3. Extract Schedule Data
Look for information like:

#### Route Information:
- **Route Name**: "Linia 42" or similar
- **Route Description**: Full route description
- **Directions**: Usually 2 directions (e.g., "Sens 1" and "Sens 2")

#### Station Information:
- **Find "Campului" station** (or "Str. Campului")
- **Note the exact station name** as shown on the website
- **Check both directions** if the station serves both

#### Schedule Tables:
Look for tables showing:
- **Weekday schedule** (Luni-Vineri)
- **Saturday schedule** (Sâmbătă) 
- **Sunday schedule** (Duminică)
- **Departure times** in HH:MM format

### 4. Example of What to Look For

The website might show something like:

```
Linia 42: Mănăștur - Centru

Stația: Str. Campului

Luni - Vineri (Weekdays):
05:30, 06:00, 06:30, 07:00, 07:30, 08:00, 08:30, 09:00, 09:30, 10:00,
10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00,
15:30, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00, 19:30, 20:00

Sâmbătă (Saturday):
06:00, 06:30, 07:00, 07:30, 08:00, 08:30, 09:00, 09:30, 10:00, 10:30,
11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30,
16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00, 19:30

Duminică (Sunday):
07:00, 07:30, 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30,
12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30,
17:00, 17:30, 18:00, 18:30, 19:00
```

### 5. Convert to App Format

Take the extracted data and update `src/data/officialSchedules.ts`:

```typescript
{
  routeId: '40', // Route ID 40 = Route "42"
  routeShortName: '42',
  stationId: 'str_campului',
  stationName: 'Str. Campului', // Exact name from website
  direction: 'outbound', // Determine from route direction
  weekdayDepartures: [
    '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', 
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', 
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', 
    '19:30', '20:00'
  ],
  saturdayDepartures: [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', 
    '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', 
    '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ],
  sundayDepartures: [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', 
    '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', 
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', 
    '17:30', '18:00', '18:30', '19:00'
  ],
  validFrom: '2024-09-01', // Check when schedule is valid from
  validTo: '2025-08-31', // Check when schedule expires
  source: 'https://ctpcj.ro/index.php/ro/orare-linii/linii-urbane',
  lastUpdated: '2025-12-12'
}
```

### 6. Key Things to Verify

- ✅ **15:45 is included** in the weekday departures (you mentioned this time)
- ✅ **Times are in 24-hour format** (15:45, not 3:45 PM)
- ✅ **Times are sorted** chronologically
- ✅ **Station name matches exactly** what's on ctpcj.ro
- ✅ **All three schedules** are included (weekday, Saturday, Sunday)

### 7. Test the Integration

After updating the data:
1. **Restart the app**
2. **Set Route 42 as favorite**
3. **Check at 15:30** - should show "Next: 15:45" with "📋 OFFICIAL"
4. **Verify times match** what you saw on ctpcj.ro

### 8. Add More Routes

Repeat the process for other popular routes:
- **Route 24** (if popular)
- **Route 35** (if popular)
- **Other frequently used routes**

## Expected Result

Once you add the real CTP Cluj data:
- **Route 42 at 15:30** → Shows "📋 OFFICIAL Scheduled: 15:45"
- **Matches exactly** what users expect from official CTP schedules
- **No more estimated times** for routes with official data
- **Day-specific schedules** (different times for weekends)

The system is ready - it just needs the real schedule data from ctpcj.ro!