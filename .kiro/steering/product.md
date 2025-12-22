# Bus App - Product Overview

A real-time bus tracking application , using Tranzy API as the single data source for both live vehicle tracking and schedule information. 

## Core Features
- **Live Vehicle Tracking**: Real-time bus locations via Tranzy API
- **Smart Station Display**: Location-aware route tracking (work/home directions) to prioritize the right station on screen
- **Mobile-First Design**: Responsive Material Design interface
- **Offline Support**: Service worker for offline functionality.

## Key User Flows
- API key setup and validation
- Location-based configuration (home/work)
- Favorite route management
- Real-time bus tracking with confidence indicators based on how fresh is the data

## Technical Goals
- Reliability through proper error detection for network and gps status
- Performance with intelligent caching and auto-refresh
- User experience with clear confidence indicators and error handling