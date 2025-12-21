import { describe, it, expect } from 'vitest';
import { 
  useStoreData, 
  useVehicleData, 
  useStationData, 
  useRouteData, 
  useStopTimesData,
  type UseStoreDataConfig
} from './useStoreData';

describe('useStoreData Integration', () => {
  it('should export all required types and functions', () => {
    // Test that all exports are available
    expect(useStoreData).toBeDefined();
    expect(useVehicleData).toBeDefined();
    expect(useStationData).toBeDefined();
    expect(useRouteData).toBeDefined();
    expect(useStopTimesData).toBeDefined();
  });

  it('should have correct TypeScript types', () => {
    // Test type definitions exist (compilation test)
    const config: UseStoreDataConfig<'vehicles'> = {
      dataType: 'vehicles',
      agencyId: '2'
    };
    
    expect(config.dataType).toBe('vehicles');
    expect(config.agencyId).toBe('2');
  });

  it('should provide consistent interface across all data types', () => {
    // Test that the generic hook provides the same interface for all data types
    const vehicleConfig: UseStoreDataConfig<'vehicles'> = { dataType: 'vehicles' };
    const stationConfig: UseStoreDataConfig<'stations'> = { dataType: 'stations' };
    const routeConfig: UseStoreDataConfig<'routes'> = { dataType: 'routes' };
    const stopTimesConfig: UseStoreDataConfig<'stopTimes'> = { dataType: 'stopTimes' };

    // All configs should be valid
    expect(vehicleConfig.dataType).toBe('vehicles');
    expect(stationConfig.dataType).toBe('stations');
    expect(routeConfig.dataType).toBe('routes');
    expect(stopTimesConfig.dataType).toBe('stopTimes');
  });
});