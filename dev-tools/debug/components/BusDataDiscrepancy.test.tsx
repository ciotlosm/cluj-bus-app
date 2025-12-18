import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { BusDataDiscrepancy } from './BusDataDiscrepancy';
import type { BusInfo, Station, Coordinates } from '../../../types';

// Generator for Coordinates
const coordinatesArb = fc.record({
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
});

// Generator for Station
const stationArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  coordinates: coordinatesArb,
  isFavorite: fc.boolean(),
});

// Generator for BusInfo with more realistic route names
const busInfoArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  route: fc.oneof(
    fc.integer({ min: 1, max: 999 }).map(n => n.toString()),
    fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'), { minLength: 1, maxLength: 3 }).map(arr => arr.join('')),
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s))
  ),
  destination: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  arrivalTime: fc.date(),
  isLive: fc.boolean(),
  minutesAway: fc.integer({ min: 0, max: 120 }),
  station: stationArb,
  direction: fc.constantFrom('work', 'home', 'unknown'),
});

describe('BusDataDiscrepancy Property Tests', () => {
  it('**Feature: bus-tracker, Property 7: Live vs scheduled data discrepancy detection** - For any combination of live and scheduled bus data, missing live buses should be highlighted with distinct visual indicators', () => {
    fc.assert(
      fc.property(
        fc.array(busInfoArb, { minLength: 1, maxLength: 20 }),
        fc.array(busInfoArb, { minLength: 1, maxLength: 20 }),
        (liveBuses, scheduledBuses) => {
          const { container, unmount } = render(
            <BusDataDiscrepancy liveBuses={liveBuses} scheduledBuses={scheduledBuses} />
          );
          
          // Find routes that are in scheduled data but missing from live data (case-insensitive)
          const liveRoutes = new Set(liveBuses.map(bus => bus.route.toLowerCase()));
          const missingLiveRoutes = new Set(
            scheduledBuses
              .filter(bus => !liveRoutes.has(bus.route.toLowerCase()))
              .map(bus => bus.route)
          );
          
          // Verify that missing live routes are highlighted
          missingLiveRoutes.forEach(route => {
            const discrepancyIndicator = container.querySelector(`[data-missing-live="${CSS.escape(route)}"]`);
            expect(discrepancyIndicator).toBeInTheDocument();
            
            // Verify distinct visual indicator (should have specific class or styling)
            expect(discrepancyIndicator?.classList.contains('missing-live-indicator')).toBe(true);
          });
          
          // Verify that routes with live data are not marked as missing
          // Only check routes that are both in live and scheduled data (case-insensitive)
          const scheduledRoutes = new Set(scheduledBuses.map(bus => bus.route.toLowerCase()));
          const routesWithBothLiveAndScheduled = Array.from(liveRoutes).filter(route => 
            scheduledRoutes.has(route)
          );
          
          routesWithBothLiveAndScheduled.forEach(route => {
            // Find the original route name from scheduled buses to check the correct data attribute
            const originalRoute = scheduledBuses.find(bus => bus.route.toLowerCase() === route)?.route;
            if (originalRoute) {
              const discrepancyIndicator = container.querySelector(`[data-missing-live="${CSS.escape(originalRoute)}"]`);
              expect(discrepancyIndicator).not.toBeInTheDocument();
            }
          });
          
          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty data sets correctly', () => {
    const { container } = render(
      <BusDataDiscrepancy liveBuses={[]} scheduledBuses={[]} />
    );
    
    // Should not crash and should render without discrepancy indicators
    expect(container.querySelector('[data-missing-live]')).not.toBeInTheDocument();
  });

  it('should detect simple missing live data case', () => {
    const liveBuses: BusInfo[] = [
      {
        id: '1',
        route: 'A',
        destination: 'Downtown',
        arrivalTime: new Date(),
        isLive: true,
        minutesAway: 5,
        station: { id: '1', name: 'Station 1', coordinates: { latitude: 0, longitude: 0 }, isFavorite: false },
        direction: 'work'
      }
    ];

    const scheduledBuses: BusInfo[] = [
      {
        id: '1',
        route: 'A',
        destination: 'Downtown',
        arrivalTime: new Date(),
        isLive: false,
        minutesAway: 5,
        station: { id: '1', name: 'Station 1', coordinates: { latitude: 0, longitude: 0 }, isFavorite: false },
        direction: 'work'
      },
      {
        id: '2',
        route: 'B',
        destination: 'Uptown',
        arrivalTime: new Date(),
        isLive: false,
        minutesAway: 10,
        station: { id: '2', name: 'Station 2', coordinates: { latitude: 1, longitude: 1 }, isFavorite: false },
        direction: 'home'
      }
    ];

    const { container } = render(
      <BusDataDiscrepancy liveBuses={liveBuses} scheduledBuses={scheduledBuses} />
    );

    // Route B should be marked as missing live data
    const missingIndicator = container.querySelector('[data-missing-live="B"]');
    expect(missingIndicator).toBeInTheDocument();
    expect(missingIndicator?.classList.contains('missing-live-indicator')).toBe(true);

    // Route A should not be marked as missing
    const notMissingIndicator = container.querySelector('[data-missing-live="A"]');
    expect(notMissingIndicator).not.toBeInTheDocument();
  });
});