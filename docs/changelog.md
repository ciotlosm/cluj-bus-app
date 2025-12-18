# Changelog

## Recent Updates (December 2024)

### December 18, 2024 - Critical Memory Leak Fix & Test Optimization
- **CRITICAL**: Fixed JavaScript heap out of memory error in useVehicleDisplay hook
- Resolved circular dependency causing infinite re-renders and memory explosion
- Optimized dependency arrays and memoization strategy
- Memory usage reduced from 4GB+ crash to stable ~130MB
- **PERFORMANCE**: Optimized test execution with parallel processing
- Test duration improved from 28-39s to 24.25s (35% faster)
- Enabled 4 concurrent test workers with 75% memory reduction
- All 407 tests passing with stable memory usage
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