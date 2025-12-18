/**
 * Nearby View Debugger
 * 
 * A comprehensive debugging utility for troubleshooting nearby view issues.
 * This can be used in development to understand why stations are or aren't
 * being selected, and what filtering criteria are being applied.
 */

import type { Coordinates, Station, LiveVehicle } from '../types';
import type { Route, StopTime, Trip } from '../types/tranzyApi';
import { calculateDistance } from './distanceUtils';
import { logger } from './logger';
import {
  NEARBY_STATION_DISTANCE_THRESHOLD,
  MAX_NEARBY_SEARCH_RADIUS,
  calculateUserToStationDistance,
  calculateStationProximity
} from './nearbyViewConstants';

export interface DebugStationInfo {
  station: Station;
  distanceFromUser: number;
  inRadius: boolean;
  hasRoutes: boolean;
  associatedRoutes: Route[];
  stopTimesCount: number;
  rejectionReason?: 'too_far' | 'no_routes' | 'threshold_exceeded' | null;
  selected: boolean;
  selectionType?: 'closest' | 'second' | null;
}

export interface NearbyViewDebugReport {
  userLocation: Coordinates;
  searchRadius: number;
  distanceThreshold: number;
  totalStations: number;
  stationsInRadius: number;
  stationsWithRoutes: number;
  stationsWithoutRoutes: number;
  selectedStations: number;
  stationDetails: DebugStationInfo[];
  gtfsDataAvailable: {
    hasStopTimes: boolean;
    hasTrips: boolean;
    stopTimesCount: number;
    tripsCount: number;
  };
  routeInfo: {
    totalRoutes: number;
    routeNames: string[];
  };
  selectionSummary: {
    closestStation: DebugStationInfo | null;
    secondStation: DebugStationInfo | null;
    rejectedStations: DebugStationInfo[];
  };
  recommendations: string[];
}

/**
 * Debug the nearby view selection process
 * 
 * @param userLocation - User's GPS coordinates
 * @param stations - Available stations
 * @param routes - Available routes
 * @param stopTimes - GTFS stop times data
 * @param trips - GTFS trips data
 * @param customRadius - Custom search radius (optional)
 * @param customThreshold - Custom distance threshold (optional)
 * @returns Comprehensive debug report
 */
