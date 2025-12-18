// Test script to verify route ID/label mapping issue
import fetch from 'node-fetch';

const API_KEY = 'VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej';
const AGENCY_ID = 2; // CTP Cluj

async function testRouteMapping() {
  console.log('🔍 Testing Route ID/Label Mapping...\n');
  
  try {
    // Get all routes directly from API
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
    
    // Find routes mentioned in the issue
    const route42 = routes.find(r => r.route_short_name === '42');
    const route43B = routes.find(r => r.route_short_name === '43B');
    const routeId40 = routes.find(r => r.route_id === '40');
    const routeId42 = routes.find(r => r.route_id === '42');
    
    console.log('🔍 Key Routes Analysis:');
    console.log('='.repeat(50));
    
    if (route42) {
      console.log(`✅ Route with label "42":`);
      console.log(`   ID: ${route42.route_id}`);
      console.log(`   Label: ${route42.route_short_name}`);
      console.log(`   Name: ${route42.route_long_name}`);
      console.log('');
    }
    
    if (route43B) {
      console.log(`✅ Route with label "43B":`);
      console.log(`   ID: ${route43B.route_id}`);
      console.log(`   Label: ${route43B.route_short_name}`);
      console.log(`   Name: ${route43B.route_long_name}`);
      console.log('');
    }
    
    if (routeId40) {
      console.log(`✅ Route with ID "40":`);
      console.log(`   ID: ${routeId40.route_id}`);
      console.log(`   Label: ${routeId40.route_short_name}`);
      console.log(`   Name: ${routeId40.route_long_name}`);
      console.log('');
    }
    
    if (routeId42) {
      console.log(`✅ Route with ID "42":`);
      console.log(`   ID: ${routeId42.route_id}`);
      console.log(`   Label: ${routeId42.route_short_name}`);
      console.log(`   Name: ${routeId42.route_long_name}`);
      console.log('');
    }
    
    // Check for the specific issue
    console.log('🚨 Issue Analysis:');
    console.log('='.repeat(50));
    
    if (route42 && route42.route_id !== '42') {
      console.log(`❌ ISSUE CONFIRMED: Route label "42" has ID "${route42.route_id}" (not "42")`);
    }
    
    if (routeId42 && routeId42.route_short_name !== '42') {
      console.log(`❌ ISSUE CONFIRMED: Route ID "42" has label "${routeId42.route_short_name}" (not "42")`);
    }
    
    if (route42 && routeId42 && route42.route_id !== '42' && routeId42.route_short_name === '43B') {
      console.log(`🔥 ROOT CAUSE FOUND:`);
      console.log(`   - User selects route showing "42"`);
      console.log(`   - System should store ID "${route42.route_id}"`);
      console.log(`   - But if it stores ID "42" instead, it shows "${routeId42.route_short_name}"`);
      console.log(`   - This explains why "42" selection shows as "43B"`);
    }
    
    console.log('\n📋 Correct Mapping Should Be:');
    console.log('='.repeat(50));
    console.log('User Selection → Storage → Display');
    if (route42) {
      console.log(`"${route42.route_short_name}" → ID "${route42.route_id}" → "${route42.route_short_name}"`);
    }
    if (route43B) {
      console.log(`"${route43B.route_short_name}" → ID "${route43B.route_id}" → "${route43B.route_short_name}"`);
    }
    
    // Show some sample routes for context
    console.log('\n📝 Sample Routes (first 10):');
    console.log('='.repeat(50));
    routes.slice(0, 10).forEach(route => {
      console.log(`ID: ${route.route_id.toString().padEnd(3)} | Label: ${(route.route_short_name || 'N/A').padEnd(6)} | ${route.route_long_name}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRouteMapping();