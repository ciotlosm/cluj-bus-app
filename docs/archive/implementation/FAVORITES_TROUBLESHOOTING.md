# Favorites Troubleshooting Guide

## Issue: "Selected: 1/31122334455667788" and Confusing Display

The user is seeing garbled information in the favorites selection instead of proper route details.

## Root Causes & Solutions

### 1. City Not Configured
**Problem**: The app needs the city to be set to "CTP Cluj" to load routes.

**Solution**:
1. Go to **Settings** → **Configuration** tab
2. Set **City** to exactly `CTP Cluj` (case sensitive)
3. Set **API Key** to `[YOUR_TRANZY_API_KEY]`
4. Go back to **Settings** → **Favorite Buses** tab

### 2. Corrupted Favorite Bus Data
**Problem**: The selectedRoutes array might contain corrupted data from previous sessions.

**Solution**:
1. In the Favorite Buses tab, click **"Clear All"** next to the selected routes
2. Or manually clear localStorage:
   ```javascript
   // In browser console (F12)
   localStorage.removeItem('bus-tracker-config');
   localStorage.removeItem('favorite-bus-store');
   location.reload();
   ```

### 3. Routes Not Loading
**Problem**: The available routes aren't being fetched from the API.

**Solution**:
1. Check that city is set to "CTP Cluj"
2. Click the **"Retry Loading Routes"** button if it appears
3. Check browser console (F12) for any error messages

## Expected Behavior After Fix

### Route Selection Should Show:
- **Route Number Badge**: Large circular badge with route number (e.g., "1", "100")
- **Route Type Badge**: Colored badge with emoji and type:
  - 🚌 **Bus** (Blue) - 137 routes
  - 🚎 **Trolleybus** (Green) - 16 routes  
  - 🚋 **Tram** (Yellow) - 4 routes
- **Route Name**: Full route name (e.g., "Str. Bucium - P-ta 1 Mai")
- **Route Description**: Additional route information

### Selection Counter Should Show:
- **"Selected: 0/3"** initially
- **"Selected: 1/3"** after selecting one route
- **Route names** listed clearly (e.g., "Routes: 1, 100, 25")

## Debug Information

The app now includes debug information in development mode showing:
- Available routes count
- Loading status  
- Current city configuration
- Sample route data

## Step-by-Step Fix Process

1. **Open the app** in browser (http://localhost:5175)
2. **Go to Settings** (bottom navigation)
3. **Click Configuration tab**
4. **Set City to "CTP Cluj"** exactly
5. **Set API Key** if not already set
6. **Click Favorite Buses tab**
7. **Wait for routes to load** (should show 157 routes)
8. **If routes don't load**, click "Retry Loading Routes"
9. **If selection is corrupted**, click "Clear All"
10. **Select up to 3 routes** you want to track
11. **Click "Save Changes"**

## Verification

After completing the setup, you should see:
- ✅ 157 routes available for selection
- ✅ Beautiful card-based route selection interface
- ✅ Route type badges (Bus/Trolleybus/Tram)
- ✅ Clear route names and descriptions
- ✅ Proper selection counter (e.g., "Selected: 2/3")
- ✅ Route names displayed correctly (e.g., "Routes: 1, 100")

## Common Issues

### "No routes available"
- Check city is set to "CTP Cluj" (exact spelling)
- Check API key is set correctly
- Click "Retry Loading Routes"

### "Selected: 1/31122334455667788"
- Click "Clear All" to reset corrupted data
- Or clear localStorage and reload

### Routes not saving
- Make sure to click "Save Changes" after selection
- Check that you haven't exceeded the 3-route limit

The favorites system should now work correctly with proper route display and selection!