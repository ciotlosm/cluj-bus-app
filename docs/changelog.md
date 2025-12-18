# Changelog

## Recent Updates (December 2024)

### December 18, 2024 - Critical Memory Leak Fix
- **CRITICAL**: Fixed JavaScript heap out of memory error in useVehicleDisplay hook
- Resolved circular dependency causing infinite re-renders and memory explosion
- Optimized dependency arrays and memoization strategy
- Memory usage reduced from 4GB+ crash to stable ~130MB
- Test duration improved from 28-39s to 3.6s
- Transitioned to Tranzy API-only architecture
- Removed obsolete offline schedule functionality

### December 17, 2024 - Performance & UI Fixes  
- Fixed performance issues in Favorite Routes section
- Made dark theme the default
- Resolved browser crashes in Favorites view

### December 16, 2024 - Stability Improvements
- Fixed infinite loop causing browser crashes
- Restored bottom navigation functionality
- Centralized logging system

## Archive

For detailed historical changes, see `docs/archive/`