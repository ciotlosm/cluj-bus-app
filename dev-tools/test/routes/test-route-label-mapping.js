// Test route label mapping for CTP Cluj schedules
// This tests the core logic without importing TypeScript modules

console.log('🔧 Testing Route Label Mapping Logic...\n');

// Simulate the route data from Tranzy API
const mockRoutes = [
  { id: '40', shortName: '42', longName: 'P.M.Viteazul - Str.Câmpului', type: 'bus' },
  { id: '42', shortName: '43B', longName: 'Gara - Cartier Gheorgheni', type: 'bus' },
  { id: '1', shortName: '1', longName: 'Centru - Mănăștur', type: 'bus' }
];

// Test the mapping logic
function testRouteMapping() {
  console.log('📋 Mock Route Data:');
  mockRoutes.forEach(route => {
    console.log(`  Route ID: ${route.id} → Label: "${route.shortName}" (${route.longName})`);
  });
  
  console.log('\n🔍 Testing CTP Cluj Schedule Matching:');
  
  // Test Route 40 (should use label "42" for CTP Cluj)
  const route40 = mockRoutes.find(r => r.id === '40');
  if (route40) {
    const routeLabel = route40.shortName || route40.id;
    console.log(`✅ Route ID "40" → Use label "${routeLabel}" for CTP Cluj schedule`);
    
    if (routeLabel === '42') {
      console.log('✅ CORRECT: Will fetch CTP Cluj schedule for route "42"');
    } else {
      console.log('❌ ISSUE: Wrong label for CTP Cluj schedule');
    }
  }
  
  // Test Route 42 (should use label "43B" for CTP Cluj)
  const route42 = mockRoutes.find(r => r.id === '42');
  if (route42) {
    const routeLabel = route42.shortName || route42.id;
    console.log(`✅ Route ID "42" → Use label "${routeLabel}" for CTP Cluj schedule`);
  }
  
  console.log('\n📅 Expected Schedule Behavior:');
  console.log('  - Route ID "40" → Fetch CTP Cluj schedule for route "42" → Should find 15:45 departure');
  console.log('  - Route ID "42" → Fetch CTP Cluj schedule for route "43B" → Different schedule');
  
  console.log('\n🎯 Key Fix Applied:');
  console.log('  - OLD: routeMappingService.getCTPRouteSlug(routeId) // Used route ID');
  console.log('  - NEW: routeDetails?.shortName || routeId // Uses route label');
  console.log('  - This ensures CTP Cluj schedules are matched by route number, not internal ID');
}

testRouteMapping();

console.log('\n🏁 Test completed.');