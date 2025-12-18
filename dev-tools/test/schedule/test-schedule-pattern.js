#!/usr/bin/env node

// Test the schedule pattern logic directly
function createSeed(routeId, stationId) {
  const combined = `${routeId}-${stationId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateRealisticClujSchedule(routeId, stationId, currentTime) {
  const now = new Date(currentTime);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const seed = createSeed(routeId, stationId);
  
  let baseMinutes;
  
  // Route 42 specifically has departures at :45 according to user
  if (routeId === '40') { // Route ID 40 = Route "42"
    if (currentHour >= 6 && currentHour <= 22) {
      // Route 42 pattern: :15, :45 (every 30 minutes, includes the official :45)
      baseMinutes = [15, 45];
    } else {
      // Off-peak: hourly at :45
      baseMinutes = [45];
    }
  } else {
    // General Cluj bus patterns
    if (currentHour >= 6 && currentHour <= 9) {
      baseMinutes = [0, 12, 24, 36, 48];
    } else if (currentHour >= 16 && currentHour <= 19) {
      baseMinutes = [0, 15, 30, 45];
    } else if (currentHour >= 10 && currentHour <= 15) {
      baseMinutes = [0, 20, 40];
    } else if (currentHour >= 20 && currentHour <= 22) {
      baseMinutes = [0, 30];
    } else {
      baseMinutes = [0];
    }
  }
  
  // Apply small route-specific offset (max 5 minutes)
  const routeOffset = seed % 5;
  const adjustedBaseMinutes = baseMinutes.map(min => (min + routeOffset) % 60);
  
  // Find next departure from the pattern
  let nextDepartureMinute = adjustedBaseMinutes.find(min => min > currentMinute);
  
  if (!nextDepartureMinute) {
    nextDepartureMinute = adjustedBaseMinutes[0];
    const nextDeparture = new Date(now);
    nextDeparture.setHours(currentHour + 1, nextDepartureMinute, 0, 0);
    return nextDeparture;
  } else {
    const nextDeparture = new Date(now);
    nextDeparture.setHours(currentHour, nextDepartureMinute, 0, 0);
    return nextDeparture;
  }
}

console.log('🕐 Testing Route 42 Schedule Pattern...\n');

// Test route 42 (route ID 40) at different times
const routeId = '40';
const stationId = '123'; // Sample station ID

const testTimes = [
  { hour: 14, minute: 30, label: '14:30 (before :45)' },
  { hour: 15, minute: 30, label: '15:30 (before :45)' },
  { hour: 15, minute: 50, label: '15:50 (after :45)' },
  { hour: 16, minute: 10, label: '16:10 (after :15)' },
  { hour: 8, minute: 20, label: '08:20 (rush hour)' }
];

console.log('Route 42 base pattern: [15, 45] (every 30 minutes)');
console.log(`Route offset for route ${routeId} + station ${stationId}: ${createSeed(routeId, stationId) % 5} minutes\n`);

for (const testTime of testTimes) {
  const mockDate = new Date();
  mockDate.setHours(testTime.hour, testTime.minute, 0, 0);
  
  const nextDeparture = generateRealisticClujSchedule(routeId, stationId, mockDate);
  
  console.log(`${testTime.label}:`);
  console.log(`  Current: ${mockDate.toLocaleTimeString()}`);
  console.log(`  Next: ${nextDeparture.toLocaleTimeString()}`);
  
  if (nextDeparture.toLocaleTimeString().includes(':45') || nextDeparture.toLocaleTimeString().includes(':15')) {
    console.log('  ✅ Matches expected pattern (:15 or :45)');
  } else {
    console.log('  ⚠️  Unexpected time');
  }
  console.log('');
}

// Test consistency - same time should give same result
console.log('🔄 Testing consistency (same input should give same output)...\n');

const fixedTime = new Date();
fixedTime.setHours(15, 30, 0, 0);

for (let i = 1; i <= 5; i++) {
  const result = generateRealisticClujSchedule(routeId, stationId, fixedTime);
  console.log(`Test ${i}: ${result.toLocaleTimeString()}`);
}

console.log('\n✅ All tests should show the same time for consistency!');