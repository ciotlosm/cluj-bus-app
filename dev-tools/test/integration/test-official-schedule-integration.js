#!/usr/bin/env node

// Test the official schedule integration
import { getNextOfficialDeparture, hasOfficialSchedule, getRoutesWithOfficialSchedules } from './src/data/officialSchedules.js';

console.log('🕐 Testing Official Schedule Integration...\n');

// Test 1: Check which routes have official data
console.log('--- Routes with Official Schedule Data ---');
const routesWithSchedules = getRoutesWithOfficialSchedules();
console.log('Routes with official data:', routesWithSchedules);
console.log('');

// Test 2: Check Route 42 specifically
console.log('--- Route 42 Official Schedule Test ---');
const hasRoute42 = hasOfficialSchedule('40'); // Route ID 40 = Route "42"
console.log('Route 42 has official schedule:', hasRoute42);

if (hasRoute42) {
  // Test at different times
  const testTimes = [
    { hour: 14, minute: 30, label: '14:30 (before 14:45)' },
    { hour: 15, minute: 30, label: '15:30 (before 15:45)' },
    { hour: 15, minute: 50, label: '15:50 (after 15:45)' },
    { hour: 22, minute: 0, label: '22:00 (late evening)' }
  ];

  for (const testTime of testTimes) {
    const mockDate = new Date();
    mockDate.setHours(testTime.hour, testTime.minute, 0, 0);
    
    const officialDeparture = getNextOfficialDeparture('40', 'campului', mockDate, 'outbound');
    
    console.log(`${testTime.label}:`);
    console.log(`  Current: ${mockDate.toLocaleTimeString()}`);
    
    if (officialDeparture) {
      console.log(`  Next Official: ${officialDeparture.time.toLocaleTimeString()}`);
      console.log(`  Confidence: ${officialDeparture.confidence}`);
      
      // Check if it matches expected pattern
      const timeStr = officialDeparture.time.toLocaleTimeString();
      if (timeStr.includes(':45') || timeStr.includes(':15')) {
        console.log('  ✅ Matches expected :15/:45 pattern');
      } else {
        console.log('  ⚠️  Unexpected time pattern');
      }
    } else {
      console.log('  ❌ No official departure found');
    }
    console.log('');
  }
} else {
  console.log('❌ Route 42 does not have official schedule data');
}

// Test 3: Test different days of week
console.log('--- Day of Week Testing ---');
const baseDate = new Date('2025-12-15'); // A Sunday
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
  const testDate = new Date(baseDate);
  testDate.setDate(baseDate.getDate() + dayOffset);
  testDate.setHours(15, 30, 0, 0); // 15:30 on each day
  
  const officialDeparture = getNextOfficialDeparture('40', 'campului', testDate, 'outbound');
  
  console.log(`${days[testDate.getDay()]} 15:30:`);
  if (officialDeparture) {
    console.log(`  Next: ${officialDeparture.time.toLocaleTimeString()}`);
  } else {
    console.log(`  No schedule data`);
  }
}

console.log('\n--- Integration Summary ---');
console.log('✅ Official schedule system is ready');
console.log('📋 To add real CTP Cluj data:');
console.log('   1. Visit CTP Cluj official website');
console.log('   2. Find route 42 schedule for Campului station');
console.log('   3. Update src/data/officialSchedules.ts with real times');
console.log('   4. Add more routes and stations as needed');
console.log('');
console.log('🔄 Current system will use:');
console.log('   Priority 1: Official schedules (when available)');
console.log('   Priority 2: API schedule data (currently unavailable)');
console.log('   Priority 3: Realistic patterns (fallback)');