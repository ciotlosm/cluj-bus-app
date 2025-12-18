// Test script to check API linking issues
console.log('🔍 Testing API Linking...');

// Test the API endpoints directly
const API_KEY = 'VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej';
const BASE_URL = 'http://localhost:5175/api/tranzy/v1';

async function testApiCall(endpoint, headers = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  Data count: ${Array.isArray(data) ? data.length : 'N/A'}`);
      return data;
    } else {
      console.log(`  Error: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`${endpoint}: ERROR - ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('\n1. Testing agencies endpoint...');
  const agencies = await testApiCall('/opendata/agency');
  
  if (agencies && agencies.length > 0) {
    console.log('\n2. Available agencies:');
    agencies.forEach(agency => {
      console.log(`  - ${agency.agency_name} (ID: ${agency.agency_id})`);
    });
    
    // Find CTP Cluj
    const ctpCluj = agencies.find(a => a.agency_name === 'CTP Cluj');
    if (ctpCluj) {
      console.log(`\n3. Testing with CTP Cluj (ID: ${ctpCluj.agency_id})...`);
      
      console.log('\n4. Testing routes...');
      await testApiCall('/opendata/routes', { 'X-Agency-Id': ctpCluj.agency_id });
      
      console.log('\n5. Testing stops...');
      await testApiCall('/opendata/stops', { 'X-Agency-Id': ctpCluj.agency_id });
      
      console.log('\n6. Testing vehicles...');
      await testApiCall('/opendata/vehicles', { 'X-Agency-Id': ctpCluj.agency_id });
    } else {
      console.log('\n❌ CTP Cluj not found in agencies');
    }
  } else {
    console.log('\n❌ No agencies found');
  }
}

runTests().catch(console.error);