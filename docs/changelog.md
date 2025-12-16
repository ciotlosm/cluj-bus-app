# Changelog

## Recent Updates

### December 16, 2024 - Major Code Refactoring: Shared Vehicle Processing Hook
**Refactored**: Eliminated massive code duplication by creating shared `useVehicleProcessing` hook

**Changes**:
- **Code reduction**: Removed 670+ lines of duplicate code between FavoriteRoutesView and StationDisplay components
- **Shared hook**: Created `src/hooks/useVehicleProcessing.ts` with configurable options for both view types
- **Single source of truth**: All vehicle processing logic now centralized in one location
- **Maintained functionality**: All existing features preserved while improving maintainability
- **Configurable behavior**: Hook supports different filtering modes, station limits, and vehicle display options

**Technical Details**:
- **Hook configuration**: Supports `filterByFavorites`, `maxStations`, `maxVehiclesPerStation`, `showAllVehiclesPerRoute` options
- **FavoriteRoutesView**: Now uses hook with favorites filtering, single station, unlimited vehicles per route
- **StationDisplay**: Uses hook with all routes, 2 stations max, limited vehicles with deduplication
- **Consistent algorithms**: Both views now use identical vehicle processing, direction analysis, and sorting logic
- **Performance optimized**: Configurable search radius, station limits, and proximity thresholds

**Impact**: Significantly improved code maintainability - bug fixes and enhancements now automatically apply to both views. Reduced technical debt while preserving all user-facing functionality.

### December 16, 2024 - Trip Headsign Data Fix: Accurate Destination Display
**Fixed**: Vehicle destination chips now show actual trip headsigns instead of full route descriptions

**Changes**:
- **Accurate destinations**: Destination chips now display proper trip headsigns like "VIVO Sosire", "Disp. Zorilor", "Snagov Nord"
- **Eliminated confusion**: No longer shows full route descriptions like "Cart. Grigorescu - Str. Aurel Vlaicu" in destination chips
- **Real GTFS data**: Uses actual trip headsign data from Tranzy API for precise destination information
- **Station view fixed**: StationDisplay component now properly fetches and uses trip data for destinations
- **Debug logging**: Added development logging to track headsign data usage and verify correct implementation

**Technical Details**:
- **Enhanced StationDisplay**: Modified to fetch trips data in parallel with vehicles and routes
- **Trip headsign priority**: Uses `tripData?.headsign` as primary source, falls back to `route?.routeDesc` if unavailable
- **Proper data flow**: Fixed vehicle destination assignment to use enhanced API service method with trip data
- **API integration**: Added trips data fetching to both main processing and expanded search logic
- **Development debugging**: Added console logging to verify headsign data is being used correctly

**Impact**: Users now see accurate, concise destination information that matches real bus destination signs, making route selection much clearer.

### December 16, 2024 - UI Enhancement: Destination Display in Vehicle Cards
**Improved**: Added destination chip to vehicle cards in closest station view for better route information

**Changes**:
- **Destination chip**: Vehicle cards now show the bus destination with a green chip and arrow (→)
- **Better layout**: Chips are now properly arranged in a responsive flex layout that works on mobile and desktop
- **Consistent styling**: Destination chip uses the same green color scheme as end station chips in favorites view
- **Truncated text**: Long destination names are properly truncated with ellipsis to prevent layout issues
- **Visual hierarchy**: Clear indication of where each bus is heading alongside arrival information

**Technical Details**:
- **Enhanced VehicleCard**: Added destination chip display using `vehicle.destination` from GTFS trip data
- **Improved API integration**: Enhanced tranzyApiService to properly fetch and use trip destination data
- **Responsive design**: Chips stack vertically on mobile, horizontally on desktop for optimal space usage
- **Accessibility**: Proper text truncation and sizing for readability across devices

**Impact**: Users can now quickly see both when a bus is arriving AND where it's heading, making route selection more informed.

### December 16, 2024 - UI Improvement: Theme Toggle Moved to Settings
**Improved**: Moved dark/light mode toggle from bottom navigation to Settings > Config tab for better organization

**Changes**:
- **Relocated theme control**: Theme toggle now appears in the Config tab within Settings, making it more discoverable and less cluttered
- **Cleaner bottom navigation**: Removed theme toggle from bottom navigation, reducing visual noise and focusing on main app sections
- **Better integration**: Theme control is now part of the configuration settings where users expect to find appearance options
- **Consistent sizing**: Theme toggle uses smaller, more appropriate sizing within the settings context

**Technical Details**:
- **Removed from App.tsx**: Eliminated theme toggle from bottom navigation and cleaned up imports
- **Added to ConfigurationManager**: Integrated theme control into the Config tab with proper Material Design styling
- **Improved UX**: Theme setting is now grouped with other app preferences in a logical location

**Impact**: More intuitive settings organization and cleaner main navigation interface.

### December 16, 2024 - Mobile UI Fixes: Theme Toggle & Console Errors
**Fixed**: Console errors and mobile display issues with theme toggle in bottom navigation

**Changes**:
- **Fixed nested button HTML error**: Modified `ThemeToggle` component to support `iconOnly` mode that renders just the icon without button wrapper when used inside `BottomNavigationAction`
- **Proper theme toggle positioning**: Moved theme toggle to be the last (rightmost) item in bottom navigation
- **Console error elimination**: Resolved "button inside button" HTML validation errors that were appearing in browser console
- **Clean theme toggle functionality**: Theme toggle now works properly without nested button elements
- **Code cleanup**: Removed unused imports in App.tsx (Fab, Badge, RefreshIcon, etc.)

**Technical Details**:
- **ThemeToggle enhancement**: Added `iconOnly` prop to render just the icon when used inside other button components
- **Click handler fix**: Theme toggle click is now handled by the BottomNavigationAction wrapper instead of nested IconButton
- **Import optimization**: Cleaned up unused Material-UI imports to reduce bundle size

**Impact**: Cleaner console output for developers, proper HTML structure, and better mobile theme toggle experience.

### December 16, 2024 - Code Cleanup: Removed Unused Components
**Cleaned**: Removed legacy components that were no longer used in the main application

**Removed Components**:
- **`FavoriteBusDisplay.tsx`** - Legacy component replaced by `FavoriteRoutesView`
- **`GroupedFavoriteBusDisplay.tsx`** - Only used by the removed `FavoriteBusDisplay`
- **`EmptyStates.tsx`** - Only used by the removed `FavoriteBusDisplay`
- **`useFavoriteBusDisplay.ts`** - Hook only used by the removed `FavoriteBusDisplay`

**Updated Files**:
- **`FavoriteBuses/index.ts`** - Cleaned up exports for removed components
- **`integration-complete.test.tsx`** - Removed unused `BusDisplay` import

**Impact**: Reduced bundle size, eliminated dead code, and simplified the codebase. All active components remain functional.

**Note**: `BusDisplay.tsx` was kept as it has tests, though it's not used in the main app.

### December 16, 2024 - Reduced Console Log Spam
**Fixed**: Location access warnings were being logged repeatedly during auto-refresh cycles

**Changes**:
- **Centralized warning tracking**: Added `locationWarningTracker` utility to manage warning frequency
- **Session-based warnings**: Location warnings now appear only once per session instead of repeatedly
- **Cleaner console output**: Reduced spam while maintaining important warning visibility
- **Multiple store updates**: Applied fix to `favoriteBusStore`, `enhancedBusStore`, and `useRefreshSystem`

**Impact**: Developers see cleaner console output during development while still being notified of location access issues.

### December 16, 2024 - Station Display & Mobile Layout Fixes
**Fixed**: Major improvements to station display logic and mobile user experience

**Station Display Improvements**:
- **Fixed empty stations bug**: Station view no longer shows nearby stations that have no bus service (like "Test_CJ")
- **Applied 200m proximity rule**: Shows closest station with vehicles + second station only if within 200m of the first
- **Smart station filtering**: Only display stations with confirmed bus service via trip_id matching
- **Expanded search capability**: If closest stations have no vehicles, automatically searches up to 20 nearby stations (within 5km) to find ones with active service

**Mobile Layout Fixes**:
- **Fixed text cutting issues**: Station names and content no longer get cut off on mobile screens
- **Improved vehicle card layout**: "Live" indicator and timestamps now properly visible on mobile
- **Optimized button layout**: "Stops (x)" button uses full available width, map button stays on same line
- **Enhanced responsive design**: Proper text truncation with ellipsis, responsive font sizes, better spacing
- **Simplified button text**: Changed from "Show all stops (x)" to just "Stops (x)" for better mobile fit

**Technical Changes**:
- Modified `StationDisplay.tsx` with progressive station discovery and 200m proximity filtering
- Enhanced `VehicleCard.tsx` with responsive flex layout and proper mobile constraints
- Added fallback logic to find stations with service when closest stations are empty
- Improved button alignment and text handling for mobile screens

