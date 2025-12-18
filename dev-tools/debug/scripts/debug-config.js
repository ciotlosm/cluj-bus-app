// Quick debug script to check current configuration
console.log('🔍 Debugging Configuration State');

// Check localStorage for configuration
const configData = localStorage.getItem('bus-tracker-config');
if (configData) {
  try {
    const config = JSON.parse(configData);
    console.log('📋 Current Configuration:', {
      city: config.city,
      hasApiKey: !!config.apiKey,
      hasHomeLocation: !!config.homeLocation,
      hasWorkLocation: !!config.workLocation,
      favoriteBuses: config.favoriteBuses || [],
      refreshRate: config.refreshRate
    });
  } catch (error) {
    console.error('❌ Failed to parse config:', error);
  }
} else {
  console.log('⚠️ No configuration found in localStorage');
}

// Check favorites store
const favoritesData = localStorage.getItem('favorite-bus-store');
if (favoritesData) {
  try {
    const favorites = JSON.parse(favoritesData);
    console.log('⭐ Favorites Store:', favorites);
  } catch (error) {
    console.error('❌ Failed to parse favorites:', error);
  }
} else {
  console.log('⚠️ No favorites data found');
}

// Check if we can access the API
fetch('/api/tranzy/v1/opendata/agency', {
  headers: {
    'Authorization': 'Bearer VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej',
    'X-API-Key': 'VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej'
  }
})
.then(response => response.json())
.then(agencies => {
  console.log('🏢 Available Agencies:', agencies.map(a => ({ id: a.agency_id, name: a.agency_name })));
})
.catch(error => {
  console.error('❌ API Error:', error);
});