export function debugNearbyView(
  userLocation: Coordinates,
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[],
  customRadius: number = MAX_NEARBY_SEARCH_RADIUS,
  customThreshold: number = NEARBY_STATION_DISTANCE_THRESHOLD
): NearbyViewDebugReport {
  logger.debug('Starting nearby view debug analysis', {
    userLocation,
    stationsCount: stations.length,
    routesCount: routes.length,
    stopTimesCount: stopTimes?.length || 0,
    tripsCount: trips?.length || 0
  });

  // Create route lookup maps
  const routeMap = new Map<string, Route>();
  routes.forEach(route => {
    routeMap.set(route.id, route);
  });

  const tripToRouteMap = new Map<string, string>();
  if (trips) {
    trips.forEach(trip => {
      tripToRouteMap.set(trip.id, trip.routeId);
    });
  }

  // Analyze each station
  const stationDetails: DebugStationInfo[] = stations.map(station => {
    const distanceFromUser = calculateUserToStationDistance(userLocation, station);
    const inRadius = distanceFromUser <= customRadius;

    // Find route associations
    let associatedRoutes: Route[] = [];
    let stopTimesCount = 0;

    if (stopTimes && trips) {
      // Use GTFS data for accurate route associations
      const stationStopTimes = stopTimes.filter(stopTime => 
        stopTime.stopId === station.id
      );
      stopTimesCount = stationStopTimes.length;

      const routeIds = new Set<string>();
      stationStopTimes.forEach(stopTime => {
        const routeId = tripToRouteMap.get(stopTime.tripId);
        if (routeId) {
          routeIds.add(routeId);
        }
      });

      associatedRoutes = Array.from(routeIds)
        .map(routeId => routeMap.get(routeId))
        .filter((route): route is Route => route !== undefined);
    } else if (stopTimes) {
      // Partial GTFS data - log warning
      logger.warn('Partial GTFS data: have stopTimes but no trips', {
        stationId: station.id
      });
      // Fallback to all routes
      associatedRoutes = routes;
    } else {
      // No GTFS data - assume all routes serve all stations
      associatedRoutes = routes;
    }

    const hasRoutes = associatedRoutes.length > 0;

    // Determine rejection reason
    let rejectionReason: 'too_far' | 'no_routes' | 'threshold_exceeded' | null = null;
    if (!inRadius) {
      rejectionReason = 'too_far';
    } else if (!hasRoutes) {
      rejectionReason = 'no_routes';
    }

    return {
      station,
      distanceFromUser,
      inRadius,
      hasRoutes,
      associatedRoutes,
      stopTimesCount,
      rejectionReason,
      selected: false, // Will be updated later
      selectionType: null
    };
  });

  // Filter qualifying stations
  const qualifyingStations = stationDetails.filter(info => 
    info.inRadius && info.hasRoutes
  );

  // Sort by distance for selection
  const sortedQualifying = qualifyingStations.sort((a, b) => 
    a.distanceFromUser - b.distanceFromUser
  );

  // Perform selection
  let closestStation: DebugStationInfo | null = null;
  let secondStation: DebugStationInfo | null = null;

  if (sortedQualifying.length > 0) {
    closestStation = sortedQualifying[0];
    closestStation.selected = true;
    closestStation.selectionType = 'closest';

    // Check for second station
    if (sortedQualifying.length > 1) {
      const candidate = sortedQualifying[1];
      const distanceBetweenStations = calculateStationProximity(
        closestStation.station,
        candidate.station
      );

      if (distanceBetweenStations <= customThreshold) {
        secondStation = candidate;
        secondStation.selected = true;
        secondStation.selectionType = 'second';
      } else {
        candidate.rejectionReason = 'threshold_exceeded';
      }
    }
  }

  // Collect rejected stations
  const rejectedStations = stationDetails.filter(info => !info.selected);

  // Generate recommendations
  const recommendations: string[] = [];

  if (qualifyingStations.length === 0) {
    if (stationDetails.filter(s => s.inRadius).length === 0) {
      recommendations.push(`No stations found within ${customRadius}m radius. Consider increasing search radius.`);
    } else if (stationDetails.filter(s => s.hasRoutes).length === 0) {
      recommendations.push('No stations have route associations. Check GTFS data (stopTimes/trips) or route configuration.');
    } else {
      recommendations.push('Stations exist but none qualify. Check both distance and route filtering criteria.');
    }
  }

  if (stopTimes && !trips) {
    recommendations.push('GTFS trips data is missing. Route associations may be inaccurate.');
  }

  if (!stopTimes && !trips) {
    recommendations.push('No GTFS data available. All routes are assumed to serve all stations.');
  }

  if (closestStation && !secondStation && sortedQualifying.length > 1) {
    const candidate = sortedQualifying[1];
    const distance = calculateStationProximity(closestStation.station, candidate.station);
    recommendations.push(`Second station candidate "${candidate.station.name}" is ${Math.round(distance)}m away (threshold: ${customThreshold}m). Consider adjusting threshold if needed.`);
  }

  // Create summary report
  const report: NearbyViewDebugReport = {
    userLocation,
    searchRadius: customRadius,
    distanceThreshold: customThreshold,
    totalStations: stations.length,
    stationsInRadius: stationDetails.filter(s => s.inRadius).length,
    stationsWithRoutes: stationDetails.filter(s => s.hasRoutes).length,
    stationsWithoutRoutes: stationDetails.filter(s => !s.hasRoutes).length,
    selectedStations: stationDetails.filter(s => s.selected).length,
    stationDetails,
    gtfsDataAvailable: {
      hasStopTimes: !!stopTimes,
      hasTrips: !!trips,
      stopTimesCount: stopTimes?.length || 0,
      tripsCount: trips?.length || 0
    },
    routeInfo: {
      totalRoutes: routes.length,
      routeNames: routes.map(r => r.routeName)
    },
    selectionSummary: {
      closestStation,
      secondStation,
      rejectedStations
    },
    recommendations
  };

  logger.debug('Nearby view debug analysis completed', {
    totalStations: report.totalStations,
    selectedStations: report.selectedStations,
    recommendationsCount: report.recommendations.length
  });

  return report;
}

