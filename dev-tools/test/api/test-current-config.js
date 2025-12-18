// Test current configuration to see what's stored
console.log('🔍 Testing Current Configuration...\n');

// Check localStorage for current config
const configStore = localStorage.getItem('config-store');
if (configStore) {
  try {
    const config = JSON.parse(configStore);
    console.log('📋 Current Config:', config);
    
    if (config.state && config.state.config) {
      const appConfig = config.state.config;
      console.log('\n🏠 Home Location:', appConfig.homeLocation);
      console.log('🏙️ City:', appConfig.city);
      console.log('🚌 Favorite Buses:', appConfig.favoriteBuses);
      
      if (appConfig.favoriteBuses && appConfig.favoriteBuses.length > 0) {
        console.log('\n🔍 Analyzing Stored Route IDs:');
        appConfig.favoriteBuses.forEach((routeId, index) => {
          console.log(`  ${index + 1}. Route ID: "${routeId}"`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Failed to parse config:', error.message);
  }
} else {
  console.log('❌ No config found in localStorage');
}

// Check favorite bus store
const favoriteBusStore = localStorage.getItem('favorite-bus-store');
if (favoriteBusStore) {
  try {
    const store = JSON.parse(favoriteBusStore);
    console.log('\n🚌 Favorite Bus Store:', store);
    
    if (store.state && store.state.availableRoutes) {
      const routes = store.state.availableRoutes;
      console.log(`\n📊 Available Routes Count: ${routes.length}`);
      
      // Find the problematic routes
      const route42 = routes.find(r => r.shortName === '42');
      const route43B = routes.find(r => r.shortName === '43B');
      const routeId40 = routes.find(r => r.id === '40');
      const routeId42 = routes.find(r => r.id === '42');
      
      console.log('\n🔍 Key Routes in Store:');
      if (route42) console.log('  Route "42":', route42);
      if (route43B) console.log('  Route "43B":', route43B);
      if (routeId40) console.log('  Route ID "40":', routeId40);
      if (routeId42) console.log('  Route ID "42":', routeId42);
    }
  } catch (error) {
    console.log('❌ Failed to parse favorite bus store:', error.message);
  }
} else {
  console.log('❌ No favorite bus store found in localStorage');
}