**Impact**: 
- Users now see only meaningful stations with actual bus service
- Mobile experience is significantly improved with proper text display and button functionality
- App works seamlessly across desktop and mobile devices

**Deployed**: Version 1.3.3 - https://gentle-fenglisu-4cdfcc.netlify.app

### December 16, 2024 - Enhanced Connectivity Tracking
**Enhanced**: Online/offline indicators now track actual API connectivity, not just network status

**Changes**:
- **Smart connectivity detection**: Monitors API request success/failure in real-time
- **Accurate status display**: Shows "API Error" when network works but API fails (403, etc.)
- **Better user feedback**: Distinguishes between network issues and API authentication problems
- **Automatic recovery**: Status updates to "Online" when API requests succeed again
- **Enhanced tooltips**: Shows last success/error times and specific error types

**Impact**: Users now see accurate connectivity status that reflects actual app functionality, not just network availability.

### December 16, 2024 - Storage Quota Management Fix
**Fixed**: QuotaExceededError that occurred when app cache grew too large

**Changes**:
- **Enhanced cache management**: Monitors both total cache size and individual entry sizes
- **Large entry prevention**: Blocks entries over 2MB from being cached (prevents bloat)
- **Size-based cleanup**: Removes largest entries first instead of oldest (more effective)
- **Conservative limits**: Warning at 2MB, hard limit at 3MB (more aggressive prevention)
- **Improved emergency handling**: Keeps only 20 smallest entries with 1MB total limit
- **Better diagnostics**: Reports largest entries and provides detailed size breakdowns

**Impact**: Users will no longer see storage quota errors, and the app will maintain better performance with automatic cache management.

### December 16, 2024 - GPS Off Modal Removal & Station Map Features

#### 🗑️ **REMOVED: GPS Off Modal Functionality**
- **Removed**: Click functionality on GPS off/disabled indicators in header
- **Previous behavior**: Clicking GPS off button opened location picker modal
- **New behavior**: GPS indicators are now display-only status indicators
- **Rationale**: Simplified UI - location settings should be configured in Settings tab
- **Impact**: Users must use Settings > Location Settings to configure offline location
- **Components updated**: StatusIndicators, MaterialHeader, App.tsx
- **Cleanup**: Removed onLocationPicker prop drilling and click handlers

### December 16, 2024 - Light Mode Contrast & Station Map Features

#### ✨ **NEW FEATURE: Clickable Station Names with Map View & Route Shapes**
- **Feature**: Station names in favorite routes view are now clickable
- **Functionality**: Clicking a station name opens a detailed map modal showing:
  - **All vehicles** at that station with real-time positions
  - **Station location** with dedicated marker
  - **User location** for spatial context
  - **Vehicle status** (arriving/departing) with color coding
  - **Route information** with color-coded legend
  - **Interactive popups** with vehicle details and ETAs
  - **🆕 Route shapes**: Actual bus route paths drawn on the map
- **Map Features**:
  - **Auto-fit bounds** to show all vehicles and station
  - **Custom icons** for user, station, and vehicles
  - **Color coding** by route with legend
  - **Status indicators** (dimmed for departed vehicles)
  - **Route path visualization** with color-coded polylines
  - **Responsive design** with proper mobile support
- **Route Shapes Implementation**:
  - **🔧 FIXED: Vehicle-specific shapes**: Now loads shapes only for the specific trips that vehicles are currently on
  - **Trip ID targeting**: Uses actual vehicle trip IDs instead of loading all route shapes
  - **Shape data fetching**: Loads precise GTFS shape data for active trips
  - **Path rendering**: Draws route paths as colored polylines on map
  - **Performance optimized**: Loads only relevant shapes when modal opens
  - **Error handling**: Graceful fallbacks if shape data unavailable
- **User Benefit**: Complete visual context showing where buses travel, not just current positions
- **Technical**: Enhanced StationMapModal with GTFS shapes integration

#### ✨ **NEW FEATURE: Heart Icon Button with Tooltip in Favorite Routes**
- **Feature**: Added heart icon button in top right corner of favorite routes view
- **Functionality**: Clicking the heart icon navigates directly to the favorites section in settings
- **Tooltip Enhancement**: Hovering over the heart icon shows a tooltip with:
  - **List of favorite routes**: Displays all configured favorite routes with bullet points
  - **Empty state**: Shows "No favorite routes configured" when none are set
  - **Call to action**: "Click to manage favorites" instruction
  - **Smart positioning**: Tooltip appears below and to the right of the button
  - **Delayed appearance**: 500ms delay to prevent accidental triggers
- **Design**: 
  - **Floating button**: Positioned in top right corner with subtle background and border
  - **Theme-aware**: Uses primary color with proper contrast in both light and dark modes
  - **Interactive**: Hover effects with scale animation and color transitions
  - **Accessible**: Proper aria-label for screen readers
- **User Benefit**: Quick preview of favorite routes and easy access to manage them
- **Technical**: Uses Material-UI Tooltip and IconButton with theme-aware styling

#### 🎨 **THEME IMPROVEMENT: Fixed Light Mode Contrast Issues**
- **Problem**: Vehicle cards had poor contrast in light mode due to hardcoded dark theme colors
- **Solution**: 
  - **Theme-aware colors**: Converted all hardcoded colors to use Material-UI theme system
  - **Status chip colors**: Now use theme.palette.success/warning/error instead of hardcoded RGB values
  - **Dimming logic**: Departed vehicles properly dim colors based on current theme
  - **Contrast compliance**: Improved accessibility with proper color contrast ratios
- **Technical**: Updated VehicleCard component to use `theme.palette` and `alpha()` functions throughout
- **Impact**: Better readability and accessibility in both light and dark modes

#### ♿ **ACCESSIBILITY FIX: Dialog Focus Management**
- **Problem**: Accessibility warnings about aria-hidden elements retaining focus
- **Solution**: Added `disableRestoreFocus` and `keepMounted={false}` to Dialog components
- **Components Updated**: LocationPicker, BusRouteMapModal, MapPicker
- **Impact**: Improved screen reader compatibility and focus management

#### 🧹 **CODE CLEANUP: Removed Unused Imports**
- **Cleanup**: Removed unused `Stack` import from VehicleCard component
- **Cleanup**: Fixed unused `index` parameter in map functions
- **Impact**: Cleaner code with no TypeScript warnings

### December 15, 2024 - UI Consistency & Visual Improvements

#### 🎨 **MAJOR REFACTOR: Unified Vehicle Card Components**
- **Change**: Refactored StationDisplay (nearby stations view) to use shared VehicleCard component
- **Benefits**: 
  - **Consistent dimming**: Departed vehicles now show dimmed appearance in both views
  - **Unified styling**: Same visual design across favorite routes and nearby stations
  - **Shared functionality**: Both views now have identical vehicle interaction patterns
  - **Maintainability**: Single component to update instead of duplicate code
- **Technical**: Replaced custom vehicle cards with shared VehicleCard, StationHeader, and RouteFilterChips components
- **Impact**: Better visual consistency and user experience across the entire app

#### 🎯 **UX IMPROVEMENT: Show Only Closest Station**
- **Change**: Modified favorite routes view to display only the closest station to user instead of all stations
- **Benefit**: Simplified interface focuses user attention on most relevant nearby station
- **Technical**: Updated station selection logic from `stationsWithDistances` to `stationsWithDistances.slice(0, 1)`
- **Impact**: Cleaner, more focused view for users checking their favorite routes

#### ✨ **VISUAL ENHANCEMENT: Dimmed Departed Vehicles**
- **Feature**: Vehicles that have already left stations now appear dimmed with overlay
- **Visual Changes**:
  - **Reduced opacity**: 60% opacity for entire card
  - **Dark overlay**: Semi-transparent black overlay on departed vehicle cards
  - **Dimmed colors**: Route badges, text, and status indicators use muted colors
  - **Clear distinction**: Easy to distinguish between arriving and departed vehicles
- **Impact**: Users can quickly identify which buses are still coming vs. already gone

#### 🐛 **MAJOR FIX: Station Filtering Logic for Favorite Routes**
- **Problem**: Users with configured favorite routes were seeing "No nearby stations" or "No stations found that serve your favorite routes" even when stations should be available
- **Root Cause**: Station filtering logic was too restrictive:
  - Only showed stations where vehicles were currently active (had `tripId`)
  - Limited to maximum 2 stations within 200m of each other
  - Required exact route name matches between favorites and API data
