# Deterministic Schedule Fix - Consistent Timing on Refresh

## Issue Identified ✅
User correctly reported that estimated schedule times were changing on each refresh (e.g., "15:16" changing to different times), which is incorrect behavior. Schedule times should be consistent and not change randomly.

## Root Cause Analysis

### **Problem**: Random Schedule Generation
```javascript
// OLD CODE - PROBLEMATIC:
const randomOffset = Math.floor(Math.random() * 5) - 2; // ±2 minutes
const totalMinutesToNext = Math.max(1, minutesToNext + randomOffset);
```

This caused:
- ❌ Different times on each refresh
- ❌ Inconsistent user experience  
- ❌ Unreliable schedule information

### **Solution**: Deterministic Schedule Generation
```javascript
// NEW CODE - DETERMINISTIC:
const seed = this.createSeed(routeId, stationId);
const baseOffset = seed % frequencyMinutes;
const minutesSinceBase = (currentMinute - baseOffset + frequencyMinutes) % frequencyMinutes;
const minutesToNext = frequencyMinutes - minutesSinceBase;
```

## Implementation Details

### **1. Deterministic Seed Generation** ✅
```javascript
private createSeed(routeId: string, stationId: string): number {
  // Create consistent hash from route and station IDs
  const combined = `${routeId}-${stationId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

### **2. Consistent Schedule Calculation** ✅
```javascript
private generateDeterministicSchedule(routeId: string, stationId: string, currentTime: Date): Date {
  // Same inputs always produce same output
  const seed = this.createSeed(routeId, stationId);
  const baseOffset = seed % frequencyMinutes;
  
  // Calculate next departure deterministically
  const minutesSinceBase = (currentMinute - baseOffset + frequencyMinutes) % frequencyMinutes;
  const minutesToNext = frequencyMinutes - minutesSinceBase;
  
  return new Date(now.getTime() + Math.max(1, minutesToNext) * 60000);
}
```

### **3. Proper Data Source Detection** ✅
```javascript
// Clearly distinguish between real API data and generated estimates
let hasRealScheduleData = false;

if (nextDepartures.length > 0) {
  nextScheduledDeparture = nextDepartures[0].departureDate;
  hasRealScheduleData = true; // Real API data
} else {
  nextScheduledDeparture = this.generateDeterministicSchedule(routeId, stationId, currentTime);
  hasRealScheduleData = false; // Generated estimate
}
```

## Expected Behavior After Fix

### **Before Fix:**
- ❌ "Scheduled: 15:16 ESTIMATED" → refresh → "Scheduled: 15:18 ESTIMATED"
- ❌ Times change randomly on each refresh
- ❌ Unreliable and confusing for users

### **After Fix:**
- ✅ **Consistent Times**: Same route + station + time = same result
- ✅ **Deterministic**: "Scheduled: 15:16 ESTIMATED" stays "15:16" on refresh
- ✅ **Predictable**: Only changes when actual time progresses

## How Deterministic Scheduling Works

### **Input Factors:**
1. **Route ID**: "40" (for route "42")
2. **Station ID**: "123" (specific bus stop)
3. **Current Time**: 15:12 (when calculation is made)
4. **Time of Day**: Determines frequency (rush hour = 8min, midday = 15min, etc.)

### **Calculation Process:**
1. **Create Seed**: Hash of "40-123" = consistent number (e.g., 1847)
2. **Base Offset**: 1847 % 15 = 7 minutes (for 15-minute frequency)
3. **Schedule Pattern**: Departures at :07, :22, :37, :52 each hour
4. **Next Departure**: If current time is 15:12, next is 15:22

### **Result:**
- **Same inputs** → **Same output** (always 15:22 for this example)
- **Time progression** → **Natural updates** (15:22 → 15:37 → 15:52)
- **Different routes/stations** → **Different patterns** (unique schedules)

## Benefits

### **1. Consistency** ✅
- Same route always shows same pattern
- Refreshing doesn't change times randomly
- Users can rely on displayed information

### **2. Realistic Patterns** ✅
- Each route has its own schedule pattern
- Based on route and station characteristics
- Follows typical Cluj bus frequencies

### **3. Predictable Updates** ✅
- Times only change when they should (time progression)
- No random fluctuations
- Clear progression: 15:22 → 15:37 → 15:52

### **4. User Trust** ✅
- Consistent behavior builds confidence
- No confusion from changing times
- Clear distinction between real and estimated data

## Data Quality Indicators

### **🔴 LIVE**: Real vehicle tracking
- Actual bus position and ETA
- Highest accuracy and reliability

### **SCHEDULE**: Official API timetable
- Real schedule data from transit authority
- Medium accuracy, official times

### **ESTIMATED**: Deterministic frequency-based
- Generated based on typical patterns
- Consistent but estimated times
- Lower accuracy but still useful

The fix ensures that estimated schedules are consistent and reliable, while clearly indicating the data source to users.