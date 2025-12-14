import { logger } from '../utils/logger';
import { useConfigStore } from '../stores/configStore';

export interface TransitEstimate {
  durationMinutes: number;
  confidence: 'high' | 'medium' | 'low';
  lastCalculated: Date;
}

export interface TransitRequest {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  departureTime?: Date;
  mode?: 'transit' | 'driving' | 'walking';
}

class GoogleTransitService {
  private cache = new Map<string, TransitEstimate>();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // API key is now retrieved from config store
  }

  private getApiKey(): string | null {
    // Try config store first, then environment variable as fallback
    const configStore = useConfigStore.getState();
    return configStore.config?.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;
  }

  /**
   * Calculate travel time between two points using Google Maps Transit API
   */
  async calculateTransitTime(request: TransitRequest): Promise<TransitEstimate> {
    const cacheKey = this.getCacheKey(request);
    
    // Check cache first
    const cached = this.getCachedEstimate(cacheKey);
    if (cached) {
      logger.debug('Using cached transit estimate', { cacheKey, estimate: cached });
      return cached;
    }

    try {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        logger.warn('Google Maps API key not configured, using fallback calculation');
        return this.getFallbackEstimate(request);
      }

      const estimate = await this.fetchGoogleTransitEstimate(request, apiKey);
      
      // Cache the result
      this.cache.set(cacheKey, estimate);
      
      logger.info('Calculated transit time', {
        origin: request.origin,
        destination: request.destination,
        durationMinutes: estimate.durationMinutes,
        confidence: estimate.confidence
      });

      return estimate;

    } catch (error) {
      logger.error('Failed to calculate transit time', { error, request });
      return this.getFallbackEstimate(request);
    }
  }

  /**
   * Calculate ETA adjusted for vehicle's last update time
   */
  calculateAdjustedETA(
    transitEstimate: TransitEstimate,
    vehicleLastUpdate: Date
  ): TransitEstimate {
    const timeSinceUpdate = Math.floor((Date.now() - vehicleLastUpdate.getTime()) / 1000 / 60); // minutes
    
    // Adjust the estimate based on how old the vehicle data is
    // If data is old, reduce confidence and add uncertainty
    let adjustedDuration = transitEstimate.durationMinutes;
    let adjustedConfidence = transitEstimate.confidence;

    if (timeSinceUpdate > 5) {
      // Data is more than 5 minutes old, add uncertainty
      adjustedDuration += Math.min(timeSinceUpdate - 5, 10); // Add up to 10 minutes uncertainty
      adjustedConfidence = timeSinceUpdate > 10 ? 'low' : 'medium';
    }

    return {
      durationMinutes: Math.max(1, adjustedDuration),
      confidence: adjustedConfidence,
      lastCalculated: new Date()
    };
  }

  private async fetchGoogleTransitEstimate(request: TransitRequest, apiKey: string): Promise<TransitEstimate> {
    const { origin, destination, departureTime = new Date() } = request;
    
    const params = new URLSearchParams({
      origins: `${origin.latitude},${origin.longitude}`,
      destinations: `${destination.latitude},${destination.longitude}`,
      mode: 'transit',
      departure_time: Math.floor(departureTime.getTime() / 1000).toString(),
      key: apiKey,
      units: 'metric'
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google API error: ${data.status}`);
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      throw new Error(`No transit route found: ${element?.status}`);
    }

    const durationMinutes = Math.ceil(element.duration.value / 60);
    
    // Determine confidence based on transit availability and time of day
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    
    if (element.duration_in_traffic) {
      confidence = 'high'; // Real-time traffic data available
    } else if (durationMinutes < 30) {
      confidence = 'medium'; // Short routes are generally more predictable
    } else {
      confidence = 'low'; // Longer routes have more uncertainty
    }

    return {
      durationMinutes,
      confidence,
      lastCalculated: new Date()
    };
  }

  private getFallbackEstimate(request: TransitRequest): TransitEstimate {
    // Calculate rough estimate based on distance
    const distance = this.calculateDistance(
      request.origin.latitude,
      request.origin.longitude,
      request.destination.latitude,
      request.destination.longitude
    );

    // Assume average transit speed of 15 km/h (including stops and transfers)
    const estimatedMinutes = Math.max(1, Math.ceil((distance / 15) * 60));

    return {
      durationMinutes: estimatedMinutes,
      confidence: 'low',
      lastCalculated: new Date()
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getCacheKey(request: TransitRequest): string {
    const { origin, destination } = request;
    return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}-${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
  }

  private getCachedEstimate(cacheKey: string): TransitEstimate | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - cached.lastCalculated.getTime();
    if (age > this.CACHE_DURATION_MS) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, estimate] of this.cache.entries()) {
      const age = now - estimate.lastCalculated.getTime();
      if (age > this.CACHE_DURATION_MS) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const googleTransitService = new GoogleTransitService();

// Clear cache periodically
setInterval(() => {
  googleTransitService.clearExpiredCache();
}, 5 * 60 * 1000); // Every 5 minutes