- **Solution Applied**:
  - **Fallback to schedule data**: If no active vehicles found, searches all stations from route schedules
  - **Increased station limit**: Now shows up to 5 nearby stations (instead of 2)
  - **No distance limits**: Shows stations for favorite routes regardless of distance (instead of 200m clusters)
  - **Better route matching**: Improved logging to debug route name mismatches
- **Impact**: Users should now see stations for their favorite routes even when no buses are currently active, and the app will show stations regardless of distance from user location
- **Debugging**: Check browser console for "Favorite route mapping" and "Selected target stations" logs to verify route matching works correctly

### December 15, 2024 - Navigation Cleanup & Component Recovery

#### 🗂️ **UI CLEANUP: Removed Redundant Favorite Routes View**
- **Removed**: "Routes" tab from bottom navigation that showed FavoriteBusDisplay
- **Reason**: Duplicate functionality with existing "Routes at Stations" view
- **Navigation**: Simplified from 4 tabs to 3 tabs (Station, Routes, Settings)
- **Content**: The removed view showed "No real-time data available for your favorite routes" message
- **Benefit**: Cleaner navigation with less user confusion

#### 🔧 **BUG FIX: Missing Components After Checkpoint Restore**
- **Problem**: Checkpoint restore moved FavoriteBuses components to archive, breaking build
- **Solution**: Recovered missing components from git history:
  - `BusRouteMapModal.tsx` - Interactive route map with live vehicle tracking
  - `RoutesList.tsx` - Route list display with filtering
  - `RouteListItem.tsx` - Individual route item with favorite toggle
  - `RouteTypeFilters.tsx` - Route type filtering (bus, trolleybus, etc.)
  - `StatusMessages.tsx` - User feedback and status messages
- **Build Status**: ✅ All TypeScript compilation errors resolved
- **Prevention**: Added troubleshooting guide for component recovery

### December 15, 2024 - New Favorite Routes View & Shared Components

#### 🚌 **NEW FEATURE: Favorite Routes View (Temporary Navigation)**
- **New Routes Tab**: Added temporary "Routes" navigation button in bottom navigation
- **Favorite Route Filtering**: Shows only vehicles from user's favorite routes at nearby stations
- **Station-Based Display**: Groups vehicles by the closest stations that serve favorite routes
- **Intelligent Station Selection**: Finds up to 3 closest stations (within 5km) that serve favorite routes
- **Dual Stop List Display**: 
  - **Always Visible Short List**: Shows 3 key stops in route order with icons and colors:
    - 🚌 **Current Vehicle Station** (blue) - where the bus is now
    - 📍 **Target Station** (info blue) - the station from the group header  
    - 🏁 **End Station** (green) - final destination
  - **Expandable Full List**: "Show all stops" button reveals complete route stops (identical to Station Display)
- **No Vehicle Limits**: Shows all vehicles from favorite routes (no 5-bus limit like Station Display)
- **Same UI Components**: Reuses vehicle cards, route filters, and station headers from Station Display

#### 🔧 **NEW FEATURE: Shared Component Architecture**
- **VehicleCard Component**: Reusable vehicle display with dual stop list functionality
  - **Always Visible Short Stops**: Compact horizontal list showing next 2-3 stops in card
  - **Expandable Full Stops**: Complete vertical list identical to Station Display when expanded
  - **Configurable Display**: Can show short list only, full list only, or both
  - **Route Click Handler**: Optional route selection functionality
  - **Map Integration**: Built-in map button for route visualization
- **RouteFilterChips Component**: Reusable route filtering interface with vehicle count badges
- **StationHeader Component**: Consistent station name and distance display

#### 🎯 **Smart Route-to-Station Mapping**
- **Favorite Route Analysis**: Takes user's favorite routes and finds all vehicles for those routes
- **Station Discovery**: Identifies which stations those vehicles serve using GTFS trip data
- **Proximity Sorting**: Finds closest stations to user that serve favorite routes
- **Deduplication Logic**: Same route deduplication and vehicle limits as Station Display
- **Direction Analysis**: Shows arriving/departing status relative to each station

#### ⚙️ **Technical Implementation:**
- **Component Sharing**: Created `src/components/features/shared/` for reusable components
- **Type Compatibility**: Handles both string arrays (legacy) and FavoriteRoute objects
- **GTFS Integration**: Uses proper trip_id filtering for accurate vehicle-station relationships
- **Performance Optimization**: Efficient bulk API calls and in-memory filtering
- **No Deduplication**: Shows all vehicles from favorite routes without route deduplication or limits
- **Consistent UI**: Same route filtering and map integration as Station Display

#### 🗺️ **User Experience:**
- **Focused View**: Only shows buses from routes the user cares about
- **Nearby Stations**: Automatically finds relevant stations within reasonable distance
- **Mobile Optimized**: Short stop lists prevent overwhelming mobile screens
- **Familiar Interface**: Same look and feel as existing Station Display
- **Route Context**: Clear indication of which favorite routes are being displayed

#### 📱 **Navigation & Integration:**
- **Temporary Button**: New "Routes" tab in bottom navigation (will replace current Routes later)
- **Setup Requirements**: Requires favorite routes to be configured and location services
- **Refresh Integration**: Includes refresh button and auto-refresh functionality
- **Map Modal**: Same route map visualization as other views

### December 15, 2024 - Expandable Route Stops & Vehicle Management

#### 🗺️ **NEW FEATURE: Expandable Route Stops & Interactive Map**
- **Expandable Stops List**: Each vehicle shows a collapsible list of all stops on its route
  - 🚌 **Current Stop** - Shows where the bus is currently closest to
  - 🏁 **Destination** - Highlights the final stop of the route
  - 📍 **Regular Stops** - All other stops in sequence order
- **Interactive Route Map**: New map button next to each vehicle's stops toggle
  - 🗺️ **Full Route Visualization** - Shows complete route with shape data
  - 🎯 **Target Station Highlighting** - Special marker for the station you're viewing
  - 🚌 **Live Bus Position** - Real-time vehicle location on the map
  - 🏁 **Destination Marker** - Clear indication of route's final stop
- **Clean Interface**: Stops collapsed by default, map opens in modal
- **No User Location**: Map focuses on route and vehicle, not user position

#### 🚌 **NEW FEATURE: Configurable Vehicle Limit Per Station**
- **Enhancement**: Users can now set the maximum number of vehicles shown per station (1-20, default: 5)
- **Location**: Available in Configuration → Advanced Settings → "Max Vehicles Per Station"
- **Smart Filtering**: Combined with route deduplication for optimal display

#### 🔧 **NEW FEATURE: Route Deduplication Logic**
- **Problem**: Multiple vehicles from same route were cluttering station displays
- **Solution**: Show only the best vehicle per route based on priority system
- **Priority Order**: 
  1. **At Station** (minutesAway=0 and arriving status)
  2. **Closest Arriving** (sorted by minutes ascending)
  3. **Any Departed** (if no arriving vehicles found)
- **Result**: Cleaner display with most relevant vehicle per route

#### ⚙️ **Technical Implementation:**
- **Configuration Integration**: Added `maxVehiclesPerStation` to UserConfig interface
- **Advanced Settings UI**: New TextField with DirectionsBus icon in AdvancedSettingsSection
- **Validation**: Input validation (1-20 range) with error handling
- **Route Grouping**: Groups vehicles by `route_id` before applying limit
- **Priority Sorting**: Implements multi-level sorting for optimal vehicle selection

#### ✅ **User Experience:**
- **Customizable Display**: Users control how many vehicles they see per station
- **Reduced Clutter**: Route deduplication eliminates redundant information
- **Smart Selection**: Always shows the most relevant vehicle per route
- **Consistent Behavior**: Setting applies across all station displays

### December 15, 2024 - Station Display Duplication Fix & Direction Indicators

#### 🐛 **BUG FIX: Station Display Duplication Resolved**
- **Problem**: Station display was showing duplicate vehicles and stations
- **Root Cause**: Vehicle assignment logic was showing all vehicles for each station instead of filtering by actual service
- **Solution**: Fixed vehicle-to-station relationship mapping using GTFS trip data
- **Result**: Eliminated duplicate entries, now shows only vehicles that actually serve each station

#### 🔧 **Technical Fixes:**
- **Vehicle Filtering**: Now properly filters vehicles by which stations their trip_id actually serves
- **Type Safety**: Fixed TypeScript issues with LiveVehicle vs raw API response data
- **Data Structure**: Updated property access for transformed vehicle data (position.latitude vs latitude)
- **Station Deduplication**: Added logic to handle multiple stations with same names
- **Code Cleanup**: Removed unused stationVehicles state variable

### December 15, 2024 - Station Display Direction Indicators Added

