// Test what route data is actually being returned
import fetch from 'node-fetch';

const API_KEY = 'VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej';
const AGENCY_ID = 2; // CTP Cluj

async function testRouteData() {
  console.log('🔍 Testing Route Data Structure...\n');
  
  try {
    const response = await fetch(`https://api.tranzy.ai/v1/opendata/routes?agency_id=${AGENCY_ID}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'X-Agency-Id': AGENCY_ID.toString()
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const routes = await response.json();
    console.log(`📊 Total routes: ${routes.length}\n`);
    
    // Check first 10 routes to see the data structure
    console.log('📝 First 10 Routes - Raw API Data:');
    console.log('='.repeat(80));
    routes.slice(0, 10).forEach((route, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ID: ${route.route_id.toString().padEnd(3)} | Short: ${(route.route_short_name || 'NULL').padEnd(8)} | Long: ${route.route_long_name}`);
    });
    
    // Check specific routes
    const route42 = routes.find(r => r.route_short_name === '42');
    const route43B = routes.find(r => r.route_short_name === '43B');
    
    console.log('\n🔍 Specific Routes Analysis:');
    console.log('='.repeat(80));
    
    if (route42) {
      console.log('✅ Route "42" found:');
      console.log(`   route_id: ${route42.route_id}`);
      console.log(`   route_short_name: "${route42.route_short_name}"`);
      console.log(`   route_long_name: "${route42.route_long_name}"`);
      console.log('');
    }
    
    if (route43B) {
      console.log('✅ Route "43B" found:');
      console.log(`   route_id: ${route43B.route_id}`);
      console.log(`   route_short_name: "${route43B.route_short_name}"`);
      console.log(`   route_long_name: "${route43B.route_long_name}"`);
      console.log('');
    }
    
    // Check if any routes have empty/null short names
    const routesWithoutShortName = routes.filter(r => !r.route_short_name);
    console.log(`⚠️ Routes without short_name: ${routesWithoutShortName.length}/${routes.length}`);
    
    if (routesWithoutShortName.length > 0) {
      console.log('Routes without short_name (first 5):');
      routesWithoutShortName.slice(0, 5).forEach(route => {
        console.log(`   ID: ${route.route_id} | Long: ${route.route_long_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRouteData();