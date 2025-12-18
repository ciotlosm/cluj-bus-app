// Test script to verify the app functionality after API linking fixes
console.log('🧪 Testing App Functionality...');

const API_KEY = 'VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej';
const BASE_URL = 'http://localhost:5175/api/tranzy/v1';

async function testApiEndpoint(endpoint, headers = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data, count: Array.isArray(data) ? data.length : 1 };
    } else {
      return { success: false, status: response.status, error: response.statusText };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n✅ Testing API Linking Fixes...\n');
  
  // Test 1: Agencies
  console.log('1. Testing agencies...');
  const agencies = await testApiEndpoint('/opendata/agency');
  if (agencies.success) {
    console.log(`   ✅ Found ${agencies.count} agencies`);
    const ctpCluj = agencies.data.find(a => a.agency_name === 'CTP Cluj');
    if (ctpCluj) {
      console.log(`   ✅ CTP Cluj found (ID: ${ctpCluj.agency_id})`);
      
      // Test 2: Routes for CTP Cluj
      console.log('\n2. Testing routes...');
      const routes = await testApiEndpoint('/opendata/routes', { 'X-Agency-Id': ctpCluj.agency_id });
      if (routes.success) {
        console.log(`   ✅ Found ${routes.count} routes for CTP Cluj`);
        console.log(`   📋 Sample routes:`, routes.data.slice(0, 3).map(r => ({
          id: r.route_id,
          short_name: r.route_short_name,
          long_name: r.route_long_name,
          desc: r.route_desc
        })));
        
        // Test 3: Vehicles
        console.log('\n3. Testing vehicles...');
        const vehicles = await testApiEndpoint('/opendata/vehicles', { 'X-Agency-Id': ctpCluj.agency_id });
        if (vehicles.success) {
          console.log(`   ✅ Found ${vehicles.count} live vehicles`);
          const vehiclesWithRoutes = vehicles.data.filter(v => v.route_id);
          console.log(`   🚌 Vehicles with route_id: ${vehiclesWithRoutes.length}`);
          
          // Test 4: Stops
          console.log('\n4. Testing stops...');
          const stops = await testApiEndpoint('/opendata/stops', { 'X-Agency-Id': ctpCluj.agency_id });
          if (stops.success) {
            console.log(`   ✅ Found ${stops.count} stops`);
            
            // Test 5: Trips
            console.log('\n5. Testing trips...');
            const trips = await testApiEndpoint('/opendata/trips', { 'X-Agency-Id': ctpCluj.agency_id });
            if (trips.success) {
              console.log(`   ✅ Found ${trips.count} trips`);
              const tripsWithHeadsign = trips.data.filter(t => t.trip_headsign);
              console.log(`   🎯 Trips with headsign: ${tripsWithHeadsign.length}`);
              
              console.log('\n🎉 All API endpoints working correctly!');
              console.log('\n📊 Summary:');
              console.log(`   • Agencies: ${agencies.count}`);
              console.log(`   • Routes: ${routes.count}`);
              console.log(`   • Vehicles: ${vehicles.count}`);
              console.log(`   • Stops: ${stops.count}`);
              console.log(`   • Trips: ${trips.count}`);
              console.log('\n✅ API linking fixes are working correctly!');
              
            } else {
              console.log(`   ❌ Trips failed:`, trips.error);
            }
          } else {
            console.log(`   ❌ Stops failed:`, stops.error);
          }
        } else {
          console.log(`   ❌ Vehicles failed:`, vehicles.error);
        }
      } else {
        console.log(`   ❌ Routes failed:`, routes.error);
      }
    } else {
      console.log('   ❌ CTP Cluj not found');
    }
  } else {
    console.log(`   ❌ Agencies failed:`, agencies.error);
  }
}

runTests().catch(console.error);