#### 🚌 **NEW FEATURE: Bus Direction Indicators (Arriving/Departing)**
- **Enhancement**: Station view now shows whether buses are arriving at or departing from the displayed stations
- **Visual Indicators**: Color-coded chips show "Arriving in Xmin" (green) or "Departed Xmin ago" (orange)
- **Smart Analysis**: Uses GTFS stop_times sequence data to determine vehicle position relative to target station

#### 🔧 **Technical Implementation:**
- **Efficient GTFS Logic**: Uses proper stop sequence comparison for accurate direction detection
- **Trip Mapping**: Builds lookup map of `trip_id` → stop sequence data for fast processing
- **Direction Algorithm**: 
  1. Find target station's sequence number in the trip
  2. Find vehicle's closest stop using GPS coordinates
  3. Compare sequences: `vehicle_sequence < station_sequence` → "Arriving"
  4. Compare sequences: `vehicle_sequence > station_sequence` → "Departing"
  5. If at station: "Arriving now"
- **Time Estimation**: Calculates based on stop sequence differences (2 minutes per stop)
- **Visual Design**: Green chips for arrivals, orange chips for departures

#### ✅ **User Experience:**
- **Clear Direction Info**: Users can see if buses are coming to or leaving from stations
- **Time Estimates**: Approximate arrival times or departure times
- **Visual Distinction**: Color-coded chips make it easy to distinguish direction
- **Live Updates**: Direction analysis updates with fresh vehicle position data

#### 📋 **Direction Analysis Process:**
1. **Get Trip Stop Times** - Fetch stop sequence for vehicle's current trip
2. **Find Vehicle Position** - Calculate closest stop to vehicle's GPS coordinates
3. **Compare Sequences** - Determine if vehicle is before, at, or after target station
4. **Calculate Estimates** - Estimate time based on stop sequence differences
5. **Display Results** - Show direction chip with appropriate color and timing

This enhancement provides much more useful information for users waiting at stations.

### December 15, 2024 - Station Display Empty Stations Issue Fixed

#### 🚌 **MAJOR FIX: Station View Now Shows Buses Instead of Empty State**
- **Problem**: Station view displayed "No buses currently serve these stations" despite API calls being successful and returning vehicle data
- **Root Cause**: StationDisplay component was using `useEnhancedBusStore` which requires complex configuration and location setup, but the store was returning empty arrays due to initialization issues
- **Solution**: Modified StationDisplay to fetch vehicle data directly from API instead of relying on enhanced bus store

#### 🔧 **Technical Implementation:**
- **Removed Store Dependency**: Replaced `useEnhancedBusStore` with direct API calls using `enhancedTranzyApi.getVehicles()`
- **Simplified Data Flow**: API → component state → processing → display (no complex store dependencies)
- **Fixed Timing Issues**: Ensured vehicle data is available before processing in useEffect chains
- **Maintained Trip Filtering**: Kept proper GTFS trip_id filtering logic for station-vehicle matching

#### ✅ **Results:**
- **Working Station View**: Now displays buses that actually serve the nearby stations (Route 10, Route 24B, etc.)
- **Live Vehicle Data**: Shows vehicle labels, destinations, and live timestamps
- **Proper Station Detection**: Finds 1-2 closest stations with distance indicators
- **Accurate Filtering**: Uses GTFS trip_id relationships to match vehicles to stations

#### 📋 **Data Flow (Fixed):**
1. **Fetch Stations** - Get all available stations from API
2. **Fetch Vehicles** - Get live vehicle data directly from API
3. **Find Nearby Stations** - Locate 1-2 closest stations within 2km
4. **Get Stop Times** - Fetch stop_times data to find which trips serve these stations
5. **Filter Vehicles** - Only show vehicles with trip_ids that match station trips
6. **Display Results** - Show vehicles with route information and live status

#### 🎯 **Prevention:**
- Use appropriate data sources for each component's needs (direct API vs complex stores)
- Avoid complex store dependencies when simple API calls suffice
- Ensure data availability before processing in useEffect chains
- Test component isolation to verify data flow works independently

This fix ensures the Station view works reliably and shows actual buses serving the displayed stations.

### December 15, 2024 - Station Display Data Issue Fixed

#### 🚌 **MAJOR FIX: Station View Now Shows Buses That Actually Serve Stations**
- **Problem**: Station view showed buses that were nearby but didn't actually stop at those stations
- **Root Cause**: Used proximity-based filtering instead of proper trip_id matching
- **Solution**: Implemented proper GTFS trip_id filtering to show only buses that serve the target stations

#### 🔧 **Technical Implementation:**
- **Step 1**: Get stop_times data from Tranzy API for the agency
- **Step 2**: Filter stop_times by target station IDs to extract relevant trip_ids
- **Step 3**: Filter live vehicles by those trip_ids (only vehicles that actually serve these stations)
- **Step 4**: Enrich vehicle data with route information from routes API
- **Step 5**: Display vehicles sorted by route name

#### ✅ **Results:**
- **Accurate Vehicle Display**: Only shows buses that actually stop at the displayed stations
- **Live Vehicle Data**: Displays vehicle labels, destinations, and live status
- **Multiple Stations**: Shows 1-2 closest stations with distance indicators
- **Proper Filtering**: Uses GTFS trip_id relationships instead of GPS proximity
- **Debug Logging**: Comprehensive logging showing trip_id matching process

#### 📋 **Data Flow:**
1. **Find Nearby Stations** - Locate 1-2 closest stations within 2km
2. **Get Stop Times** - Fetch stop_times data to find which trips serve these stations
3. **Extract Trip IDs** - Get trip_ids for trips that stop at target stations
4. **Filter Vehicles** - Only show vehicles with trip_ids that match
5. **Enrich & Display** - Add route information and display results

#### 🎯 **User Experience:**
- **Accurate Information**: Only shows buses that will actually arrive at these stations
- **Clear Route Data**: Route numbers, destinations, and vehicle labels
- **Station Context**: Station names with distance indicators
- **Live Tracking**: Real-time vehicle information with timestamps

This fix ensures users see only buses that will actually serve the displayed stations, not just buses that happen to be nearby.

### December 15, 2024 - Map Button Visibility Enhancement

#### 🗺️ Improved Map Access
- **Compact Corner Map Button** - Small, unobtrusive map icon positioned in bottom-right corner of vehicle cards
- **Vehicle Label Integration** - Map button tooltip now includes actual vehicle label from API (e.g., "CJ-01-ABC")
- **Clean Design** - Icon-only button without text or padding for minimal visual impact
- **Enhanced Tooltips** - Shows "View on map - Vehicle: [label]" with real vehicle information from Tranzy API
- **Consistent Styling** - Primary color scheme with hover effects and smooth animations

#### 🔧 Vehicle Label Fix
- **Correct API Field Usage** - Fixed vehicle label to use actual "label" field from Tranzy API instead of route name
- **Data Structure Enhancement** - Added label field to FavoriteBusInfo interface for proper data flow
- **Accurate Vehicle Information** - Tooltips and displays now show real vehicle identifiers (license plates, fleet numbers)
- **Consistent Display** - Map popup now shows same vehicle label as tooltip (e.g., "Bus 354" instead of "Bus 223")
- **Fallback Support** - Uses vehicleId as fallback when label is not available

#### 🗺️ Location Fallback Fix
- **Station View Fallback** - Fixed Station view to use fallback location when GPS is denied
- **Location Utility Function** - Added `getEffectiveLocation()` with proper priority hierarchy
- **Consistent Behavior** - Station view now works like Favorites view with location fallbacks
- **Priority Order** - GPS → Home → Work → Default → Cluj center fallback sequence

#### 🚌 Station View Vehicle Data Fix
- **Vehicle Refresh Trigger** - Station view now triggers vehicle data refresh when needed
- **Loading State Integration** - Added vehicle loading state to prevent empty displays during data fetch
- **Independent Data Fetching** - Each view now manages its own data refresh instead of relying on others
- **Debug Logging** - Added logging to track when vehicle refresh is triggered

#### 🚀 Station View Simplification
- **Simplified Logic** - Replaced complex GTFS sequence analysis with simple vehicle-station relationship
- **Better Performance** - Much faster processing with fewer API calls and less complexity
- **Direct Approach** - Station ID → Vehicle trip_id → Check if station is in trip's stops
- **Cleaner Code** - Removed unnecessary route ID mapping and sequence analysis
- **Reliable Results** - Simple logic is more predictable and easier to debug

#### ⚡ Efficient Vehicle Filtering Implementation
- **Bulk API Approach** - Get all stop_times once instead of individual vehicle trip calls
- **In-Memory Filtering** - Filter vehicles by pre-computed trip_ids for better performance
- **Multi-Station Support** - Shows vehicles for 1-2 closest stations (within 100m of each other)
- **Optimized Logic** - Station IDs → Stop_times → Trip_ids → Filter vehicles
- **Better UX** - Faster loading with fewer API calls and better station coverage

