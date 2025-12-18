// Test route 42 schedule data to verify timing accuracy
import fetch from 'node-fetch';

const API_KEY = 'VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej';
const AGENCY_ID = 2; // CTP Cluj

async function testRoute42Schedule() {
  console.log('🔍 Testing Route 42 Schedule Data...\n');
  
  try {
    // Get route 42 details (ID should be 40)
    const routesResponse = await fetch(`https://api.tranzy.ai/v1/opendata/routes?agency_id=${AGENCY_ID}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Agency-Id': AGENCY_ID.toString()
      }
    });
    
    const routes = await routesResponse.json();
    const route42 = routes.find(r => r.route_short_name === '42');
    
    if (!route42) {
      console.log('❌ Route 42 not found');
      return;
    }
    
    console.log('✅ Route 42 found:');
    console.log(`   ID: ${route42.route_id}`);
    console.log(`   Short Name: ${route42.route_short_name}`);
    console.log(`   Long Name: ${route42.route_long_name}`);
    console.log('');
    
    // Get trips for route 42
    const tripsResponse = await fetch(`https://api.tranzy.ai/v1/opendata/trips?agency_id=${AGENCY_ID}&route_id=${route42.route_id}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Agency-Id': AGENCY_ID.toString()
      }
    });
    
    const trips = await tripsResponse.json();
    console.log(`📊 Found ${trips.length} trips for route 42`);
    
    // Show first few trips
    console.log('\n🚌 Trip Details:');
    trips.slice(0, 5).forEach((trip, index) => {
      console.log(`   ${index + 1}. Trip ID: ${trip.trip_id}`);
      console.log(`      Headsign: ${trip.trip_headsign || 'N/A'}`);
      console.log(`      Direction: ${trip.direction_id}`);
      console.log('');
    });
    
    // Get stops for route 42
    const stopsResponse = await fetch(`https://api.tranzy.ai/v1/opendata/stops?agency_id=${AGENCY_ID}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Agency-Id': AGENCY_ID.toString()
      }
    });
    
    const allStops = await stopsResponse.json();
    
    // Get stop times for first trip to see the route
    if (trips.length > 0) {
      const firstTrip = trips[0];
      console.log(`🕐 Getting schedule for trip: ${firstTrip.trip_id}`);
      
      const stopTimesResponse = await fetch(`https://api.tranzy.ai/v1/opendata/stop_times?agency_id=${AGENCY_ID}&trip_id=${firstTrip.trip_id}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'X-API-Key': API_KEY,
          'X-Agency-Id': AGENCY_ID.toString()
        }
      });
      
      const stopTimes = await stopTimesResponse.json();
      console.log(`   Found ${stopTimes.length} stops on this trip`);
      
      // Show schedule with station names
      console.log('\n📍 Route 42 Schedule (first trip):');
      console.log('='.repeat(80));
      
      const sortedStopTimes = stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);
      
      console.log('Raw stop times data (first 3):');
      console.log(JSON.stringify(sortedStopTimes.slice(0, 3), null, 2));
      
      sortedStopTimes.forEach((stopTime, index) => {
        const stop = allStops.find(s => s.stop_id === stopTime.stop_id);
        const stopName = stop ? stop.stop_name : `Stop ${stopTime.stop_id}`;
        
        console.log(`${(index + 1).toString().padStart(2)}. ${stopTime.departure_time || 'NO_TIME'} | ${stopName}`);
        
        // Check if this is near "Campului" station mentioned by user
        if (stopName.toLowerCase().includes('campului')) {
          console.log(`    ⭐ CAMPULUI STATION FOUND! Departure: ${stopTime.departure_time || 'NO_TIME'}`);
        }
      });
      
      // Look for stations with "Campului" in the name
      const campuluiStops = allStops.filter(stop => 
        stop.stop_name.toLowerCase().includes('campului')
      );
      
      if (campuluiStops.length > 0) {
        console.log('\n🎯 Campului Stations Found:');
        campuluiStops.forEach(stop => {
          console.log(`   ID: ${stop.stop_id} | Name: ${stop.stop_name}`);
          
          // Get stop times for this station
          const stationStopTimes = sortedStopTimes.filter(st => st.stop_id === stop.stop_id);
          if (stationStopTimes.length > 0) {
            console.log(`   Times on this trip: ${stationStopTimes.map(st => st.departure_time).join(', ')}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRoute42Schedule();