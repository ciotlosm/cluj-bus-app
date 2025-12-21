import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterEach, afterAll } from 'vitest';
import type { 
  TranzyAgencyResponse 
} from '@/types';
import { 
  tranzyVehicleResponseArb,
  tranzyStopResponseArb,
  tranzyRouteResponseArb,
  tranzyStopTimeResponseArb
} from './mockDataGenerators';
import * as fc from 'fast-check';

/**
 * Base URL for Tranzy API - using the proxy path for tests
 */
const TRANZY_API_BASE = '/api/tranzy';

/**
 * Mock handlers for Tranzy API endpoints
 */
export const handlers = [
  // GET /agency - Get agencies
  http.get(`${TRANZY_API_BASE}/v1/opendata/agency`, () => {
    const mockAgencies: TranzyAgencyResponse[] = [
      {
        agency_id: 1,
        agency_name: 'CTP Cluj-Napoca',
        agency_url: 'https://ctpcj.ro',
        agency_timezone: 'Europe/Bucharest',
        agency_lang: 'ro'
      }
    ];
    return HttpResponse.json(mockAgencies);
  }),

  // GET /routes - Get routes for agency
  http.get(`${TRANZY_API_BASE}/v1/opendata/routes`, ({ request }) => {
    const url = new URL(request.url);
    const agencyId = url.searchParams.get('agency_id');
    
    if (!agencyId) {
      return new HttpResponse(null, { status: 400 });
    }

    // Generate mock routes (minimal for memory efficiency)
    const mockRoutes = fc.sample(tranzyRouteResponseArb, 2).map(route => ({
      ...route,
      agency_id: parseInt(agencyId)
    }));

    return HttpResponse.json(mockRoutes);
  }),

  // GET /stops - Get stops for agency
  http.get(`${TRANZY_API_BASE}/v1/opendata/stops`, ({ request }) => {
    const url = new URL(request.url);
    const agencyId = url.searchParams.get('agency_id');
    
    if (!agencyId) {
      return new HttpResponse(null, { status: 400 });
    }

    // Generate mock stops (minimal for memory efficiency)
    const mockStops = fc.sample(tranzyStopResponseArb, 2);
    return HttpResponse.json(mockStops);
  }),

  // GET /vehicles - Get live vehicles
  http.get(`${TRANZY_API_BASE}/v1/opendata/vehicles`, ({ request }) => {
    const url = new URL(request.url);
    const agencyId = url.searchParams.get('agency_id');
    
    if (!agencyId) {
      return new HttpResponse(null, { status: 400 });
    }

    // Generate mock vehicles (minimal for memory efficiency)
    const mockVehicles = fc.sample(tranzyVehicleResponseArb, 2);
    return HttpResponse.json(mockVehicles);
  }),

  // GET /stop_times - Get stop times for trips
  http.get(`${TRANZY_API_BASE}/v1/opendata/stop_times`, ({ request }) => {
    const url = new URL(request.url);
    const agencyId = url.searchParams.get('agency_id');
    const tripId = url.searchParams.get('trip_id');
    const stopId = url.searchParams.get('stop_id');
    
    if (!agencyId) {
      return new HttpResponse(null, { status: 400 });
    }

    // Generate mock stop times (minimal for memory efficiency)
    let mockStopTimes = fc.sample(tranzyStopTimeResponseArb, 2);
    
    // Filter by trip_id if provided
    if (tripId) {
      mockStopTimes = mockStopTimes.map(st => ({ ...st, trip_id: tripId }));
    }
    
    // Filter by stop_id if provided
    if (stopId) {
      mockStopTimes = mockStopTimes.map(st => ({ ...st, stop_id: parseInt(stopId) }));
    }

    return HttpResponse.json(mockStopTimes);
  }),

  // Error simulation handlers
  http.get(`${TRANZY_API_BASE}/v1/opendata/error/network`, () => {
    return HttpResponse.error();
  }),

  http.get(`${TRANZY_API_BASE}/v1/opendata/error/timeout`, () => {
    return new Promise(() => {}); // Never resolves (timeout)
  }),

  http.get(`${TRANZY_API_BASE}/v1/opendata/error/500`, () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.get(`${TRANZY_API_BASE}/v1/opendata/error/401`, () => {
    return new HttpResponse(null, { status: 401 });
  })
];

/**
 * Create MSW server instance
 */
export const server = setupServer(...handlers);

/**
 * Setup MSW for tests
 */
export const setupMSW = () => {
  // Start server before all tests
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' }); // Changed from 'error' to 'warn'
  });

  // Reset handlers after each test
  afterEach(() => {
    server.resetHandlers();
  });

  // Clean up after all tests
  afterAll(() => {
    server.close();
  });
};

/**
 * Helper to override specific endpoints for individual tests
 */
export const mockEndpoint = (
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  response: any,
  status: number = 200
) => {
  const fullUrl = path.startsWith('http') || path.startsWith('/api') ? path : `${TRANZY_API_BASE}${path}`;
  
  server.use(
    http[method](fullUrl, () => {
      if (status >= 400) {
        return new HttpResponse(null, { status });
      }
      return HttpResponse.json(response);
    })
  );
};

/**
 * Helper to simulate network errors for specific endpoints
 */
export const mockNetworkError = (path: string) => {
  const fullUrl = path.startsWith('http') || path.startsWith('/api') ? path : `${TRANZY_API_BASE}${path}`;
  
  server.use(
    http.get(fullUrl, () => {
      return HttpResponse.error();
    })
  );
};

/**
 * Helper to simulate timeout for specific endpoints
 */
export const mockTimeout = (path: string) => {
  const fullUrl = path.startsWith('http') || path.startsWith('/api') ? path : `${TRANZY_API_BASE}${path}`;
  
  server.use(
    http.get(fullUrl, () => {
      return new Promise(() => {}); // Never resolves
    })
  );
};

/**
 * Reset all mocks to default handlers
 */
export const resetMocks = () => {
  server.resetHandlers();
};