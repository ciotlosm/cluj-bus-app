/**
 * Migration Performance Benchmark Test Suite
 * 
 * This test suite measures the performance improvements achieved by the
 * data hooks to store migration. It provides comprehensive metrics on:
 * - API call reduction
 * - Rendering performance improvements
 * - Memory usage optimizations
 * 
 * Requirements: 10.2, 10.3 - Performance measurement and documentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import React from 'react';

import {
  MigrationPerformanceBenchmark,
  compareMigrationResults,
  generatePerformanceReport,
  exportResultsToJson,
  type BenchmarkResults,
  type MigrationComparison
} from '../../utils/performance/migrationPerformanceBenchmark';

// Import components to benchmark
import { useVehicleDisplay } from '../../hooks/controllers/useVehicleDisplay';
import { useRouteManager } from '../../hooks/controllers/useRouteManager';
import { useVehicleStore } from '../../stores/vehicleStore';
import { useConfigStore } from '../../stores/configStore';

// Mock the hooks and stores
vi.mock('../../hooks/controllers/useVehicleDisplay');
vi.mock('../../hooks/controllers/useRouteManager');
vi.mock('../../stores/vehicleStore');
vi.mock('../../stores/configStore');

// Mock data for testing
const mockStations = [
  {
    id: '1',
    name: 'Station 1',
    coordinates: { latitude: 46.7712, longitude: 23.6236 },
    isFavorite: false
  },
  {
    id: '2', 
    name: 'Station 2',
    coordinates: { latitude: 46.7722, longitude: 23.6246 },
    isFavorite: false
  }
];

const mockVehicles = [
  {
    id: 'vehicle1',
    routeId: 'route1',
    tripId: 'trip1',
    label: 'Bus 101',
    position: { latitude: 46.7712, longitude: 23.6236, bearing: 90 },
    timestamp: new Date(),
    speed: 25,
    isWheelchairAccessible: true,
    isBikeAccessible: false
  }
];

const mockRoutes = [
  {
    id: 'route1',
    agencyId: '2',
    routeName: '101',
    routeDesc: 'Main Route',
    type: 'bus' as const,
    color: '#FF0000',
    textColor: '#FFFFFF'
  }
];

// Test component that uses store-based hooks
const TestVehicleDisplayComponent: React.FC<{ options?: any }> = ({ options = {} }) => {
  const result = useVehicleDisplay(options);
  
  return React.createElement('div', { 'data-testid': 'vehicle-display' }, [
    React.createElement('div', { 'data-testid': 'loading', key: 'loading' }, result.isLoading ? 'Loading' : 'Loaded'),
    React.createElement('div', { 'data-testid': 'station-count', key: 'station-count' }, result.stationVehicleGroups.length),
    React.createElement('div', { 'data-testid': 'vehicle-count', key: 'vehicle-count' }, 
      result.stationVehicleGroups.reduce((sum, group) => sum + group.vehicles.length, 0)
    )
  ]);
};

const TestRouteManagerComponent: React.FC = () => {
  const result = useRouteManager();
  
  return React.createElement('div', { 'data-testid': 'route-manager' }, [
    React.createElement('div', { 'data-testid': 'loading', key: 'loading' }, result.isLoading ? 'Loading' : 'Loaded'),
    React.createElement('div', { 'data-testid': 'route-count', key: 'route-count' }, result.availableRoutes.length),
    React.createElement('div', { 'data-testid': 'favorite-count', key: 'favorite-count' }, result.selectedRoutes.length)
  ]);
};

describe('Migration Performance Benchmark', () => {
  let benchmark: MigrationPerformanceBenchmark;
  
  beforeEach(() => {
    benchmark = new MigrationPerformanceBenchmark();
    
    // Mock performance.memory for consistent testing
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 2048 * 1024 * 1024 // 2GB
      },
      configurable: true
    });
    
    // Mock useVehicleDisplay hook
    vi.mocked(useVehicleDisplay).mockReturnValue({
      stationVehicleGroups: [
        {
          station: { station: mockStations[0], distance: 100 },
          vehicles: mockVehicles as any,
          allRoutes: [{ routeId: 'route1', routeName: '101', vehicleCount: 1 }]
        }
      ],
      isLoading: false,
      isLoadingStations: false,
      isLoadingVehicles: false,
      isProcessingVehicles: false,
      effectiveLocationForDisplay: { latitude: 46.7712, longitude: 23.6236 },
      favoriteRoutes: [],
      allStations: mockStations,
      vehicles: mockVehicles as any
    });
    
    // Mock useRouteManager hook
    vi.mocked(useRouteManager).mockReturnValue({
      selectedRoutes: [],
      searchTerm: '',
      hasChanges: false,
      selectedTypes: [],
      availableRoutes: mockRoutes as any,
      isLoading: false,
      config: {
        agencyId: '2',
        apiKey: 'test-key',
        city: 'Cluj-Napoca'
      },
      availableTypes: ['bus'],
      favoriteRoutes: [],
      filteredAvailableRoutes: mockRoutes as any,
      setSearchTerm: vi.fn(),
      setSelectedTypes: vi.fn(),
      handleToggleRoute: vi.fn(),
      handleSaveChanges: vi.fn(),
      handleTypeFilterChange: vi.fn(),
      refetchRoutes: vi.fn()
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Benchmark Core Functionality', () => {
    it('should track API calls correctly', () => {
      benchmark.start();
      
      // Simulate API calls
      benchmark.recordApiCall('/api/stations', 150, false);
      benchmark.recordApiCall('/api/vehicles', 200, false);
      benchmark.recordApiCall('/api/routes', 100, true); // cached
      benchmark.recordApiCall('/api/stations', 50, true); // duplicate + cached
      
      const results = benchmark.stop();
      
      expect(results.apiCalls.totalCalls).toBe(4);
      expect(results.apiCalls.uniqueEndpoints.size).toBe(3);
      expect(results.apiCalls.duplicateCalls).toBe(1);
      expect(results.apiCalls.cacheHits).toBe(2);
      expect(results.apiCalls.cacheMisses).toBe(2);
      expect(results.apiCalls.averageResponseTime).toBe(125); // (150+200+100+50)/4
    });
    
    it('should track component renders correctly', () => {
      benchmark.start();
      
      // Simulate component renders
      benchmark.recordRender('VehicleDisplay', 45);
      benchmark.recordRender('RouteManager', 30);
      benchmark.recordRender('VehicleDisplay', 55); // re-render
      benchmark.recordRender('StationList', 25);
      
      const results = benchmark.stop();
      
      expect(results.rendering.componentRenderCount).toBe(4);
      expect(results.rendering.averageRenderTime).toBe(38.75); // (45+30+55+25)/4
      expect(results.rendering.totalRenderTime).toBe(155);
      expect(results.rendering.rendersByComponent.get('VehicleDisplay')).toEqual({
        count: 2,
        totalTime: 100,
        avgTime: 50
      });
    });
    
    it('should track memory usage correctly', () => {
      benchmark.start();
      
      // Simulate memory increase
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 60 * 1024 * 1024, // 60MB (10MB increase)
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        configurable: true
      });
      
      const results = benchmark.stop();
      
      expect(results.memory.initialMemory).toBe(50); // 50MB
      expect(results.memory.finalMemory).toBe(60); // 60MB
      expect(results.memory.memoryDelta).toBe(10); // 10MB increase
      expect(results.memory.heapSize).toBe(100); // 100MB
    });
  });

  describe('Store-Based Performance Measurement', () => {
    it('should measure useVehicleDisplay performance', async () => {
      benchmark.start();
      
      const startTime = performance.now();
      
      await act(async () => {
        render(React.createElement(TestVehicleDisplayComponent));
      });
      
      const renderTime = performance.now() - startTime;
      benchmark.recordRender('VehicleDisplay', renderTime);
      
      // Simulate API calls that would happen in real usage
      benchmark.recordApiCall('/api/stations', 120, false);
      benchmark.recordApiCall('/api/vehicles', 180, false);
      benchmark.recordApiCall('/api/routes', 90, true);
      benchmark.recordApiCall('/api/stop_times', 150, false);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });
      
      const results = benchmark.stop();
      
      expect(results.apiCalls.totalCalls).toBe(4);
      expect(results.rendering.componentRenderCount).toBe(1);
      expect(results.duration).toBeGreaterThan(0);
    });
    
    it('should measure useRouteManager performance', async () => {
      benchmark.start();
      
      const startTime = performance.now();
      
      await act(async () => {
        render(React.createElement(TestRouteManagerComponent));
      });
      
      const renderTime = performance.now() - startTime;
      benchmark.recordRender('RouteManager', renderTime);
      
      // Simulate store-based API calls
      benchmark.recordApiCall('/api/routes', 100, false);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });
      
      const results = benchmark.stop();
      
      expect(results.apiCalls.totalCalls).toBe(1);
      expect(results.rendering.componentRenderCount).toBe(1);
    });
  });

  describe('Migration Comparison', () => {
    it('should compare before and after results correctly', () => {
      // Simulate "before" results (data hooks era)
      const beforeResults: BenchmarkResults = {
        timestamp: new Date(),
        duration: 1000,
        apiCalls: {
          totalCalls: 20,
          uniqueEndpoints: new Set(['/api/stations', '/api/vehicles', '/api/routes']),
          duplicateCalls: 8,
          cacheHits: 4,
          cacheMisses: 16,
          averageResponseTime: 200,
          callsByEndpoint: new Map([
            ['/api/stations', 8],
            ['/api/vehicles', 8],
            ['/api/routes', 4]
          ])
        },
        rendering: {
          componentRenderCount: 15,
          averageRenderTime: 80,
          totalRenderTime: 1200,
          slowestRenders: [{ component: 'VehicleDisplay', time: 150 }],
          rendersByComponent: new Map()
        },
        memory: {
          initialMemory: 50,
          peakMemory: 80,
          finalMemory: 70,
          memoryDelta: 20,
          heapSize: 100,
          heapLimit: 2048
        },
        summary: {
          apiCallReduction: 0,
          renderTimeImprovement: 0,
          memoryReduction: 0
        }
      };
      
      // Simulate "after" results (store-based era)
      const afterResults: BenchmarkResults = {
        timestamp: new Date(),
        duration: 800,
        apiCalls: {
          totalCalls: 12,
          uniqueEndpoints: new Set(['/api/stations', '/api/vehicles', '/api/routes']),
          duplicateCalls: 2,
          cacheHits: 8,
          cacheMisses: 4,
          averageResponseTime: 120,
          callsByEndpoint: new Map([
            ['/api/stations', 4],
            ['/api/vehicles', 4],
            ['/api/routes', 4]
          ])
        },
        rendering: {
          componentRenderCount: 10,
          averageRenderTime: 50,
          totalRenderTime: 500,
          slowestRenders: [{ component: 'VehicleDisplay', time: 80 }],
          rendersByComponent: new Map()
        },
        memory: {
          initialMemory: 50,
          peakMemory: 65,
          finalMemory: 60,
          memoryDelta: 10,
          heapSize: 100,
          heapLimit: 2048
        },
        summary: {
          apiCallReduction: 0,
          renderTimeImprovement: 0,
          memoryReduction: 0
        }
      };
      
      const comparison = compareMigrationResults(beforeResults, afterResults);
      
      expect(comparison.improvements.apiCallReduction).toBe(8); // 20 - 12
      expect(comparison.improvements.apiCallReductionPercent).toBe(40); // 8/20 * 100
      expect(comparison.improvements.renderTimeImprovement).toBe(30); // 80 - 50
      expect(comparison.improvements.renderTimeImprovementPercent).toBe(37.5); // 30/80 * 100
      expect(comparison.improvements.memoryReduction).toBe(10); // 20 - 10
      expect(comparison.improvements.memoryReductionPercent).toBe(50); // 10/20 * 100
      expect(comparison.verdict).toBe('success');
    });
    
    it('should detect performance regressions', () => {
      const beforeResults: BenchmarkResults = {
        timestamp: new Date(),
        duration: 500,
        apiCalls: {
          totalCalls: 10,
          uniqueEndpoints: new Set(['/api/stations']),
          duplicateCalls: 2,
          cacheHits: 5,
          cacheMisses: 5,
          averageResponseTime: 100,
          callsByEndpoint: new Map()
        },
        rendering: {
          componentRenderCount: 5,
          averageRenderTime: 40,
          totalRenderTime: 200,
          slowestRenders: [],
          rendersByComponent: new Map()
        },
        memory: {
          initialMemory: 50,
          peakMemory: 60,
          finalMemory: 55,
          memoryDelta: 5,
          heapSize: 100,
          heapLimit: 2048
        },
        summary: { apiCallReduction: 0, renderTimeImprovement: 0, memoryReduction: 0 }
      };
      
      // Simulate regression (worse performance)
      const afterResults: BenchmarkResults = {
        ...beforeResults,
        apiCalls: {
          ...beforeResults.apiCalls,
          totalCalls: 15, // More calls (regression)
          averageResponseTime: 150 // Slower (regression)
        },
        rendering: {
          ...beforeResults.rendering,
          averageRenderTime: 60 // Slower renders (regression)
        }
      };
      
      const comparison = compareMigrationResults(beforeResults, afterResults);
      
      expect(comparison.improvements.apiCallReductionPercent).toBe(-50); // Negative = regression
      expect(comparison.improvements.renderTimeImprovementPercent).toBe(-50); // Negative = regression
      expect(comparison.verdict).toBe('regression');
      expect(comparison.recommendations).toContain('Consider implementing more aggressive caching strategies');
    });
  });

  describe('Report Generation', () => {
    it('should generate human-readable performance report', () => {
      const beforeResults: BenchmarkResults = {
        timestamp: new Date(),
        duration: 1000,
        apiCalls: {
          totalCalls: 20,
          uniqueEndpoints: new Set(['/api/stations', '/api/vehicles']),
          duplicateCalls: 5,
          cacheHits: 5,
          cacheMisses: 15,
          averageResponseTime: 150,
          callsByEndpoint: new Map()
        },
        rendering: {
          componentRenderCount: 10,
          averageRenderTime: 60,
          totalRenderTime: 600,
          slowestRenders: [],
          rendersByComponent: new Map()
        },
        memory: {
          initialMemory: 50,
          peakMemory: 70,
          finalMemory: 65,
          memoryDelta: 15,
          heapSize: 100,
          heapLimit: 2048
        },
        summary: { apiCallReduction: 0, renderTimeImprovement: 0, memoryReduction: 0 }
      };
      
      const afterResults: BenchmarkResults = {
        ...beforeResults,
        apiCalls: {
          ...beforeResults.apiCalls,
          totalCalls: 12,
          duplicateCalls: 1,
          cacheHits: 8,
          cacheMisses: 4
        },
        rendering: {
          ...beforeResults.rendering,
          averageRenderTime: 40
        },
        memory: {
          ...beforeResults.memory,
          memoryDelta: 8
        }
      };
      
      const comparison = compareMigrationResults(beforeResults, afterResults);
      const report = generatePerformanceReport(comparison);
      
      expect(report).toContain('DATA HOOKS TO STORE MIGRATION - PERFORMANCE REPORT');
      expect(report).toContain('VERDICT: SUCCESS');
      expect(report).toContain('API CALL METRICS:');
      expect(report).toContain('RENDERING PERFORMANCE:');
      expect(report).toContain('MEMORY USAGE:');
      expect(report).toContain('Reduction: 8 calls (40.0%)');
    });
    
    it('should export results to JSON', () => {
      const beforeResults: BenchmarkResults = {
        timestamp: new Date('2024-01-01'),
        duration: 1000,
        apiCalls: {
          totalCalls: 10,
          uniqueEndpoints: new Set(['/api/test']),
          duplicateCalls: 2,
          cacheHits: 3,
          cacheMisses: 7,
          averageResponseTime: 100,
          callsByEndpoint: new Map([['test', 5]])
        },
        rendering: {
          componentRenderCount: 5,
          averageRenderTime: 50,
          totalRenderTime: 250,
          slowestRenders: [],
          rendersByComponent: new Map()
        },
        memory: {
          initialMemory: 50,
          peakMemory: 60,
          finalMemory: 55,
          memoryDelta: 5,
          heapSize: 100,
          heapLimit: 2048
        },
        summary: { apiCallReduction: 0, renderTimeImprovement: 0, memoryReduction: 0 }
      };
      
      const afterResults: BenchmarkResults = { ...beforeResults };
      const comparison = compareMigrationResults(beforeResults, afterResults);
      const json = exportResultsToJson(comparison);
      
      expect(() => JSON.parse(json)).not.toThrow();
      
      const parsed = JSON.parse(json);
      expect(parsed.before.apiCalls.totalCalls).toBe(10);
      expect(parsed.after.apiCalls.totalCalls).toBe(10);
      expect(parsed.improvements).toBeDefined();
      expect(parsed.verdict).toBe('partial'); // No significant improvements
    });
  });

  describe('Real-World Performance Scenarios', () => {
    it('should measure performance under high load', async () => {
      benchmark.start();
      
      // Simulate high load scenario
      const components = ['VehicleDisplay', 'RouteManager', 'StationList', 'VehicleCard'];
      const endpoints = ['/api/stations', '/api/vehicles', '/api/routes', '/api/stop_times'];
      
      // Simulate multiple rapid renders and API calls
      for (let i = 0; i < 50; i++) {
        const component = components[i % components.length];
        const endpoint = endpoints[i % endpoints.length];
        const cached = i % 3 === 0; // 33% cache hit rate
        
        benchmark.recordRender(component, 20 + Math.random() * 60);
        benchmark.recordApiCall(endpoint, 50 + Math.random() * 200, cached);
      }
      
      const results = benchmark.stop();
      
      expect(results.apiCalls.totalCalls).toBe(50);
      expect(results.rendering.componentRenderCount).toBe(50);
      expect(results.apiCalls.cacheHits).toBeGreaterThan(10);
      expect(results.rendering.averageRenderTime).toBeGreaterThan(0);
    });
    
    it('should measure cache effectiveness', () => {
      benchmark.start();
      
      // Simulate cache warming
      benchmark.recordApiCall('/api/stations', 200, false); // Initial load
      benchmark.recordApiCall('/api/vehicles', 180, false); // Initial load
      
      // Simulate subsequent cached requests
      for (let i = 0; i < 10; i++) {
        benchmark.recordApiCall('/api/stations', 20, true); // Fast cached response
        benchmark.recordApiCall('/api/vehicles', 25, true); // Fast cached response
      }
      
      const results = benchmark.stop();
      
      expect(results.apiCalls.totalCalls).toBe(22);
      expect(results.apiCalls.cacheHits).toBe(20);
      expect(results.apiCalls.cacheMisses).toBe(2);
      
      const cacheHitRate = (results.apiCalls.cacheHits / results.apiCalls.totalCalls) * 100;
      expect(cacheHitRate).toBeGreaterThan(90); // >90% cache hit rate
    });
  });
});