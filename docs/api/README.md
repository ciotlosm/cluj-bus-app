# API Services

## Overview

Simple API services for Cluj Bus App using Tranzy API. All services use raw API field names with no transformations for consistency and simplicity.

## Available Services

### Core Services
- **vehicleService** - Get vehicle positions and tracking data
- **stationService** - Get stop information and locations  
- **routeService** - Get route definitions and metadata
- **tripService** - Get trip schedules and stop times
- **agencyService** - Get transit agency information
- **shapesService** - Get route geometry (polylines)

### Specialized Services
- **arrivalService** - Calculate real-time arrival estimates
- **locationService** - GPS location with error handling and retry logic

## Usage Example

```typescript
import { vehicleService, stationService } from '@/services';

// Get vehicles for an agency
const vehicles = await vehicleService.getVehicles('agency_id');

// Get stops for an agency  
const stops = await stationService.getStops('agency_id');
```

## Error Handling

All services include integrated error handling with status tracking. Location service includes retry logic with exponential backoff for GPS operations.

## Support

For additional support and documentation:

- **Developer Guide**: [../developer-guide.md](../developer-guide.md)
- **Troubleshooting**: [../troubleshooting/](../troubleshooting/)
- **Performance Analysis**: [../performance/](../performance/)

## Changelog

### Version 1.0.0 (Current)

- Initial release of VehicleTransformationService API documentation
- Complete transformation pipeline documentation
- Performance benchmark documentation
- Integration patterns and best practices
- Comprehensive troubleshooting guide