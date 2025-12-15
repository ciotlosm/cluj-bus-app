# API Authentication Fix - December 2024

## Issue Description
After TypeScript fixes and deployment, the favorite buses feature shows "No routes available for CTP Cluj" due to 403 authentication errors when calling the Tranzy API.

## Root Cause
The API requests are failing with 403 Forbidden errors due to missing `X-Agency-Id` header:
```
Proxy response: 403 /v1/opendata/agency
Proxy response: 403 /v1/opendata/routes
```

**SOLUTION FOUND**: Tranzy API requires `X-Agency-Id: 2` header for CTP Cluj requests.

## Diagnosis Steps

### 1. Check API Key Configuration
- Verify the API key is properly set in the app configuration
- Check if the API key is being passed correctly in request headers
- Ensure the API key format matches Tranzy API requirements

### 2. Check Request Headers
The enhanced API service now sets all required headers:
```typescript
config.headers.Authorization = `Bearer ${this.apiKey}`;
config.headers['X-API-Key'] = this.apiKey;
config.headers['X-Agency-Id'] = '2'; // CTP Cluj agency ID - THIS WAS MISSING!
```

### 3. Verify API Endpoint
- Development: `/api/tranzy/v1` (proxied)
- Production: `https://api.tranzy.ai/v1`

## Solution Steps

### Step 1: Verify API Key Setup
1. Open the app in browser
2. Go to Settings/Configuration
3. Check if API key is properly configured
4. If not set, add a valid Tranzy API key

### Step 2: Check Console Logs
Look for these log messages:
- "API key updated" - confirms key is set
- "Loading available routes for agency" - confirms loading attempt
- Any authentication errors

### Step 3: Test API Key Manually
Test the API key directly with the required agency ID:
```bash
curl -H "X-API-Key: YOUR_API_KEY" -H "X-Agency-Id: 2" https://api.tranzy.ai/v1/opendata/agency
```

## Implementation Fix

### Fixed Missing X-Agency-Id Header
✅ **COMPLETED**: Added `X-Agency-Id: 2` header to all API requests for CTP Cluj.

### Current Status: API Key Invalid ❌ CONFIRMED
**ISSUE**: API key `VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej` is invalid/expired.

**Evidence from browser console:**
```
Proxy response: 403 /v1/opendata/agency
Proxy response: 403 /v1/opendata/routes  
Proxy response: 403 /v1/opendata/vehicles
403 Error - Authentication failed. Check API key.
```

**Direct API test confirms:**
```bash
curl -H "X-API-Key: VO6FHv9mLe7CQOtPMJdWb8Za4LHJwegtxqgAJTej" -H "X-Agency-Id: 2" "https://api.tranzy.ai/v1/opendata/agency"
# Returns: {"message":"Forbidden resource","error":"Forbidden","statusCode":403}
```

### ✅ SOLUTION IMPLEMENTED
**New working API key provided for testing: `FjzSOp7tTFOH3CrRn1DZ5CnDr5H0HM6eunAltVr6`**

**Testing Results:**
```bash
# ✅ Agency endpoint works
curl -H "X-API-Key: FjzSOp7tTFOH3CrRn1DZ5CnDr5H0HM6eunAltVr6" -H "X-Agency-Id: 2" "https://api.tranzy.ai/v1/opendata/agency"
# Returns: 200 OK with agency data including "CTP Cluj" (agency_id: 2)

# ✅ Routes endpoint works  
curl -H "X-API-Key: FjzSOp7tTFOH3CrRn1DZ5CnDr5H0HM6eunAltVr6" -H "X-Agency-Id: 2" "https://api.tranzy.ai/v1/opendata/routes"
# Returns: 200 OK with route data
```

**Browser Console Shows Success:**
```
Proxy response: 200 /v1/opendata/agency
Proxy response: 200 /v1/opendata/routes
```

### 🔧 How to Test the New API Key

1. **Open the app**: http://localhost:5175
2. **Go to Settings** → **Configuration** 
3. **Replace API key** with: `FjzSOp7tTFOH3CrRn1DZ5CnDr5H0HM6eunAltVr6`
4. **Click "Test API Key"** - should show ✅ success
5. **Save Configuration**
6. **Check Favorite Buses** - should now load routes successfully

**Note**: This is a test API key - do not commit to git. Get your own from tranzy.ai for production use.

### Enhanced Error Handling
Added better error handling in the favorite bus store to show specific authentication errors to users.

## Prevention
- Add API key validation on configuration save
- Provide clear error messages for authentication failures
- Add retry logic with exponential backoff for temporary failures

## Related Files
- `src/stores/favoriteBusStore.ts` - Route loading logic
- `src/services/enhancedTranzyApi.ts` - API authentication
- `src/stores/configStore.ts` - API key storage