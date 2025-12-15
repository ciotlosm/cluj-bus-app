# Route Name Display Issue Investigation

## 🔍 **Issue Identified:**
The `routeName` field in favorite bus data is showing route IDs instead of human-readable labels.

## 📊 **Data Flow Analysis:**

### **1. API Data Structure (TranzyRouteResponse):**
```typescript
interface TranzyRouteResponse {
  route_id: number;
  route_short_name: string;    // e.g., "42"
  route_long_name: string;     // e.g., "Mănăștur - Centru" 
  route_desc?: string;
  route_type: number;
}
```

### **2. Transformed Route Object:**
```typescript
interface Route {
  id: string;           // "42"
  shortName: string;    // "42" 
  longName: string;     // Should be "Mănăștur - Centru"
  description?: string;
  type: RouteType;
}
```

### **3. FavoriteBusInfo Creation:**
```typescript
const favoriteBus: FavoriteBusInfo = {
  routeId,
  routeName: routeDetails?.longName || `Route ${routeDetails?.shortName || routeId}`,
  routeShortName: routeDetails?.shortName || routeId,
  // ...
};
```

## 🐛 **Root Cause:**
The issue is likely that `routeDetails?.longName` from the API is either:
1. **Empty/null** - Falls back to `Route ${shortName}`
2. **Same as ID** - API returns ID instead of descriptive name
3. **Missing route data** - `routeDetails` is undefined

## 🔧 **Fix Implemented:**

### **Smart Route Name Logic:**
```typescript
const getDisplayRouteName = () => {
  const { routeName, routeShortName, routeId } = bus;
  
  // If routeName exists and is different from shortName and routeId, use it
  if (routeName && routeName !== routeShortName && routeName !== routeId && !routeName.startsWith('Route ')) {
    return routeName;
  }
  
  // Otherwise, create a proper label
  if (routeShortName && routeShortName !== routeId) {
    return `Route ${routeShortName}`;
  }
  
  return `Route ${routeId}`;
};
```

### **Logic Priority:**
1. **Use longName** if it's meaningful (different from ID/shortName)
2. **Create "Route X"** using shortName if available
3. **Fallback to "Route ID"** as last resort

## 🔍 **Debug Logging Added:**
```typescript
// Debug individual bus data
if (favoriteBusResult?.favoriteBuses) {
  favoriteBusResult.favoriteBuses.forEach((bus, index) => {
    console.log(`Bus ${index} route data:`, {
      routeId: bus.routeId,
      routeName: bus.routeName,
      routeShortName: bus.routeShortName,
      routeDescription: bus.routeDescription,
      routeType: bus.routeType
    });
  });
}
```

## 🎯 **Expected Outcomes:**

### **Before Fix:**
- Shows: "42" (just the ID)
- Problem: Not user-friendly

### **After Fix:**
- Shows: "Route 42" (proper label)
- Better: "Mănăștur - Centru" (if longName is available and meaningful)

## 🚀 **Testing Steps:**

1. **Check Console**: Look for debug logs showing actual route data
2. **Verify Display**: See if routes now show "Route X" instead of just "X"
3. **Compare Sources**: Check if some routes have better longName data than others

## 🔧 **Potential API Issues:**

### **If API Data is Poor:**
- `route_long_name` might be empty
- `route_long_name` might be same as `route_short_name`
- Route data might be missing entirely

### **Solutions:**
1. **Fallback Logic**: Always create meaningful labels
2. **Data Enhancement**: Could supplement with local route name database
3. **User Input**: Allow users to customize route names

## 📊 **Data Quality Check:**

### **Good Data Example:**
```json
{
  "route_id": 42,
  "route_short_name": "42",
  "route_long_name": "Mănăștur - Centru",
  "route_type": 3
}
```

### **Poor Data Example:**
```json
{
  "route_id": 42,
  "route_short_name": "42", 
  "route_long_name": "42",  // Same as short name!
  "route_type": 3
}
```

## 🎯 **Next Steps:**

1. **Monitor Console**: Check what actual route data looks like
2. **Verify Fix**: Confirm routes now show proper labels
3. **Data Quality**: Identify if API data quality is the root issue
4. **Enhancement**: Consider local route name database if API data is poor

The fix ensures that regardless of API data quality, users will always see meaningful route labels like "Route 42" instead of just "42".