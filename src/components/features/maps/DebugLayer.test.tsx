/**
 * DebugLayer - Component tests
 * Tests debug visualization rendering, visibility control, and data handling
 */

import { describe, it, expect } from 'vitest';
import { DebugLayer } from './DebugLayer';
import { DEFAULT_MAP_COLORS } from '../../../types/interactiveMap';
import type { DebugVisualizationData } from '../../../types/interactiveMap';

// Test data
const mockDebugData: DebugVisualizationData = {
  vehiclePosition: { lat: 46.7712, lon: 23.6236 },
  targetStationPosition: { lat: 46.7720, lon: 23.6240 },
  vehicleProjection: {
    closestPoint: { lat: 46.7715, lon: 23.6238 },
    distanceToShape: 25.5,
    segmentIndex: 2,
    positionAlongSegment: 0.75,
  },
  stationProjection: {
    closestPoint: { lat: 46.7718, lon: 23.6239 },
    distanceToShape: 15.2,
    segmentIndex: 3,
    positionAlongSegment: 0.25,
  },
  routeShape: {
    id: 'shape_123',
    points: [
      { lat: 46.7710, lon: 23.6230 },
      { lat: 46.7715, lon: 23.6235 },
      { lat: 46.7720, lon: 23.6240 },
    ],
    segments: [
      {
        start: { lat: 46.7710, lon: 23.6230 },
        end: { lat: 46.7715, lon: 23.6235 },
        distance: 100,
      },
      {
        start: { lat: 46.7715, lon: 23.6235 },
        end: { lat: 46.7720, lon: 23.6240 },
        distance: 120,
      },
    ],
  },
  distanceCalculation: {
    totalDistance: 150.5,
    method: 'route_shape',
    confidence: 'high',
  },
};

describe('DebugLayer', () => {
  it('should be importable', () => {
    expect(DebugLayer).toBeDefined();
    expect(typeof DebugLayer).toBe('function');
  });

  it('should accept required props', () => {
    const props = {
      debugData: mockDebugData,
      visible: true,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    // Should not throw when creating with valid props
    expect(() => DebugLayer(props)).not.toThrow();
  });

  it('should handle visibility control', () => {
    const visibleProps = {
      debugData: mockDebugData,
      visible: true,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    const hiddenProps = {
      debugData: mockDebugData,
      visible: false,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => DebugLayer(visibleProps)).not.toThrow();
    expect(() => DebugLayer(hiddenProps)).not.toThrow();
  });

  it('should handle different confidence levels', () => {
    const confidenceLevels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    
    confidenceLevels.forEach(confidence => {
      const debugDataWithConfidence = {
        ...mockDebugData,
        distanceCalculation: {
          ...mockDebugData.distanceCalculation,
          confidence,
        },
      };
      
      const props = {
        debugData: debugDataWithConfidence,
        visible: true,
        colorScheme: DEFAULT_MAP_COLORS,
      };
      
      expect(() => DebugLayer(props)).not.toThrow();
    });
  });

  it('should handle different calculation methods', () => {
    const methods: Array<'route_shape' | 'stop_segments'> = ['route_shape', 'stop_segments'];
    
    methods.forEach(method => {
      const debugDataWithMethod = {
        ...mockDebugData,
        distanceCalculation: {
          ...mockDebugData.distanceCalculation,
          method,
        },
      };
      
      const props = {
        debugData: debugDataWithMethod,
        visible: true,
        colorScheme: DEFAULT_MAP_COLORS,
      };
      
      expect(() => DebugLayer(props)).not.toThrow();
    });
  });

  it('should handle minimal route shape data', () => {
    const minimalDebugData = {
      ...mockDebugData,
      routeShape: {
        id: 'minimal_shape',
        points: [
          { lat: 46.7710, lon: 23.6230 },
          { lat: 46.7720, lon: 23.6240 },
        ],
        segments: [],
      },
    };
    
    const props = {
      debugData: minimalDebugData,
      visible: true,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => DebugLayer(props)).not.toThrow();
  });

  it('should handle edge case coordinates', () => {
    const edgeCaseDebugData = {
      ...mockDebugData,
      vehiclePosition: { lat: 0, lon: 0 },
      targetStationPosition: { lat: 90, lon: 180 },
    };
    
    const props = {
      debugData: edgeCaseDebugData,
      visible: true,
      colorScheme: DEFAULT_MAP_COLORS,
    };
    
    expect(() => DebugLayer(props)).not.toThrow();
  });
});