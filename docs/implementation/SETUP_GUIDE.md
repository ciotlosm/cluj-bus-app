# 🚌 Bus Tracker Setup Guide

## Quick Setup to Fix "No routes found" Error

### Step 1: Complete Configuration
1. **Open the app** in your browser (http://localhost:5175)
2. **Click "Settings"** tab at the bottom
3. **Go to "Configuration" tab**
4. **Set the following**:
   - **City**: `CTP Cluj` (exactly as shown)
   - **API Key**: `[YOUR_TRANZY_API_KEY]`
   - **Home Location**: Any address in Cluj-Napoca (e.g., "Piața Unirii, Cluj-Napoca")
   - **Work Location**: Any other address in Cluj-Napoca (e.g., "Universitatea Babeș-Bolyai, Cluj-Napoca")

### Step 2: Set Up Favorite Buses
1. **Go to "Favorite Buses" tab** in Settings
2. **Wait for routes to load** (should show 157 routes for CTP Cluj)
3. **Select 1-3 favorite bus routes** (e.g., Route 1, Route 24, Route 25)
4. **Click "Save Changes"**

### Step 3: Test the App
1. **Go back to "Buses" tab**
2. **You should now see**:
   - Favorite Buses section (if configured)
   - Nearby Stations section
   - Intelligent Bus Display section

## Troubleshooting

### If you see "No routes found":
- ✅ Make sure city is set to **exactly** `CTP Cluj`
- ✅ Make sure you have at least 1 favorite bus configured
- ✅ Check that your location permissions are enabled
- ✅ Verify API key is set correctly

### If routes don't load in Favorites tab:
- ✅ Check browser console for errors (F12 → Console)
- ✅ Make sure city is `CTP Cluj` (case sensitive)
- ✅ Verify API key is working

### Available Agencies:
- ✅ **CTP Cluj (ID: 2)** - 157 routes, 865 stops ✅ **WORKING**
- ❌ SCTP Iasi (ID: 1) - Forbidden (403 error)
- ❌ Other agencies - Not tested with this API key

## Debug Commands
Run these in browser console (F12) to debug:

```javascript
// Check current config
JSON.parse(localStorage.getItem('bus-tracker-config') || '{}')

// Check available agencies
fetch('/api/tranzy/v1/opendata/agency', {
  headers: {
    'Authorization': 'Bearer [YOUR_TRANZY_API_KEY]',
    'X-API-Key': '[YOUR_TRANZY_API_KEY]'
  }
}).then(r => r.json()).then(console.log)
```

## Expected Result
After proper setup, you should see:
- **Favorite Buses** section showing your selected routes with live timing
- **Nearby Stations** showing stations within 1km of your location
- **Intelligent Bus Display** showing recommended routes based on your location