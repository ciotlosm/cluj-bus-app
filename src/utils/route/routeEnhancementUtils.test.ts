import { describe, it, expect } from 'vitest';
import type { TranzyRouteResponse } from '../../types/rawTranzyApi';
import {
  enhanceRoute,
  enhanceRoutes,
  isEleviRoute,
  isExternalRoute,
  isSpecialRoute,
  excludeSpecialRoutes
} from './routeEnhancementUtils';

describe('routeEnhancementUtils', () => {
  // Test data - regular route
  const regularRoute: TranzyRouteResponse = {
    agency_id: 1,
    route_id: 101,
    route_short_name: '41',
    route_long_name: 'Piața Unirii - Gara de Nord',
    route_color: '#FF0000',
    route_type: 3,
    route_desc: 'Regular bus route'
  };

  // Test data - Transport Elevi route (short name)
  const eleviRouteShortName: TranzyRouteResponse = {
    agency_id: 1,
    route_id: 201,
    route_short_name: 'TE1',
    route_long_name: 'Transport Elevi Route 1',
    route_color: '#00FF00',
    route_type: 3,
    route_desc: 'Regular description'
  };

  // Test data - Transport Elevi route (description)
  const eleviRouteDesc: TranzyRouteResponse = {
    agency_id: 1,
    route_id: 202,
    route_short_name: '42',
    route_long_name: 'Another Route',
    route_color: '#0000FF',
    route_type: 3,
    route_desc: 'TE Special transport'
  };

  // Test data - External route
  const externalRoute: TranzyRouteResponse = {
    agency_id: 1,
    route_id: 301,
    route_short_name: 'M1',
    route_long_name: 'Metro Line 1',
    route_color: '#FFFF00',
    route_type: 0,
    route_desc: 'Metro line'
  };

  // Test data - route with missing fields
  const routeWithMissingFields: TranzyRouteResponse = {
    agency_id: 1,
    route_id: 401,
    route_short_name: '',
    route_long_name: 'Route with missing short name',
    route_color: '#FF00FF',
    route_type: 3,
    route_desc: ''
  };

  describe('enhanceRoute', () => {
    it('should enhance regular route with false flags', () => {
      const enhanced = enhanceRoute(regularRoute);
      
      expect(enhanced).toEqual({
        ...regularRoute,
        isElevi: false,
        isExternal: false
      });
    });

    it('should detect Transport Elevi route by short name', () => {
      const enhanced = enhanceRoute(eleviRouteShortName);
      
      expect(enhanced).toEqual({
        ...eleviRouteShortName,
        isElevi: true,
        isExternal: false
      });
    });

    it('should detect Transport Elevi route by description', () => {
      const enhanced = enhanceRoute(eleviRouteDesc);
      
      expect(enhanced).toEqual({
        ...eleviRouteDesc,
        isElevi: true,
        isExternal: false
      });
    });

    it('should detect External route', () => {
      const enhanced = enhanceRoute(externalRoute);
      
      expect(enhanced).toEqual({
        ...externalRoute,
        isElevi: false,
        isExternal: true
      });
    });

    it('should handle missing route_short_name and route_desc', () => {
      const enhanced = enhanceRoute(routeWithMissingFields);
      
      expect(enhanced).toEqual({
        ...routeWithMissingFields,
        isElevi: false,
        isExternal: false
      });
    });

    it('should handle null route_short_name and route_desc', () => {
      const routeWithNulls = {
        ...regularRoute,
        route_short_name: null as any,
        route_desc: null as any
      };
      
      const enhanced = enhanceRoute(routeWithNulls);
      
      expect(enhanced.isElevi).toBe(false);
      expect(enhanced.isExternal).toBe(false);
    });
  });

  describe('enhanceRoutes', () => {
    it('should enhance array of routes', () => {
      const routes = [regularRoute, eleviRouteShortName, externalRoute];
      const enhanced = enhanceRoutes(routes);
      
      expect(enhanced).toHaveLength(3);
      expect(enhanced[0].isElevi).toBe(false);
      expect(enhanced[0].isExternal).toBe(false);
      expect(enhanced[1].isElevi).toBe(true);
      expect(enhanced[1].isExternal).toBe(false);
      expect(enhanced[2].isElevi).toBe(false);
      expect(enhanced[2].isExternal).toBe(true);
    });

    it('should handle empty array', () => {
      const enhanced = enhanceRoutes([]);
      expect(enhanced).toEqual([]);
    });

    it('should handle invalid input', () => {
      const enhanced = enhanceRoutes(null as any);
      expect(enhanced).toEqual([]);
    });
  });

  describe('isEleviRoute', () => {
    it('should return true for route with TE in short name', () => {
      expect(isEleviRoute(eleviRouteShortName)).toBe(true);
    });

    it('should return true for route with TE in description', () => {
      expect(isEleviRoute(eleviRouteDesc)).toBe(true);
    });

    it('should return false for regular route', () => {
      expect(isEleviRoute(regularRoute)).toBe(false);
    });

    it('should return false for external route', () => {
      expect(isEleviRoute(externalRoute)).toBe(false);
    });

    it('should handle missing fields', () => {
      expect(isEleviRoute(routeWithMissingFields)).toBe(false);
    });
  });

  describe('isExternalRoute', () => {
    it('should return true for route with M prefix', () => {
      expect(isExternalRoute(externalRoute)).toBe(true);
    });

    it('should return false for regular route', () => {
      expect(isExternalRoute(regularRoute)).toBe(false);
    });

    it('should return false for Elevi route', () => {
      expect(isExternalRoute(eleviRouteShortName)).toBe(false);
    });

    it('should handle missing short name', () => {
      expect(isExternalRoute(routeWithMissingFields)).toBe(false);
    });
  });

  describe('isSpecialRoute', () => {
    it('should return true for Elevi route', () => {
      expect(isSpecialRoute(eleviRouteShortName)).toBe(true);
      expect(isSpecialRoute(eleviRouteDesc)).toBe(true);
    });

    it('should return true for External route', () => {
      expect(isSpecialRoute(externalRoute)).toBe(true);
    });

    it('should return false for regular route', () => {
      expect(isSpecialRoute(regularRoute)).toBe(false);
    });
  });

  describe('excludeSpecialRoutes', () => {
    it('should exclude Elevi and External routes', () => {
      const routes = [regularRoute, eleviRouteShortName, externalRoute, eleviRouteDesc];
      const filtered = excludeSpecialRoutes(routes);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(regularRoute);
    });

    it('should return all routes if none are special', () => {
      const routes = [regularRoute, routeWithMissingFields];
      const filtered = excludeSpecialRoutes(routes);
      
      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(routes);
    });

    it('should handle empty array', () => {
      const filtered = excludeSpecialRoutes([]);
      expect(filtered).toEqual([]);
    });

    it('should handle invalid input', () => {
      const filtered = excludeSpecialRoutes(null as any);
      expect(filtered).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle route with TE in middle of short name', () => {
      const route = {
        ...regularRoute,
        route_short_name: '1TE2'
      };
      
      expect(isEleviRoute(route)).toBe(false);
      expect(enhanceRoute(route).isElevi).toBe(false);
    });

    it('should handle route with M in middle of short name', () => {
      const route = {
        ...regularRoute,
        route_short_name: '1M2'
      };
      
      expect(isExternalRoute(route)).toBe(false);
      expect(enhanceRoute(route).isExternal).toBe(false);
    });

    it('should handle case sensitivity', () => {
      const lowerCaseTE = {
        ...regularRoute,
        route_short_name: 'te1'
      };
      
      const lowerCaseM = {
        ...regularRoute,
        route_short_name: 'm1'
      };
      
      expect(isEleviRoute(lowerCaseTE)).toBe(false);
      expect(isExternalRoute(lowerCaseM)).toBe(false);
    });

    it('should handle route that is both Elevi and External', () => {
      const bothRoute = {
        ...regularRoute,
        route_short_name: 'MTE1',
        route_desc: 'TE description'
      };
      
      const enhanced = enhanceRoute(bothRoute);
      expect(enhanced.isElevi).toBe(true);
      expect(enhanced.isExternal).toBe(true);
      expect(isSpecialRoute(bothRoute)).toBe(true);
    });
  });
});