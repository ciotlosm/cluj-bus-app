// Debug script to check nearby view data flow
// Run this in browser console to debug the issue

console.log('=== DEBUGGING NEARBY VIEW ===');

// Check if stores are available
const checkStores = () => {
  console.log('1. Checking stores...');
  
  // Try to access stores from window (if exposed) or check localStorage
  const configData = localStorage.getItem('config-store');
  const locationData = localStorage.getItem('location-store');
  
  console.log('Config store data:', configData ? JSON.parse(configData) : 'Not found');
  console.log('Location store data:', locationData ? JSON.parse(locationData) : 'Not found');
  
  return { configData, locationData };
};

// Check API service
const checkApiService = () => {
  console.log('2. Checking API service...');
  
  // Check if enhancedTranzyApi is available
  if (window.enhancedTranzyApi) {
    console.log('enhancedTranzyApi found on window');
    return window.enhancedTranzyApi;
  } else {
    console.log('enhancedTranzyApi not found on window');
    return null;
  }
};

// Check network requests
const checkNetworkRequests = () => {
  console.log('3. Monitoring network requests...');
  
  // Override fetch to monitor API calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('FETCH REQUEST:', args[0]);
    return originalFetch.apply(this, args)
      .then(response => {
        console.log('FETCH RESPONSE:', args[0], response.status, response.ok);
        return response;
      })
      .catch(error => {
        console.log('FETCH ERROR:', args[0], error);
        throw error;
      });
  };
  
  console.log('Fetch monitoring enabled');
};

// Main debug function
const debugNearbyView = () => {
  console.log('Starting nearby view debug...');
  
  const stores = checkStores();
  const apiService = checkApiService();
  checkNetworkRequests();
  
  // Check if we have the required data
  if (stores.configData) {
    const config = JSON.parse(stores.configData);
    console.log('Agency ID:', config.state?.config?.agencyId);
    console.log('API Key present:', !!config.state?.config?.apiKey);
    console.log('City:', config.state?.config?.city);
  }
  
  if (stores.locationData) {
    const location = JSON.parse(stores.locationData);
    console.log('Current location:', location.state?.currentLocation);
    console.log('Home location:', location.state?.homeLocation);
    console.log('Work location:', location.state?.workLocation);
  }
  
  // Try to manually fetch station data
  if (apiService && stores.configData) {
    const config = JSON.parse(stores.configData);
    const agencyId = config.state?.config?.agencyId;
    
    if (agencyId) {
      console.log('Attempting to fetch stations for agency:', agencyId);
      apiService.getStops(agencyId, false)
        .then(stations => {
          console.log('Stations fetched successfully:', stations.length, 'stations');
          console.log('First few stations:', stations.slice(0, 3));
        })
        .catch(error => {
          console.log('Failed to fetch stations:', error);
        });
    } else {
      console.log('No agency ID configured');
    }
  }
  
  return {
    stores,
    apiService,
    timestamp: new Date().toISOString()
  };
};

// Run the debug
debugNearbyView();