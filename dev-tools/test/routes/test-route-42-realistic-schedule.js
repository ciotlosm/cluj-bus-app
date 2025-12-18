#!/usr/bin/env node

// Test the new realistic Cluj schedule generation for route 42
import { favoriteBusService } from './src/services/favoriteBusService.ts';

async function testRoute42Schedule() {
  try {
    console.log('🕐 Testing Route 42 Realistic Schedule Generation...\n');
    
    // Test coordinates (Cluj center)
    const currentLocation = { latitude: 46.7712, longitude: 23.6236 };
    const homeLocation = { latitude: 46.7712, longitude: 23.6236 };
    
    // Test route 42 (route ID 40)
    const favoriteRoutes = ['40']; // Route ID 40 = Route "42"
    const cityName = 'CTP Cluj';
    
    console.log('Testing multiple calls to ensure consistency...\n');
    
    for (let i = 1; i <= 5; i++) {
      console.log(`--- Test ${i} ---`);
      
      try {
        const result = await favoriteBusService.getFavoriteBusInfo(
          favoriteRoutes,
          currentLocation,
          homeLocation,
          cityName
        );
        
        if (result.favoriteBuses.length > 0) {
          const bus = result.favoriteBuses[0];
          console.log(`Route: ${bus.routeShortName} (${bus.routeName})`);
          console.log(`Direction: ${bus.direction}`);
          console.log(`From: ${bus.fromStation.name}`);
          console.log(`To: ${bus.toStation.name}`);
          console.log(`Next Departure: ${bus.nextDeparture.toLocaleTimeString()}`);
          console.log(`Minutes Away: ${bus.minutesAway}`);
          console.log(`Is Live: ${bus.isLive}`);
          console.log(`Confidence: ${bus.confidence}`);
          console.log(`Scheduled Time: ${bus.scheduledTime?.toLocaleTimeString()}`);
          
          // Check if time includes :45 (the official schedule time)
          const timeString = bus.nextDeparture.toLocaleTimeString();
          if (timeString.includes(':45')) {
            console.log('✅ Shows :45 departure (matches official schedule!)');
          } else {
            console.log(`⚠️  Shows ${timeString} (not :45)`);
          }
        } else {
          console.log('❌ No favorite buses returned');
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      
      console.log('');
      
      // Wait 1 second between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test at different times to see pattern
    console.log('\n🕐 Testing schedule pattern at different times...\n');
    
    const testTimes = [
      { hour: 14, minute: 30, label: '14:30 (before :45)' },
      { hour: 15, minute: 30, label: '15:30 (before :45)' },
      { hour: 15, minute: 50, label: '15:50 (after :45)' },
      { hour: 16, minute: 10, label: '16:10 (after :15)' }
    ];
    
    for (const testTime of testTimes) {
      console.log(`--- Testing at ${testTime.label} ---`);
      
      // Mock current time
      const mockDate = new Date();
      mockDate.setHours(testTime.hour, testTime.minute, 0, 0);
      
      // We can't easily mock Date.now() in this context, but we can see the pattern
      console.log(`Current time: ${mockDate.toLocaleTimeString()}`);
      console.log('Expected next departures for route 42: 15:45 or 16:15 (30-minute intervals)');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRoute42Schedule();