/**
 * Print a human-readable debug report to console
 * 
 * @param report - Debug report from debugNearbyView
 */
export function printDebugReport(report: NearbyViewDebugReport): void {
  console.log('='.repeat(80));
  console.log('NEARBY VIEW DEBUG REPORT');
  console.log('='.repeat(80));

  console.log('\n📍 USER LOCATION:');
  console.log(`   Latitude: ${report.userLocation.latitude}`);
  console.log(`   Longitude: ${report.userLocation.longitude}`);

  console.log('\n⚙️  CONFIGURATION:');
  console.log(`   Search radius: ${report.searchRadius}m`);
  console.log(`   Distance threshold: ${report.distanceThreshold}m`);

  console.log('\n📊 OVERVIEW:');
  console.log(`   Total stations: ${report.totalStations}`);
  console.log(`   Stations in radius: ${report.stationsInRadius}`);
  console.log(`   Stations with routes: ${report.stationsWithRoutes}`);
  console.log(`   Stations without routes: ${report.stationsWithoutRoutes}`);
  console.log(`   Selected stations: ${report.selectedStations}`);

  console.log('\n🗺️  GTFS DATA:');
  console.log(`   Stop times available: ${report.gtfsDataAvailable.hasStopTimes} (${report.gtfsDataAvailable.stopTimesCount} entries)`);
  console.log(`   Trips available: ${report.gtfsDataAvailable.hasTrips} (${report.gtfsDataAvailable.tripsCount} entries)`);

  console.log('\n🚌 ROUTES:');
  console.log(`   Total routes: ${report.routeInfo.totalRoutes}`);
  console.log(`   Route names: ${report.routeInfo.routeNames.join(', ')}`);

  console.log('\n🏁 SELECTION RESULTS:');
  if (report.selectionSummary.closestStation) {
    const closest = report.selectionSummary.closestStation;
    console.log(`   ✅ Closest: ${closest.station.name}`);
    console.log(`      Distance: ${Math.round(closest.distanceFromUser)}m`);
    console.log(`      Routes: ${closest.associatedRoutes.map(r => r.routeName).join(', ')}`);
  } else {
    console.log(`   ❌ No closest station selected`);
  }

  if (report.selectionSummary.secondStation) {
    const second = report.selectionSummary.secondStation;
    console.log(`   ✅ Second: ${second.station.name}`);
    console.log(`      Distance: ${Math.round(second.distanceFromUser)}m`);
    console.log(`      Routes: ${second.associatedRoutes.map(r => r.routeName).join(', ')}`);
  } else {
    console.log(`   ⚪ No second station selected`);
  }

  console.log('\n📋 DETAILED STATION ANALYSIS:');
  report.stationDetails
    .sort((a, b) => a.distanceFromUser - b.distanceFromUser)
    .forEach((info, index) => {
      const status = info.selected ? '✅' : '❌';
      const reason = info.rejectionReason ? ` (${info.rejectionReason})` : '';
      
      console.log(`   ${index + 1}. ${status} ${info.station.name}${reason}`);
      console.log(`      Distance: ${Math.round(info.distanceFromUser)}m`);
      console.log(`      In radius: ${info.inRadius ? 'Yes' : 'No'}`);
      console.log(`      Has routes: ${info.hasRoutes ? 'Yes' : 'No'} (${info.associatedRoutes.length} routes)`);
      if (info.associatedRoutes.length > 0) {
        console.log(`      Routes: ${info.associatedRoutes.map(r => r.routeName).join(', ')}`);
      }
      console.log(`      Stop times: ${info.stopTimesCount}`);
    });

  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Create a debug function that can be called from the browser console
 * 
 * @param userLocation - User's GPS coordinates
 * @param stations - Available stations
 * @param routes - Available routes
 * @param stopTimes - GTFS stop times data
 * @param trips - GTFS trips data
 */
export function debugNearbyViewConsole(
  userLocation: Coordinates,
  stations: Station[],
  routes: Route[],
  stopTimes?: StopTime[],
  trips?: Trip[]
): void {
  const report = debugNearbyView(userLocation, stations, routes, stopTimes, trips);
  printDebugReport(report);
}

