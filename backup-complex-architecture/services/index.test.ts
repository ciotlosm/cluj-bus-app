/**
 * Test for services index exports
 */

import { describe, it, expect } from 'vitest';
import { VehicleTransformationService, vehicleTransformationService } from './index';

describe('Services Index', () => {
  it('should export VehicleTransformationService class', () => {
    expect(VehicleTransformationService).toBeDefined();
    expect(typeof VehicleTransformationService).toBe('function');
  });

  it('should export vehicleTransformationService singleton', () => {
    expect(vehicleTransformationService).toBeDefined();
    expect(vehicleTransformationService).toBeInstanceOf(VehicleTransformationService);
  });

  it('should return same singleton instance', async () => {
    const module1 = await import('./index');
    const module2 = await import('./index');
    
    expect(module1.vehicleTransformationService).toBe(module2.vehicleTransformationService);
  });
});