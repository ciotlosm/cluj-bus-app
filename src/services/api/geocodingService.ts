import type { Coordinates } from '../../types';
import { logger } from '../../utils/shared/logger';

export interface AddressSearchResult {
  address: string;
  coordinates: Coordinates;
  city?: string;
  country?: string;
  confidence: number;
}

export interface GeocodingService {
  searchAddress(query: string, userLocation?: Coordinates): Promise<AddressSearchResult[]>;
  reverseGeocode(coordinates: Coordinates): Promise<AddressSearchResult | null>;
}

class NominatimGeocodingService implements GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';

  async searchAddress(query: string, userLocation?: Coordinates): Promise<AddressSearchResult[]> {
    try {
      // Build search parameters
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'ro', // Focus on Romania
      });

      // If user location is provided, bias results towards that location
      if (userLocation) {
        params.append('viewbox', this.createViewbox(userLocation));
        params.append('bounded', '1');
      }

      const response = await fetch(`${this.baseUrl}/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((item: any) => ({
        address: item.display_name,
        coordinates: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
        city: item.address?.city || item.address?.town || item.address?.village,
        country: item.address?.country,
        confidence: parseFloat(item.importance || '0.5'),
      }));
    } catch (error) {
      logger.error('Address search failed', { error }, 'GEOCODING');
      return [];
    }
  }

  async reverseGeocode(coordinates: Coordinates): Promise<AddressSearchResult | null> {
    try {
      const params = new URLSearchParams({
        lat: coordinates.latitude.toString(),
        lon: coordinates.longitude.toString(),
        format: 'json',
        addressdetails: '1',
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`);
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.display_name) {
        return null;
      }

      return {
        address: data.display_name,
        coordinates,
        city: data.address?.city || data.address?.town || data.address?.village,
        country: data.address?.country,
        confidence: parseFloat(data.importance || '0.5'),
      };
    } catch (error) {
      logger.error('Reverse geocoding failed', { error }, 'GEOCODING');
      return null;
    }
  }

  private createViewbox(center: Coordinates, radiusKm: number = 10): string {
    // Create a bounding box around the center point
    const latDelta = radiusKm / 111; // Rough conversion: 1 degree lat ≈ 111 km
    const lonDelta = radiusKm / (111 * Math.cos(center.latitude * Math.PI / 180));
    
    const left = center.longitude - lonDelta;
    const top = center.latitude + latDelta;
    const right = center.longitude + lonDelta;
    const bottom = center.latitude - latDelta;
    
    return `${left},${top},${right},${bottom}`;
  }
}

// Export singleton instance
export const geocodingService = new NominatimGeocodingService();