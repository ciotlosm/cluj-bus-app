// Debug script to test favorites selection in browser console
// Run this in the browser console when on the favorites settings page

console.log('🔍 Debugging Favorites Selection...\n');

// Check if we're on the right page
if (!window.location.href.includes('localhost:5173')) {
  console.log('❌ Please run this on the app page (localhost:5173)');
} else {
  console.log('✅ Running on app page');
  
  // Wait a bit for the app to load
  setTimeout(() => {
    // Check if we can access the store
    if (window.__ZUSTAND_STORES__) {
      console.log('✅ Zustand stores available');
      
      // Try to access the favorite bus store
      const stores = window.__ZUSTAND_STORES__;
      console.log('Available stores:', Object.keys(stores));
      
      // Look for config and favorite bus stores
      const configStore = stores.find(s => s.name === 'config-store');
      const favoriteBusStore = stores.find(s => s.name === 'favorite-bus-store');
      
      if (configStore) {
        console.log('📋 Config Store State:', configStore.getState());
      }
      
      if (favoriteBusStore) {
        console.log('🚌 Favorite Bus Store State:', favoriteBusStore.getState());
        
        const state = favoriteBusStore.getState();
        if (state.availableRoutes && state.availableRoutes.length > 0) {
          console.log('\n📊 Available Routes Analysis:');
          console.log('='.repeat(50));
          
          // Find the problematic routes
          const route42 = state.availableRoutes.find(r => r.shortName === '42');
          const route43B = state.availableRoutes.find(r => r.shortName === '43B');
          const routeId40 = state.availableRoutes.find(r => r.id === '40');
          const routeId42 = state.availableRoutes.find(r => r.id === '42');
          
          if (route42) {
            console.log('✅ Route with shortName "42":', route42);
          }
          if (route43B) {
            console.log('✅ Route with shortName "43B":', route43B);
          }
          if (routeId40) {
            console.log('✅ Route with id "40":', routeId40);
          }
          if (routeId42) {
            console.log('✅ Route with id "42":', routeId42);
          }
          
          // Show first 10 routes for context
          console.log('\n📝 First 10 Available Routes:');
          console.log('='.repeat(50));
          state.availableRoutes.slice(0, 10).forEach(route => {
            console.log(`ID: ${route.id.padEnd(3)} | Short: ${(route.shortName || 'N/A').padEnd(6)} | Name: ${route.name}`);
          });
        }
      }
    } else {
      console.log('❌ Zustand stores not available. Try opening dev tools and running this again.');
    }
  }, 2000);
}

// Helper function to simulate route selection
window.debugSelectRoute = function(routeId) {
  console.log(`🔄 Simulating selection of route ID: ${routeId}`);
  
  // This would be called by the UI
  const event = new CustomEvent('debug-route-select', { detail: { routeId } });
  window.dispatchEvent(event);
};