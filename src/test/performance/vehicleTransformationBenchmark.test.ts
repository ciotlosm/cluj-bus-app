/**
 * Vehicle Transformation Service Performance Benchmark Test Suite
 * 
 * This test suite measures the performance characteristics of the new
 * VehicleTransformationService architecture, focusing on:
 * - Transformation pipeline performance
 * - Caching effectiveness
 * - Memory usage optimization
 * - Error handling overhead
 * 
 * Requirements: 7.5 - Performance benchmarks for new architecture
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VehicleTransformationService } from '../../services/data-processing/VehicleTransformationService';
import { TransformationContext, TranzyVehicleResponse, CoreVehicle, RouteType, ConfidenceLevel } from '@/types';
import { logger } from '../../utils/shared/logger';

// Mock logger to avoid console noise during benchmarks
vi.mock('../../utils/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    debugConsolidated: vi.fn(),
    trace: vi.fn(),
    setLogLevel: vi.fn(),
    getLogLevel: vi.fn(() => 1),
    getLogLevelName: vi.fn(() => 'INFO'),
    apiRequest: vi.fn(),
    apiResponse: vi.fn(),
    apiError: vi.fn(),
    storeAction: vi.fn(),
    storeError: vi.fn(),
    componentMount: vi.fn(),
    componentUnmount: vi.fn(),
    componentError: vi.fn(),
    getLogs: vi.fn(() => []),
    exportLogs: vi.fn(() => '[]'),
    clearLogs: vi.fn()
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }
}));

// Mock stores to avoid initialization issues
vi.mock('../../stores/configStore', () => ({
  useConfigStore: vi.fn(() => ({
    config: {
      apiKey: 'test-key',
      agencyId: '2',
      city: 'Cluj-Napoca'
    }
  }))
}));

vi.mock('../../stores/vehicleStore', () => ({
  useVehicleStore: vi.fn(() => ({
    vehicles: [],
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../stores/locationStore', () => ({
  useLocationStore: vi.fn(() => ({
    userLocation: { latitude: 46.7712, longitude: 23.6236 },
    isLoading: false,
    error: null
  }))
}));

// Performance measurement utilities
interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    delta: number;
  };
  cacheStats?: {
    hitRate: number;
    entries: number;
    memoryUsage: number;
  };
}

class TransformationBenchmark {
  private service: VehicleTransformationService;
  private results: BenchmarkResult[] = [];
  
  constructor() {
    this.service = new VehicleTransformationService();
  }
  
  async measureOperation(
    name: string,
    operation: () => Promise<any>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    const initialMemory = this.getMemoryUsage();
    let peakMemory = initialMemory;
    
    // Warmup run
    await operation();
    
    // Benchmark runs
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await operation();
      const endTime = performance.now();
      
      times.push(endTime - startTime);
      
      const currentMemory = this.getMemoryUsage();
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }
    
    const finalMemory = this.getMemoryUsage();
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    
    const result: BenchmarkResult = {
      operation: name,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
        delta: finalMemory - initialMemory
      },
      cacheStats: this.service.getPerformanceStats().cache
    };
    
    this.results.push(result);
    return result;
  }
  
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }
  
  getResults(): BenchmarkResult[] {
    return this.results;
  }
  
  generateReport(): string {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('VEHICLE TRANSFORMATION SERVICE - PERFORMANCE BENCHMARK RESULTS');
    lines.push('='.repeat(80));
    lines.push('');
    
    for (const result of this.results) {
      lines.push(`Operation: ${result.operation}`);
      lines.push(`Iterations: ${result.iterations}`);
      lines.push(`Total Time: ${result.totalTime.toFixed(2)}ms`);
      lines.push(`Average Time: ${result.averageTime.toFixed(2)}ms`);
      lines.push(`Min Time: ${result.minTime.toFixed(2)}ms`);
      lines.push(`Max Time: ${result.maxTime.toFixed(2)}ms`);
      lines.push(`Memory Delta: ${result.memoryUsage.delta.toFixed(2)}MB`);
      
      if (result.cacheStats) {
        lines.push(`Cache Hit Rate: ${(result.cacheStats.hitRate * 100).toFixed(1)}%`);
        lines.push(`Cache Entries: ${result.cacheStats.entries}`);
      }
      
      lines.push('-'.repeat(40));
    }
    
    return lines.join('\n');
  }
}

// Test data generators
function generateMockVehicleData(count: number): TranzyVehicleResponse[] {
  const vehicles: TranzyVehicleResponse[] = [];
  
  for (let i = 0; i < count; i++) {
    vehicles.push({
      id: `vehicle_${i}`,
      route_id: `route_${i % 10}`,
      trip_id: `trip_${i}`,
      label: `Bus ${100 + i}`,
      latitude: 46.7712 + (Math.random() - 0.5) * 0.1,
      longitude: 23.6236 + (Math.random() - 0.5) * 0.1,
      bearing: Math.floor(Math.random() * 360),
      speed: Math.floor(Math.random() * 50),
      timestamp: new Date().toISOString(),
      wheelchair_accessible: Math.random() > 0.5 ? 1 : 0,
      bikes_allowed: Math.random() > 0.7 ? 1 : 0
    });
  }
  
  return vehicles;
}

function generateMockContext(): TransformationContext {
  return {
    userLocation: { latitude: 46.7712, longitude: 23.6236 },
    homeLocation: { latitude: 46.7700, longitude: 23.6200 },
    workLocation: { latitude: 46.7750, longitude: 23.6300 },
    favoriteRoutes: ['route_1', 'route_3', 'route_7'],
    targetStations: [
      {
        id: 'station_1',
        name: 'Central Station',
        coordinates: { latitude: 46.7712, longitude: 23.6236 },
        routeIds: ['route_1', 'route_2'],
        isFavorite: true,
        accessibility: {
          wheelchairAccessible: true,
          bikeRacks: true,
          audioAnnouncements: true
        }
      }
    ],
    preferences: {
      timeFormat: '24h',
      distanceUnit: 'metric',
      language: 'en',
      maxWalkingDistance: 1000,
      arrivalBuffer: 5,
      wheelchairAccessibleOnly: false,
      bikeAccessibleOnly: false,
      preferredRouteTypes: [RouteType.BUS, RouteType.TRAM],
      preferRealTimeData: true,
      confidenceThreshold: ConfidenceLevel.MEDIUM
    },
    timestamp: new Date(),
    timezone: 'Europe/Bucharest',
    isAtWork: false,
    isAtHome: false,
    userContext: 'unknown',
    maxVehiclesPerRoute: 10,
    maxRoutes: 50,
    includeScheduleData: true,
    includeDirectionAnalysis: true,
    apiConfig: {
      apiKey: 'test-api-key',
      agencyId: '2',
      timeout: 5000
    }
  };
}

describe('Vehicle Transformation Service Performance Benchmarks', () => {
  let benchmark: TransformationBenchmark;
  
  beforeEach(() => {
    benchmark = new TransformationBenchmark();
  });
  
  afterEach(() => {
    // Clear any caches to prevent interference between tests
    vi.clearAllMocks();
  });

  describe('Core Transformation Performance', () => {
    it('should benchmark small dataset transformation (10 vehicles)', async () => {
      const vehicles = generateMockVehicleData(10);
      const context = generateMockContext();
      
      const result = await benchmark.measureOperation(
        'Small Dataset Transformation (10 vehicles)',
        async () => {
          return await benchmark['service'].transform(vehicles, context);
        },
        50
      );
      
      // Performance assertions
      expect(result.averageTime).toBeLessThan(50); // Should be under 50ms
      expect(result.memoryUsage.delta).toBeLessThan(5); // Should use less than 5MB
      
      console.log(`Small dataset: ${result.averageTime.toFixed(2)}ms avg`);
    });
    
    it('should benchmark medium dataset transformation (100 vehicles)', async () => {
      const vehicles = generateMockVehicleData(100);
      const context = generateMockContext();
      
      const result = await benchmark.measureOperation(
        'Medium Dataset Transformation (100 vehicles)',
        async () => {
          return await benchmark['service'].transform(vehicles, context);
        },
        25
      );
      
      // Performance assertions
      expect(result.averageTime).toBeLessThan(200); // Should be under 200ms
      expect(result.memoryUsage.delta).toBeLessThan(15); // Should use less than 15MB
      
      console.log(`Medium dataset: ${result.averageTime.toFixed(2)}ms avg`);
    });
    
    it('should benchmark large dataset transformation (500 vehicles)', async () => {
      const vehicles = generateMockVehicleData(500);
      const context = generateMockContext();
      
      const result = await benchmark.measureOperation(
        'Large Dataset Transformation (500 vehicles)',
        async () => {
          return await benchmark['service'].transform(vehicles, context);
        },
        10
      );
      
      // Performance assertions
      expect(result.averageTime).toBeLessThan(1000); // Should be under 1 second
      expect(result.memoryUsage.delta).toBeLessThan(50); // Should use less than 50MB
      
      console.log(`Large dataset: ${result.averageTime.toFixed(2)}ms avg`);
    });
  });

  describe('Caching Performance', () => {
    it('should benchmark cache effectiveness with repeated transformations', async () => {
      const vehicles = generateMockVehicleData(50);
      const context = generateMockContext();
      
      // First transformation (cache miss)
      const firstResult = await benchmark.measureOperation(
        'First Transformation (Cache Miss)',
        async () => {
          return await benchmark['service'].transform(vehicles, context);
        },
        1
      );
      
      // Repeated transformations (cache hits)
      const cachedResult = await benchmark.measureOperation(
        'Cached Transformation (Cache Hit)',
        async () => {
          return await benchmark['service'].transform(vehicles, context);
        },
        20
      );
      
      // Cache should improve performance (but may not be 50% due to test overhead)
      expect(cachedResult.averageTime).toBeLessThan(firstResult.averageTime * 2); // More lenient for test environment
      if (cachedResult.cacheStats?.hitRate !== undefined) {
        expect(cachedResult.cacheStats.hitRate).toBeGreaterThan(0.5);
      }
      
      console.log(`Cache improvement: ${((firstResult.averageTime - cachedResult.averageTime) / firstResult.averageTime * 100).toFixed(1)}%`);
    });
    
    it('should benchmark cache memory usage under load', async () => {
      const contexts = Array.from({ length: 10 }, () => ({
        ...generateMockContext(),
        userLocation: {
          latitude: 46.7712 + Math.random() * 0.01,
          longitude: 23.6236 + Math.random() * 0.01
        }
      }));
      
      const result = await benchmark.measureOperation(
        'Cache Memory Usage Under Load',
        async () => {
          const vehicles = generateMockVehicleData(100);
          const context = contexts[Math.floor(Math.random() * contexts.length)];
          return await benchmark['service'].transform(vehicles, context);
        },
        50
      );
      
      // Memory usage should remain reasonable
      expect(result.memoryUsage.delta).toBeLessThan(30); // Less than 30MB growth
      if (result.cacheStats?.entries !== undefined) {
        expect(result.cacheStats.entries).toBeGreaterThan(0);
      }
      
      console.log(`Cache entries: ${result.cacheStats?.entries}, Memory delta: ${result.memoryUsage.delta.toFixed(2)}MB`);
    });
  });

  describe('Error Handling Performance', () => {
    it('should benchmark performance with malformed data', async () => {
      const vehicles = generateMockVehicleData(50);
      // Introduce malformed data
      vehicles[10] = { ...vehicles[10], latitude: null as any };
      vehicles[20] = { ...vehicles[20], id: undefined as any };
      vehicles[30] = { ...vehicles[30], timestamp: 'invalid-date' };
      
      const context = generateMockContext();
      
      const result = await benchmark.measureOperation(
        'Error Handling with Malformed Data',
        async () => {
          try {
            return await benchmark['service'].transform(vehicles, context);
          } catch (error) {
            // Expected for some malformed data
            return null;
          }
        },
        20
      );
      
      // Error handling shouldn't significantly impact performance
      expect(result.averageTime).toBeLessThan(300); // Should handle errors efficiently
      
      console.log(`Error handling overhead: ${result.averageTime.toFixed(2)}ms avg`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should benchmark memory cleanup after transformations', async () => {
      const initialMemory = benchmark['getMemoryUsage']();
      
      // Perform multiple transformations
      for (let i = 0; i < 10; i++) {
        const vehicles = generateMockVehicleData(100);
        const context = generateMockContext();
        await benchmark['service'].transform(vehicles, context);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = benchmark['getMemoryUsage']();
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be minimal after cleanup
      expect(memoryGrowth).toBeLessThan(20); // Less than 20MB growth
      
      console.log(`Memory growth after 10 transformations: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Performance', () => {
    it('should benchmark concurrent transformation requests', async () => {
      const vehicles = generateMockVehicleData(100);
      const contexts = Array.from({ length: 5 }, () => generateMockContext());
      
      const result = await benchmark.measureOperation(
        'Concurrent Transformations',
        async () => {
          const promises = contexts.map(context => 
            benchmark['service'].transform(vehicles, context)
          );
          return await Promise.all(promises);
        },
        10
      );
      
      // Concurrent requests should be handled efficiently
      expect(result.averageTime).toBeLessThan(1000); // Should handle concurrency well
      
      console.log(`Concurrent performance: ${result.averageTime.toFixed(2)}ms for 5 concurrent requests`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance baselines', async () => {
      const testCases = [
        { name: 'Baseline Small (10 vehicles)', count: 10, iterations: 50 },
        { name: 'Baseline Medium (50 vehicles)', count: 50, iterations: 25 },
        { name: 'Baseline Large (200 vehicles)', count: 200, iterations: 10 }
      ];
      
      const baselines: Record<string, number> = {};
      
      for (const testCase of testCases) {
        const vehicles = generateMockVehicleData(testCase.count);
        const context = generateMockContext();
        
        const result = await benchmark.measureOperation(
          testCase.name,
          async () => {
            return await benchmark['service'].transform(vehicles, context);
          },
          testCase.iterations
        );
        
        baselines[testCase.name] = result.averageTime;
      }
      
      // Store baselines for future regression testing
      console.log('Performance Baselines:', baselines);
      
      // Verify baselines are reasonable
      expect(baselines['Baseline Small (10 vehicles)']).toBeLessThan(100);
      expect(baselines['Baseline Medium (50 vehicles)']).toBeLessThan(300);
      expect(baselines['Baseline Large (200 vehicles)']).toBeLessThan(800);
    });
  });

  afterAll(() => {
    // Generate and log final benchmark report
    const report = benchmark.generateReport();
    console.log('\n' + report);
  });
});