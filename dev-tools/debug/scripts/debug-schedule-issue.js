// Debug the schedule issue
import fetch from 'node-fetch';

console.log('🔍 Debugging Schedule Issue...\n');

async function debugScheduleIssue() {
  try {
    console.log('1. Testing CTP Cluj proxy for route 42...');
    const response = await fetch('http://localhost:5175/api/ctp-cluj/index.php/ro/orare-linii/linii-urbane/linia-42');
    
    if (response.ok) {
      const html = await response.text();
      console.log('✅ CTP Cluj proxy working');
      
      // Extract schedule structure information
      const orarMatches = html.match(/orar_linia\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/g);
      
      if (orarMatches) {
        console.log('\n📋 Found schedule structure calls:');
        orarMatches.forEach((match, index) => {
          const parts = match.match(/orar_linia\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/);
          if (parts) {
            console.log(`  ${index + 1}. Route: "${parts[1]}", Day: "${parts[2]}", From: "${parts[3]}", To: "${parts[4]}"`);
          }
        });
        
        // This should show us what station names the CTP Cluj website uses
        const firstMatch = orarMatches[0];
        const parts = firstMatch.match(/orar_linia\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/);
        if (parts) {
          const fromStation = parts[3];
          console.log(`\n🎯 First station name from CTP Cluj: "${fromStation}"`);
          
          // Test station matching logic
          const requestedStation = "P-ța M.Viteazu Sosire";
          console.log(`🎯 Requested station from app: "${requestedStation}"`);
          
          // Simulate the normalize function
          const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedFrom = normalize(fromStation);
          const normalizedRequested = normalize(requestedStation);
          
          console.log(`\n🔍 Normalized comparison:`);
          console.log(`  CTP Cluj station: "${normalizedFrom}"`);
          console.log(`  Requested station: "${normalizedRequested}"`);
          
          const matches = normalizedFrom.includes(normalizedRequested) || normalizedRequested.includes(normalizedFrom);
          console.log(`  Match result: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
          
          if (!matches) {
            console.log('\n⚠️  PROBLEM IDENTIFIED: Station names don\'t match!');
            console.log('This is why the schedule service is returning null.');
          }
        }
      } else {
        console.log('❌ No orar_linia calls found in HTML');
      }
      
      // Extract Tranzy Route ID
      const tranzyMatch = html.match(/https:\/\/apps\.tranzy\.ai\/map\/ctp-cj-ro\?routeId=(\d+)/);
      if (tranzyMatch) {
        console.log(`\n🎯 Tranzy Route ID: ${tranzyMatch[1]}`);
      }
      
    } else {
      console.log('❌ CTP Cluj proxy failed');
    }
    
    console.log('\n2. Testing Tranzy API for route info...');
    const tranzyResponse = await fetch('http://localhost:5175/api/tranzy/routes?agency_id=2');
    
    if (tranzyResponse.ok) {
      const routes = await tranzyResponse.json();
      const route42 = routes.find(r => r.route_short_name === '42');
      
      if (route42) {
        console.log(`✅ Route 42 found in Tranzy API:`);
        console.log(`   ID: ${route42.route_id}`);
        console.log(`   Short Name: ${route42.route_short_name}`);
        console.log(`   Long Name: ${route42.route_long_name}`);
        
        // Test getting stations for this route
        console.log('\n3. Testing stations for route 42...');
        const stopsResponse = await fetch('http://localhost:5175/api/tranzy/stops?agency_id=2');
        
        if (stopsResponse.ok) {
          const stops = await stopsResponse.json();
          console.log(`✅ Found ${stops.length} total stops`);
          
          // Look for stations that might match "P-ța M.Viteazu"
          const matchingStops = stops.filter(stop => 
            stop.stop_name.toLowerCase().includes('viteazu') ||
            stop.stop_name.toLowerCase().includes('piata') ||
            stop.stop_name.toLowerCase().includes('p-ta')
          );
          
          if (matchingStops.length > 0) {
            console.log('\n🎯 Stations matching "Viteazu" or "Piata":');
            matchingStops.forEach(stop => {
              console.log(`   ID: ${stop.stop_id} | Name: "${stop.stop_name}"`);
            });
          } else {
            console.log('\n⚠️  No stations found matching "Viteazu" or "Piata"');
            console.log('First 10 stations:');
            stops.slice(0, 10).forEach(stop => {
              console.log(`   ID: ${stop.stop_id} | Name: "${stop.stop_name}"`);
            });
          }
        }
      } else {
        console.log('❌ Route 42 not found in Tranzy API');
      }
    } else {
      console.log(`❌ Tranzy API failed: ${tranzyResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugScheduleIssue();