# Cluj Bus App - User Guide

## 📱 What is Cluj Bus App?

A real-time bus tracking app for Cluj-Napoca that shows you:
- **Live bus locations** with GPS tracking
- **Official CTP Cluj schedules** from their website
- **Smart route suggestions** based on your location
- **Accurate arrival times** with confidence indicators

## 🎯 Key Features

### 🔴 Live Tracking
See buses moving in real-time on the map with accurate ETAs.

### 📋 Official Schedules
Get departure times directly from CTP Cluj's official timetables.

### 🏠 Smart Favorites
The app learns your patterns and suggests relevant routes based on your location.

### 📱 Mobile Optimized
Designed for your phone with touch-friendly controls and fast loading.

## 🚀 How to Use

### First Time Setup

1. **Open the app** at `http://localhost:5175`
2. **Enter your Tranzy API key** when prompted
3. **Allow location access** for better route suggestions
4. **Add favorite routes** by searching for route numbers

### Daily Usage

1. **Check your favorites** - routes you use regularly
2. **See live buses** - red dots show real-time positions
3. **Check departure times** - official schedules from CTP Cluj
4. **Get directions** - tap routes for detailed information

### Understanding the Interface

#### Route Display
- **Route Number** (e.g., "42") - the bus line
- **Direction** - where the bus is heading
- **Next Departure** - when the next bus leaves
- **Confidence Level** - how reliable the timing is

#### Confidence Indicators
- **🔴 LIVE** - Real-time GPS tracking (most accurate)
- **📋 OFFICIAL** - CTP Cluj official schedule (very reliable)
- **⏱️ ESTIMATED** - Calculated timing (less reliable)

### Adding Favorite Routes

1. **Tap the search icon**
2. **Enter route number** (e.g., "42")
3. **Select your direction** (towards home/work)
4. **Save as favorite** for quick access

### Location-Based Features

The app uses your location to:
- **Show nearby stops** automatically
- **Suggest relevant directions** (home vs work routes)
- **Filter routes** to ones you actually use
- **Calculate walking distances** to stops

## 📍 Route Examples

### Route 42 (Popular Route)
- **Runs**: Pod Traian ↔ Bis.Câmpului
- **Schedule**: Every 30 minutes (06:15 to 21:45)
- **Key Times**: Includes 15:45 departure
- **Live Tracking**: Available during operating hours

### How Timing Works
1. **Live buses** show exact positions and ETAs
2. **Official schedules** provide departure times from CTP Cluj
3. **Fallback data** used when live tracking unavailable

## 🔧 Settings & Customization

### Location Settings
- **Enable GPS** for automatic stop detection
- **Set home/work** for smart route suggestions
- **Privacy**: Location data stays on your device

### Display Options
- **Auto-refresh** - updates every 30 seconds
- **Manual refresh** - pull down to update
- **Offline mode** - cached data when no internet

### Notification Preferences
- **Favorite alerts** - get notified about your routes
- **Service updates** - important announcements
- **Battery optimization** - reduce background activity

## 📱 Mobile Tips

### Best Practices
- **Add to home screen** for app-like experience
- **Enable location** for better suggestions
- **Use in landscape** for map view
- **Pull to refresh** for latest data

### Battery Saving
- **Turn off auto-refresh** when not needed
- **Close unused tabs** to save memory
- **Use WiFi** when available for faster updates

## 🚨 Troubleshooting

### Common Issues

#### "No buses found"
- Check if route number is correct
- Verify the route operates at current time
- Try refreshing the data

#### "Location not available"
- Enable location permissions in browser
- Check GPS is turned on
- Try refreshing the page

#### "API key invalid"
- Double-check the key is entered correctly
- Verify the key is active on Tranzy.ai
- Contact support if issues persist

### Getting Help
1. **Check error messages** in the app
2. **Try refreshing** the page
3. **Clear browser cache** if problems persist
4. **Check network connection**

## 🎯 Pro Tips

### Efficient Usage
- **Bookmark favorite routes** for quick access
- **Check schedules in advance** to plan trips
- **Use live tracking** during peak hours
- **Set up home/work locations** for smart suggestions

### Understanding Data
- **Live data** is most accurate but not always available
- **Official schedules** are reliable for planning
- **Estimated times** should be used as rough guides
- **Confidence indicators** help you judge reliability

### Planning Trips
1. **Check departure times** from official schedules
2. **Monitor live buses** for real-time updates
3. **Allow extra time** during peak hours
4. **Have backup routes** in case of delays

---

**Need more help?** Check the [troubleshooting guide](troubleshooting.md) or [developer documentation](developer-guide.md) for technical details.