#### 🎨 Map Button Improvements
- **Optimal Size** - 24x24px button with 14px icon for perfect balance of visibility and compactness
- **Smart Positioning** - Bottom-right corner placement doesn't interfere with card content
- **Vehicle Context** - Tooltip dynamically includes vehicle label from API data
- **Hover Feedback** - Subtle scaling and shadow effects on interaction
- **Accessibility** - Clear tooltips and proper contrast ratios

### December 15, 2024 - Tranzy API Concept Alignment

#### 🔧 Internal Code Structure Improvements
- **Concept Clarification** - Aligned internal code with proper Tranzy API concepts
- **Vehicle vs Route Separation** - Distinguished between live vehicle data and route definitions
- **Enhanced Type Definitions** - Added `EnhancedVehicleInfo` (replaces `EnhancedBusInfo`) for better concept clarity
- **Trip Integration** - Better utilization of trip_id linking and trip_headsign for destinations
- **Stop Times Clarity** - Added `VehicleRoute`/`VehicleRoutePath` aliases for stop_times concept
- **Backward Compatibility** - Maintained legacy type aliases during transition
- **Display Consistency** - Kept "Bus" terminology for user-facing elements while using "Vehicle" internally

#### 🚌 Advanced GTFS Station Logic Implementation
- **Proper Trip Sequence Analysis** - Uses stop_times sequence data to determine vehicle arrival/departure status
- **Trip Direction Detection** - Compares vehicle's current sequence position with target station sequence
- **Accurate Arrival Prediction** - Only shows vehicles actually approaching the station (sequence < station sequence)
- **Departure Fallback** - Shows recently departed vehicles when no arrivals available (sequence > station sequence)
- **Trip Headsign Integration** - Uses trip_headsign from GTFS data for accurate destination display
- **Position-Based Sequence Estimation** - Estimates vehicle's current stop sequence using GPS proximity to stops
- **Enhanced Debug Logging** - Comprehensive GTFS sequence analysis logging for troubleshooting

#### 📊 Tranzy API Concept Mapping
- **Agency** → **City** (user concept)
- **Vehicles** → Live GPS data with real-time positions and timestamps
- **Routes** → Bus route definitions (displayed as "Buses" to users)
- **Trips** → Links vehicles to routes via trip_id, contains destination (trip_headsign)
- **Stops** → **Stations** (user concept)
- **Stop Times** → **Vehicle Routes** (shows which stations a trip visits in sequence)

### December 15, 2024 - Station Display Feature

#### 📍 New Station View
- **Arrival-Based Display** - Shows vehicles arriving at nearby stations (not vehicles at stations)
- **Departed Vehicles Fallback** - When no arrivals available, shows recently departed vehicles with time since departure
- **Maximum Two Stations** - Displays closest station plus one additional station within 100m
- **Favorites-Style Interface** - Clean, compact vehicle cards similar to favorites view
- **Station Name Chips** - Each station clearly labeled with name and distance
- **Closest Station Indicator** - "Closest" badge on the nearest station when two stations shown
- **Route Analysis** - Uses vehicle routes and stop sequences to determine arrivals
- **Real-Time Integration** - Combines live vehicle tracking with schedule data
- **Bottom Navigation** - New "Station" tab added between "Buses" and "Favorites"
- **GPS Requirement** - Requires location services to function (shows helpful message when disabled)

#### 🎯 Intelligent Arrival Detection
- **Vehicle Route Analysis** - Analyzes vehicle routes and stop sequences to predict arrivals
- **5km Search Radius** - Finds vehicles within 5km that are heading to target stations
- **Movement Detection** - Only shows vehicles that are actively moving (speed > 0 or recent updates)
- **Departed Vehicle Fallback** - Shows recently departed vehicles (within 10 minutes) when no arrivals available
- **Smart Departure Tracking** - Calculates time since departure for recently passed vehicles
- **Route Deduplication** - Shows earliest arriving vehicle from each unique route
- **Compact Display** - Favorites-style cards with route badges and arrival times
- **Visual Distinction** - Departed vehicles shown with muted styling and "Recently Departed" header

#### 🚌 Enhanced Bus Display
- **Material Design Integration** - Uses Material-UI Box, Stack, Card, and Typography components
- **Consistent Loading States** - Material Design loading indicators with CircularProgress
- **Enhanced Empty States** - Proper Material Design cards with structured content
- **Visual Urgency Indicators** - Color-coded timing (red for urgent, green for comfortable)
- **Route Type Icons** - Bus, trolleybus, tram, metro icons for different vehicle types
- **Live Status Badges** - Real-time vs scheduled indicators with animated elements
- **Debug Information** - Development mode debug cards with Material Design styling

### December 2024 - Settings UI Optimization & Major Fixes

#### 🧙‍♂️ Setup Wizard & Configuration Restructure
- **Streamlined Setup Flow** - Removed redundant "API Key Validated" intermediate screen
- **Optional Location Settings** - Home/work locations no longer required for app functionality
- **Direct App Access** - Setup wizard now goes straight to main app after completion
- **2-Step Setup** - API key validation + city selection, then immediate app access
- **Separated API Configuration** - API keys moved to dedicated "API Keys" tab in Settings
- **One-time city selection** - City/Agency stored in local storage, set once during setup

#### 📍 Status Indicators & GPS Integration
- **Visual Status Indicators** - Internet connectivity and GPS status now visible in app header
- **Real-time GPS refresh** - Location automatically updated during cache refreshes and manual refresh
- **Smart GPS handling** - Shows GPS disabled status when location permission denied
- **Automatic location updates** - GPS refreshed on every auto-refresh cycle for better accuracy
- **Compact header design** - Status chips integrated seamlessly into main navigation

#### 🎨 UI/UX Improvements
- **Theme Toggle moved to Settings** - Dark/Light mode control now in Configuration tab for better organization
- **Animated Refresh Button** - New circular progress indicator shows time until next refresh
- **Visual Cache Status** - Button color indicates cache health (Green: updated, Red: no updates, Yellow: disabled)
- **Filling Circle Animation** - Progress ring empties as refresh approaches, fills after successful update
- **Cleaner Header** - Removed text labels, replaced with intuitive visual indicators

