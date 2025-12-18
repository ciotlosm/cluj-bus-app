// Test the runtime schedule fix
import { favoriteBusService } from './src/services/favoriteBusService.js';

console.log('🔧 Testing Runtime Schedule Fix...\n');

// Test coordinates (Cluj-Napoca area)
const homeLocation = { latitude: 46.7712, longitude: 23.6236 };
const currentLocation = { latitude: 46.7712, longitude: 23.6236 };

// Test with Route 40 (which should show as Route "42")
const favoriteRoutes = ['40']; // Route ID 40 = Route Label "42"
const cityName = 'CTP Cluj';

console.log('Testing favorite bus info for Route 40 (should show as "42")...');

try {
  const result = await favoriteBusService.getFavoriteBusInfo(
    favoriteRoutes,
    currentLocation,
    homeLocation,
    cityName
  );
  
  console.log('\n✅ SUCCESS - No ReferenceError!');
  console.log('📊 Results:');
  console.log(`  - Found ${result.favoriteBuses.length} favorite buses`);
  
  if (result.favoriteBuses.length > 0) {
    const bus = result.favoriteBuses[0];
    console.log(`  - Route ID: ${bus.routeId}`);
    console.log(`  - Route Label: ${bus.routeShortName}`);
    console.log(`  - Route Name: ${bus.routeName}`);
    console.log(`  - Next Departure: ${bus.nextDeparture.toLocaleTimeString()}`);
    console.log(`  - Is Live: ${bus.isLive}`);
    console.log(`  - Confidence: ${bus.confidence}`);
    
    if (bus.scheduledTime) {
      console.log(`  - Scheduled Time: ${bus.scheduledTime.toLocaleTimeString()}`);
    }
    
    // Check if we're using route label correctly
    if (bus.routeId === '40' && bus.routeShortName === '42') {
      console.log('✅ CORRECT: Route ID 40 shows as Route Label "42"');
    } else {
      console.log('❌ ISSUE: Route mapping might be incorrect');
    }
    
    // Check if we get 15:45 departure (if current time allows)
    const departureTime = bus.nextDeparture.toLocaleTimeString();
    if (departureTime.includes('15:45')) {
      console.log('✅ PERFECT: Found the expected 15:45 departure!');
    } else {
      console.log(`ℹ️  INFO: Departure at ${departureTime} (15:45 might be in the past)`);
    }
  }
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n🏁 Test completed.');