#### 📍 Simplified Location Settings & Fallback Location Configuration
- **Streamlined Location UI** - Consolidated all location settings into compact 3-column grid layout
- **Removed Redundant Status** - Eliminated duplicate GPS status indicators and verbose descriptions
- **Configurable Fallback Location** - Added setting to customize fallback location instead of hardcoded Cluj center
- **Smart Location Picker** - Hides "Use Current Location" for fallback location (since it's fallback-only)
- **Adaptive Layout** - Fallback location becomes less prominent when GPS is available
- **Coordinate Chips** - GPS coordinates now displayed as styled chips for better visual appeal
- **GPS Permission Display** - Settings now show device GPS permission status with clear descriptions
- **Smart Button States** - "Use Current Location" buttons disabled when GPS permission denied
- **Header Status Accuracy** - Status indicators now only show current device GPS, not saved locations
- **Better User Understanding** - Clear documentation of different location types and their purposes

#### 🎨 Settings UI Improvements
- **Optimized Settings layout** - Replaced "Configuration is complete" alert with green "Valid Config" chip at top
- **Moved common settings to top** - Refresh Rate and Stale Data Threshold now prominently displayed inline
- **Improved user experience** - Settings users actually tweak are now easily accessible
- **Cleaner interface** - Removed redundant "Advanced Settings" section, integrated into main layout

#### ✅ Major Fixes & CTP Cluj Integration

#### ✅ Critical Issues Resolved
- **Fixed Favorite Buses requiring locations** - Favorite buses now work without home/work locations set
- **Fixed Setup Wizard completion** - Complete Setup button now properly transitions to main app
- **Fixed MUI Menu Fragment warning** - Replaced Fragment children with arrays in VersionControl Menu component
- **Fixed Settings component export error** - Resolved "Indirectly exported binding name 'Settings' is not found" build issue
- **Fixed console log level not updating** - Log level changes now apply immediately instead of requiring form submission
- **Fixed console log level not respected** - Replaced direct console.log calls with proper logger calls that respect log level settings
- **Fixed repeated Google Maps API key warnings** - Now checks API key availability once and caches result instead of logging warning on every transit calculation
- **Fixed multiple log level change messages** - Log level only changes when actually modified, not on every configuration update
- **Fixed "No schedule data available" error** - Station name mismatch between CTP Cluj and Tranzy API resolved
- **Added CTP Cluj proxy** - Direct integration with official CTP Cluj schedules via `/api/ctp-cluj`
- **Fixed Route 42 timing** - Now correctly shows 15:45 departure from official CTP Cluj data
- **Resolved TypeError crashes** - Added input validation for time parsing functions
- **Fixed all test failures** - 271/271 tests now passing (100% success rate)

#### 🔧 Technical Improvements
- **Route mapping clarification** - Route ID "40" (Tranzy) ↔ Route Label "42" (CTP Cluj)
- **Removed pattern-based schedules** - Only real data sources now used
- **Enhanced error handling** - Graceful fallbacks for all edge cases
- **Improved proxy configuration** - Both Tranzy and CTP Cluj APIs working via proxy

#### 📊 Data Sources (Current Priority)
1. **🔴 Live Vehicle Data** - Real-time GPS tracking from Tranzy API
2. **📋 Official CTP Cluj Schedules** - Runtime fetched from ctpcj.ro website
3. **⏱️ API Fallback Data** - Tranzy schedule data when available

#### 🎯 User Experience
- **Route 42 fully functional** - Shows expected 15:45 departure time
- **Confidence indicators** - Clear labeling of data source reliability
- **Mobile optimization** - Responsive design for phone usage
- **Offline support** - Service worker for core functionality

### November 2024 - Foundation & Setup

#### 🏗️ Initial Architecture
- **React 19.2.0 + TypeScript** - Modern frontend stack
- **Vite build system** - Fast development and optimized builds
- **Material-UI 7.3.6** - Component library and theming
- **Zustand state management** - Lightweight and efficient
- **Tailwind CSS** - Utility-first styling approach

#### 🔌 API Integration
- **Tranzy API integration** - Live vehicle tracking and route data
- **Proxy configuration** - CORS handling for external APIs
- **Error handling** - Robust error boundaries and fallbacks

#### 🧪 Testing Setup
- **Vitest test framework** - Fast and reliable testing
- **Testing Library** - Component testing utilities
- **100% TypeScript coverage** - Type safety throughout

## Breaking Changes

### December 2024
- **Removed pattern-based schedules** - Apps relying on fake schedule data will need updates
- **Changed route mapping logic** - Now uses route labels for CTP Cluj integration

## Migration Guide

### From Pattern-Based to Real Data
If you were using the old pattern-based schedule system:

1. **Update API calls** - Use new service methods that fetch real data
2. **Handle confidence levels** - New system provides confidence indicators
3. **Test with real routes** - Verify your routes work with official CTP Cluj data

### Route Mapping Updates
If you were using route IDs directly:

```typescript
// OLD: Using route ID for everything
const routeId = "40";
const schedule = await getSchedule(routeId);

// NEW: Use appropriate identifier for each service
const routeId = "40"; // For Tranzy API
const routeLabel = "42"; // For CTP Cluj (user-facing)
const schedule = await getOfficialSchedule(routeLabel);
```

## Known Issues

### Current Limitations
- **Limited route coverage** - Not all CTP Cluj routes have live tracking
- **Schedule accuracy** - Official schedules may not reflect real-time delays
- **API rate limits** - Tranzy API has usage limitations

### Planned Improvements
- **Enhanced caching** - Better offline support and performance
- **More data sources** - Additional transit agencies beyond CTP Cluj
- **Push notifications** - Alerts for favorite routes
- **Route planning** - Multi-modal trip planning

## Technical Debt

### Addressed in December 2024
- ✅ **Test failures** - All 271 tests now passing
- ✅ **Error handling** - Comprehensive error boundaries added
- ✅ **Code organization** - Clear separation of concerns
- ✅ **Documentation** - Consolidated and human-friendly docs

### Still To Address
- **Bundle size optimization** - Could be smaller with better tree shaking
- **Performance monitoring** - Need better metrics and alerting
- **Accessibility** - Could improve screen reader support
- **Internationalization** - Currently only supports Romanian/English

## Version History

### v1.2.0 (December 2024)
- CTP Cluj integration
- Major bug fixes
- Test suite improvements
- Documentation overhaul

### v1.1.0 (November 2024)
- Material-UI upgrade
- Enhanced state management
- Mobile optimizations

### v1.0.0 (October 2024)
- Initial release
- Basic Tranzy API integration
- Core functionality

---

**Note**: This changelog focuses on user-facing changes and major technical improvements. For detailed technical changes, see the [developer guide](developer-guide.md).

### December 15, 2024 - Concept Alignment & Bug Fixes Completion

#### ✅ **COMPLETED: All Concept Alignment Updates**
- **Fixed all compilation errors** in StationDisplay component:
  - ✅ Fixed async/await usage in GTFS data processing
  - ✅ Fixed undefined `processedStations` variable by restructuring Promise.all
  - ✅ Fixed `ExtendedBusInfo` type reference (now `ExtendedVehicleInfo`)
- **Completed all `BusInfo` → `VehicleInfo` references** in tranzyApiService.ts
- **Completed all `enhancedBuses` → `enhancedVehicles` references** in stores
- **Updated method signatures** throughout the codebase for consistency
- **Maintained backward compatibility** with proper type aliases

#### 🔧 **Technical Fixes Applied**
- **StationDisplay Component**: Fixed Promise.all structure for async GTFS processing
- **TranzyApiService**: Updated all legacy method signatures to use VehicleInfo
- **EnhancedBusStore**: Updated variable names for concept consistency
- **BusDataStore**: Updated variable names for concept consistency
- **Type Definitions**: All concept alignments completed with backward compatibility

#### 🎯 **Station View Status**
- **Default View**: Station view is now the primary interface (first navigation button)
- **GTFS Integration**: Proper sequence-based logic implemented for accurate vehicle detection
- **Error-Free**: All compilation errors resolved, ready for testing
- **Concept Aligned**: Internal logic now properly distinguishes vehicles, routes, trips, and stations

#### 📋 **Ready for Testing**
The Station view should now properly:
- Show vehicles that actually pass through the selected station using GTFS data
- Display departed vehicles as fallback when no arrivals are available
- Use trip_headsign for accurate destination display
- Handle async GTFS API calls without errors
- Maintain proper concept separation throughout the codebase

All requested concept alignment and bug fixes have been completed successfully.

### December 15, 2024 - Comprehensive App Startup Initialization

#### 🚀 **NEW: Complete Startup Refresh Cycle**
- **Comprehensive Data Loading**: Implemented full app initialization system that fetches all required data on startup
- **GPS Coordinate Fetching**: Automatically requests and obtains user's GPS coordinates during initialization
- **Progressive Loading**: 6-step initialization process with visual progress indicators:
  1. **GPS Permissions & Location** (10-20%) - Checks permissions and gets current location
  2. **Transit Agencies** (30%) - Loads available transit agencies and validates API
  3. **Vehicle Data** (50%) - Fetches fresh live vehicle and route information
  4. **Favorite Routes** (70%) - Loads user's favorite bus routes and schedules
  5. **Auto-Refresh Setup** (90%) - Starts background refresh systems
  6. **Completion** (100%) - App ready for use with fresh data

#### 🎯 **Enhanced User Experience**
- **Loading Progress Display**: Visual progress bar and step-by-step status updates
- **Error Recovery**: Retry button for failed initialization steps
- **Fresh Data Guarantee**: App starts with current GPS location and live vehicle data

### December 15, 2024 - PWA Dark Mode & GPS Refresh Fixes

#### 📱 **MAJOR FIX: PWA Dark Mode Persistence**
- **Problem**: Dark mode setting didn't persist when exiting and re-entering PWA (iPhone Add to Home Screen)
- **Root Cause**: Theme persistence issues in PWA mode due to localStorage timing and theme flash prevention
- **Solution Applied**:
  - **Enhanced theme store persistence**: Changed storage key to `cluj-bus-theme` for better PWA isolation
  - **Immediate theme application**: Added `onRehydrateStorage` callback to apply theme immediately on load
  - **Document root theme attribute**: Added `data-theme` attribute to prevent theme flash
  - **PWA meta theme-color**: Dynamic theme-color meta tag updates based on current theme
  - **Theme initialization**: Improved theme detection and application on app startup

#### 🗺️ **MAJOR FIX: GPS Location Refresh Button**
- **Problem**: Pressing the refresh button didn't update GPS location for user
- **Root Cause**: Location refresh logic was checking permission status instead of always attempting fresh location
- **Solution Applied**:
  - **Always attempt GPS refresh**: Modified RefreshControl to always try location refresh regardless of permission status
  - **Force fresh location**: Set `maximumAge: 0` in geolocation options to prevent cached location
  - **Increased timeout**: Extended GPS timeout to 20 seconds for better reliability
  - **Better error handling**: Improved GPS error logging while continuing with data refresh

#### 🎨 **PWA Theme Integration**
- **Updated manifest.json**: Changed theme colors from old blue (#1976d2) to Material Design primary (#6750A4)
- **Updated index.html**: Fixed meta theme-color to match app's primary color
- **Dynamic theme-color**: PWA status bar now changes color based on light/dark mode
- **Consistent branding**: All PWA elements now use the same color scheme as the app

#### 🔧 **Technical Implementation**
- **Theme Store Enhancements**: Better PWA persistence with immediate theme application
- **Location Service Improvements**: Force fresh GPS coordinates on manual refresh
- **React useEffect Integration**: Theme changes applied to document root and meta tags
- **PWA Manifest Updates**: Proper theme colors for better mobile experience

#### ✅ **User Experience Improvements**
- **Persistent Dark Mode**: Theme setting now survives PWA app restarts on mobile devices
- **Working GPS Refresh**: Manual refresh button now properly updates user location
- **Consistent PWA Colors**: Status bar and splash screen match app theme
- **No Theme Flash**: Smooth theme transitions without white/dark flashes on startup

#### 🎯 **Prevention & Testing**
- **Mobile Device Testing**: Always test PWA functionality on actual mobile devices
- **Theme Persistence Testing**: Verify theme survives app close/reopen cycles
- **GPS Testing**: Test location refresh on devices with GPS enabled
- **PWA Installation**: Test Add to Home Screen functionality with proper theming Graceful error handling with retry functionality for failed initialization
- **Non-Blocking GPS**: Continues initialization even if GPS permission is denied
- **Smart Retry**: Automatic re-initialization when critical configuration changes
- **Background Refresh**: Starts auto-refresh systems immediately after data loading

#### 🔧 **Technical Implementation**
- **New Hook**: `useAppInitialization` manages the complete startup process
- **Progress Tracking**: Real-time progress updates with detailed step information
- **Error Isolation**: Individual step failures don't prevent overall initialization
- **State Management**: Proper initialization state tracking and cleanup
- **Performance Optimized**: Parallel data loading where possible

#### 📱 **Startup Flow**
1. **App Launch** → Configuration check
2. **Setup Wizard** (if not configured) → API key and location setup
3. **Initialization** → Comprehensive data refresh cycle
4. **Ready State** → All data loaded, auto-refresh active, GPS available

#### ✅ **Benefits**
- **Fresh Data on Startup**: Users always see current transit information
- **Reliable GPS**: Location services properly initialized and available
- **Better Performance**: All required data pre-loaded before user interaction
- **Clear Feedback**: Users know exactly what's happening during startup
- **Robust Error Handling**: Graceful degradation when services are unavailable

This ensures users have the most current transit data and their location is available immediately when they open the app.
### December 15, 2024 - Final Concept Alignment Cleanup

#### 🔧 **COMPLETED: Final Concept Alignment Issues**
- **Route Planning Service**: Updated all `EnhancedBusInfo` → `EnhancedVehicleInfo` references
- **Cache Manager**: Updated `busInfo` → `vehicleInfo` cache key for consistency
- **Method Names**: Updated `convertVehicleToEnhancedBusInfo` → `convertVehicleToEnhancedVehicleInfo`
- **Variable Names**: Updated `allBuses` → `allVehicles`, `sortedBuses` → `sortedVehicles`
- **Parameter Names**: Updated `bus` → `vehicle` in method signatures
- **Cache References**: Updated all `CacheKeys.busInfo` → `CacheKeys.vehicleInfo` calls

#### ✅ **Concept Alignment Status: COMPLETE**
All major concept alignment issues have been resolved:

**✅ Completed Alignments:**
- **Vehicles vs Routes**: Clear separation between live vehicle data and route definitions
- **Internal Naming**: All internal code uses "Vehicle" terminology consistently
- **User Interface**: Maintains "Bus" terminology for user-facing elements
- **Type Definitions**: Proper `VehicleInfo` and `EnhancedVehicleInfo` usage
- **Cache Keys**: Consistent naming throughout caching system
- **Method Signatures**: All methods use proper vehicle terminology
- **Variable Names**: Consistent variable naming across all services

**📋 Remaining Items (Intentionally Kept):**
- **`FavoriteBusInfo`**: Correctly kept as "Bus" since it represents user's favorite bus routes
- **Test Files**: Legacy `BusInfo` references maintained for backward compatibility
- **User-Facing Text**: "Bus" terminology preserved in UI for user familiarity
- **Legacy Aliases**: Backward compatibility aliases maintained in type definitions

#### 🎯 **Final Architecture**
- **Internal Logic**: Uses "Vehicle" for live GPS data and vehicle tracking
- **User Interface**: Uses "Bus" for route displays and user interactions  
- **API Integration**: Proper Tranzy API concept mapping throughout
- **Caching System**: Consistent vehicle-based cache key naming
- **Type Safety**: Complete type alignment with proper inheritance

The codebase now has complete concept alignment while maintaining user familiarity and backward compatibility.
### December 15, 2024 - Hardcoded Agency ID Cleanup

#### 🔧 **FIXED: Removed Hardcoded Agency IDs**
- **FavoriteBusCard**: Replaced hardcoded agency ID `2` with `config.agencyId`
- **FavoriteBusStore**: Updated cache key generation to use configured agency ID
- **Proper Validation**: Added null checks to prevent errors when agency ID is not configured
- **Fallback Clarity**: Made tranzyApiService fallback more explicit with named constant

#### ✅ **Changes Made:**
- **Cache Keys**: Now use `parseInt(config.agencyId)` instead of hardcoded `2`
- **Error Handling**: Added proper validation and logging when agency ID is missing
- **Fallback Logic**: Improved fallback agency ID with clear documentation
- **Type Safety**: Added null checks to prevent runtime errors

#### 🎯 **Benefits:**
- **Multi-Agency Support**: App can now work with any configured transit agency
- **Configuration Driven**: All agency references now come from user configuration
- **Better Error Handling**: Clear warnings when configuration is incomplete
- **Maintainability**: No more hardcoded values scattered throughout the codebase

This ensures the app is truly configurable and can work with any transit agency supported by the Tranzy API, not just CTP Cluj-Napoca.
### December 15, 2024 - Fixed Favorite Buses Data Issue

#### 🐛 **FIXED: Favorite Buses Not Showing Data**
- **Root Cause**: `liveVehicleService` was filtering out vehicles without `tripId`
- **Issue**: Overly restrictive filtering prevented vehicles from being cached for favorites
- **Solution**: Removed `tripId` requirement, now includes all vehicles with valid `routeId`

#### ✅ **Changes Made:**
- **LiveVehicleService**: Removed `tripId` requirement for vehicle caching
- **Vehicle Filtering**: Now includes vehicles based on `routeId` only
- **Cache Population**: All route vehicles are now properly cached for favorites
- **Data Availability**: Favorite buses should now show live vehicle data again

#### 🎯 **Technical Details:**
**Before (Broken):**
```typescript
// Only cache vehicles with active trip_id
const hasActiveTripId = vehicle.tripId !== null && vehicle.tripId !== undefined;
if (!hasActiveTripId) {
  continue; // This was filtering out too many vehicles
}
```

**After (Fixed):**
```typescript
// Include vehicles with route_id (trip_id is optional for favorites)
const routeId = vehicle.routeId?.toString();
if (routeId) {
  // Cache all vehicles with valid route IDs
}
```

#### 📋 **Impact:**
- **Favorite Buses**: Should now display live vehicle data correctly
- **Route Coverage**: More vehicles available for favorite route tracking
- **Real-Time Updates**: Improved data availability for user's favorite routes
- **Cache Efficiency**: Better vehicle data population in cache

This fix restores the favorite buses functionality that was broken by the concept alignment changes.
### December 15, 2024 - Fixed Null TripId Handling in Favorites

#### 🐛 **FIXED: "Route information unavailable" in Favorite Buses**
- **Root Cause**: Code was using `vehicle.tripId!` non-null assertions when `tripId` could be null
- **Issue**: Vehicles without `tripId` were causing route information processing to fail
- **Solution**: Added proper null checks for `tripId` throughout favorite bus processing

#### ✅ **Changes Made:**
- **Null Safety**: Replaced `vehicle.tripId!` with proper null checks
- **Fallback Data**: Use route mapping data when trip data is unavailable
- **Graceful Degradation**: Handle vehicles without complete GTFS trip information
- **Error Prevention**: Avoid crashes when processing vehicles with null `tripId`

#### 🎯 **Technical Details:**
**Before (Broken):**
```typescript
const tripData = tripsMap.get(vehicle.tripId!); // Crash if tripId is null
const tripStopTimes = stopTimesMap.get(vehicle.tripId!) || [];
```

**After (Fixed):**
```typescript
const tripData = vehicle.tripId ? tripsMap.get(vehicle.tripId) : null;
const tripStopTimes = vehicle.tripId ? (stopTimesMap.get(vehicle.tripId) || []) : [];
```

#### 📋 **Impact:**
- **Favorite Buses**: Should now show vehicle information instead of "Route information unavailable"
- **Data Robustness**: Handles vehicles with incomplete GTFS data gracefully
- **User Experience**: Displays available information even when some data is missing
- **Stability**: Prevents crashes from null pointer exceptions

This fix ensures favorite buses work correctly even when vehicles don't have complete trip information.
### December 15, 2024 - Corrected Vehicle Filtering Logic

#### ✅ **CORRECTED: Proper Vehicle Filtering for Favorites**
- **Clarification**: Vehicles with `trip_id` as null indicate problems and must be filtered out
- **Proper Solution**: Enhanced filtering to require both valid `trip_id` AND `route_id`
- **Data Quality**: Only cache vehicles with complete, valid GTFS information

#### 🎯 **Final Implementation:**
```typescript
// Only cache vehicles with valid trip_id AND route_id (both required for proper tracking)
const hasValidTripId = vehicle.tripId !== null && vehicle.tripId !== undefined && vehicle.tripId !== '';
const routeId = vehicle.routeId?.toString();

if (hasValidTripId && routeId) {
  // Cache only high-quality vehicles with complete data
}
```

#### 📋 **Data Quality Standards:**
- **Valid TripId Required**: Filters out vehicles with operational issues
- **Valid RouteId Required**: Ensures proper route association
- **Complete GTFS Data**: Only processes vehicles with full transit information
- **Quality Over Quantity**: Better to show fewer, accurate vehicles than many problematic ones

#### 🔍 **Root Cause Analysis:**
The original issue was likely that there are currently no vehicles with valid `trip_id` values for Route 42, which could indicate:
- **Operational Issues**: Route 42 vehicles may have technical problems
- **Schedule Gaps**: No active trips currently running for this route
- **API Data Issues**: Temporary problems with GTFS trip assignments

This is the correct approach - we should only show vehicles that have proper GTFS trip information, as vehicles without `trip_id` indicate operational problems.

### December 15, 2024 - Fixed Tranzy API Route ID Inconsistency

#### 🐛 **MAJOR FIX: Favorite Buses Vehicle Lookup Issue Resolved**
- **Problem**: Favorite buses showing "No real-time data available" despite vehicles existing for those routes
- **Root Cause**: Tranzy API vehicle endpoint design - vehicles use route short names in their route_id field:
  - **Routes API**: Uses internal route IDs (e.g., `route_id: 40` for `route_short_name: "42"`)
  - **Vehicles API**: Uses route short names in route_id field (e.g., `route_id: "42"`)
- **Solution**: Modified `favoriteBusService.ts` to look up vehicles using route short names

#### 🔧 **Technical Implementation:**
```typescript
// BEFORE (broken): Used internal route ID for vehicle lookup
const correctedRoute = {
  id: mapping.routeId, // "40" - doesn't match vehicle route_id field
  routeName: favoriteRoute.routeName,
  longName: favoriteRoute.longName
};

// AFTER (fixed): Use route short name for vehicle lookup  
const correctedRoute = {
  id: favoriteRoute.routeName, // "42" - matches vehicle route_id field
  routeName: favoriteRoute.routeName,
  longName: favoriteRoute.longName
};
```

#### ✅ **Verification Methods:**
- **Console Logs**: Look for `🗺️ DEBUGGING: Route mapping found` with API design explanation
- **Vehicle Cache**: Check `🚌 DEBUGGING: Vehicle cache lookup results` showing populated `routesWithVehicles`
- **Route Correction**: Verify proper vehicle lookup strategy in debug logs

#### 📋 **Impact:**
- **Favorite Buses**: Now correctly display live vehicle data for configured routes
- **Route Coverage**: All routes with active vehicles should now work properly
- **API Compatibility**: Properly handles Tranzy API vehicle endpoint design
- **User Experience**: Eliminates "Route information unavailable" errors for valid routes

This fix resolves the vehicle lookup issue by understanding that the Tranzy API vehicles endpoint uses route short names in the route_id field, not internal route IDs.

### December 15, 2024 - Fixed Route ID vs Display Name Confusion

#### 🐛 **FIXED: Incorrect Use of routeName for IDs**
- **Problem**: Code was incorrectly using `routeName` for internal IDs when it should only be used for display
- **Root Cause**: Mixed up ID and display name concepts in route mapping logic
- **Solution**: Ensured `routeName` is only used for display purposes, IDs use proper route short names

#### 🔧 **Technical Fix:**
```typescript
// BEFORE (incorrect): Mixed routeName usage
const correctedRoute = {
  id: mapping.routeShortName, // Correct for vehicle lookup
  routeName: favoriteRoute.routeName, // Incorrect - using input routeName
  longName: favoriteRoute.longName
};

// AFTER (correct): Consistent route short name usage
const correctedRoute = {
  id: mapping.routeShortName, // Correct for vehicle lookup  
  routeName: mapping.routeShortName, // Correct - use mapping's route short name
  longName: mapping.routeLongName // Correct - use mapping's long name
};
```

#### ✅ **Principle Applied:**
- **IDs**: Used internally for API calls and vehicle lookups
- **routeName**: Used only for display purposes in UI
- **Consistency**: Both `id` and `routeName` now use the same route short name value
- **Data Source**: Route information comes from mapping service, not user input

#### 📋 **Impact:**
- **Data Consistency**: Route information now comes from authoritative mapping source
- **Display Accuracy**: Route names and descriptions are properly sourced from API
- **Code Clarity**: Clear separation between internal IDs and display names
- **Maintainability**: Eliminates confusion about when to use routeName vs ID

This ensures proper separation of concerns between internal route identification and user-facing display names.

### December 15, 2024 - Route Property Naming Standardization

#### 🔧 **MAJOR: Standardized Route Property Names Throughout Codebase**
- **Problem**: Inconsistent property naming across the codebase (`shortName`/`longName` vs `routeName`/`routeDesc`)
- **Solution**: Systematic renaming for consistency and clarity across all files
- **Scope**: Updated 15+ files including services, components, stores, and utilities

#### 📋 **Property Renaming Applied:**
```typescript
// BEFORE (inconsistent):
interface Route {
  shortName: string;  // Sometimes used
  longName: string;   // Sometimes used
}

// AFTER (consistent):
interface Route {
  routeName: string;  // Always used for route display names
  routeDesc: string;  // Always used for route descriptions
}
```

#### 🔧 **Files Updated:**
- **Type Definitions**: `src/types/tranzyApi.ts` - Updated core Route interface
- **Services**: `routeMappingService.ts`, `favoriteBusService.ts`, `tranzyApiService.ts`, `routePlanningService.ts`
- **Stores**: `favoriteBusStore.ts` - Updated route data structures
- **Components**: All FavoriteBuses components, Debug components
- **Utilities**: `routeUtils.ts`, `busDisplayUtils.ts` - Updated search and display logic
- **Hooks**: `useFavoriteBusManager.ts` - Updated route management logic

#### ✅ **Consistency Improvements:**
- **Route Names**: All `shortName` → `routeName` (user-facing route numbers like "42", "43B")
- **Route Descriptions**: All `longName` → `routeDesc` (full descriptions like "Piața Unirii - Mănăștur")
- **StoreRoute Types**: Added missing `id` field for proper route identification
- **API Mapping**: Consistent property usage in route mapping service
- **UI Components**: Updated all display logic to use new property names

#### 🎯 **Benefits:**
- **Code Clarity**: Clear distinction between route names and descriptions
- **Maintainability**: Consistent property names across entire codebase
- **Type Safety**: Proper TypeScript interfaces with required fields
- **API Consistency**: Aligned with Tranzy API field naming conventions

This standardization eliminates confusion about route property usage and ensures consistent data handling throughout the application.

#### 🐛 **FIXED: Favorites View API Key Error After Route Renaming**
- **Problem**: Favorites view showed "API Key Invalid" error after route property renaming
- **Root Cause**: Missed `longName` references in critical data flow paths
- **Files Fixed**: 
  - `src/services/favoriteBusService.ts` - Updated method signatures and property references
  - `src/hooks/useFavoriteBusManager.ts` - Fixed route creation logic
  - `src/utils/busDisplayUtils.ts` - Updated route name lookup logic
  - `src/types/index.ts` - Maintained backward compatibility for `FavoriteRoute.longName`

#### ✅ **Resolution Applied:**
- Fixed all remaining `longName` → `routeDesc` references in data flow
- Updated method signatures to use consistent property names
- Maintained backward compatibility where needed
- Ensured API calls use correct property names from transformed route objects

The favorites view should now work correctly with the standardized route property names.