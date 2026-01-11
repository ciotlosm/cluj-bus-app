/**
 * AnimatedVehicleMarker - Smoothly animates vehicle position changes
 * Provides smooth transitions when vehicle predictions are updated
 */

import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import type { EnhancedVehicleData } from '../../../utils/vehicle/vehicleEnhancementUtils';
import type { TranzyRouteResponse } from '../../../types/rawTranzyApi';
import { createVehicleIcon } from '../../../utils/maps/iconUtils';
import { formatTimestamp } from '../../../utils/vehicle/vehicleFormatUtils';
import {
  interpolateCoordinates,
  calculateAnimationProgress,
  isAnimationComplete,
  shouldAnimateMovement,
  type AnimationState
} from '../../../utils/maps/animationUtils';
import { ANIMATION_CONFIG } from '../../../utils/maps/mapConstants';

interface AnimatedVehicleMarkerProps {
  vehicle: EnhancedVehicleData;
  route?: TranzyRouteResponse;
  onVehicleClick?: (vehicle: EnhancedVehicleData) => void;
  isSelected?: boolean;
  color?: string;
}

export const AnimatedVehicleMarker: FC<AnimatedVehicleMarkerProps> = ({
  vehicle,
  route,
  onVehicleClick,
  isSelected = false,
  color = '#3182CE'
}) => {
  const [currentPosition, setCurrentPosition] = useState({
    lat: vehicle.latitude,
    lon: vehicle.longitude
  });
  
  const animationStateRef = useRef<AnimationState | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const previousPositionRef = useRef({ lat: vehicle.latitude, lon: vehicle.longitude });

  // Handle position changes and start animation
  useEffect(() => {
    const newPosition = { lat: vehicle.latitude, lon: vehicle.longitude };
    const oldPosition = previousPositionRef.current;

    // Check if position actually changed and warrants animation
    if (shouldAnimateMovement(oldPosition, newPosition)) {
      // Cancel any existing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Set up new animation
      animationStateRef.current = {
        startPosition: currentPosition, // Start from current animated position
        endPosition: newPosition,
        startTime: Date.now(),
        duration: ANIMATION_CONFIG.VEHICLE_UPDATE_INTERVAL / 2 // Half the update interval for smooth movement
      };

      // Start animation loop
      const animate = () => {
        const animationState = animationStateRef.current;
        if (!animationState) return;

        const now = Date.now();
        
        if (isAnimationComplete(animationState.startTime, animationState.duration, now)) {
          // Animation complete
          setCurrentPosition(animationState.endPosition);
          animationStateRef.current = null;
          return;
        }

        // Calculate current position
        const progress = calculateAnimationProgress(
          animationState.startTime,
          animationState.duration,
          now
        );
        
        const interpolatedPosition = interpolateCoordinates(
          animationState.startPosition,
          animationState.endPosition,
          progress
        );
        
        setCurrentPosition(interpolatedPosition);
        
        // Continue animation
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      // Start the animation
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // No animation needed, just update position
      setCurrentPosition(newPosition);
    }

    previousPositionRef.current = newPosition;
  }, [vehicle.latitude, vehicle.longitude]); // Remove currentPosition from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Create vehicle icon
  const icon = createVehicleIcon({ 
    color, 
    isSelected, 
    speed: vehicle.speed,
    size: 24 
  });

  // Get vehicle status text
  const getVehicleStatus = (): string => {
    if (vehicle.speed === 0) {
      return 'Stopped';
    } else if (vehicle.speed < 5) {
      return 'Moving slowly';
    } else {
      return 'In transit';
    }
  };

  // Get prediction status text for popup
  const getPredictionStatus = (): string => {
    if (!vehicle.predictionMetadata) {
      return 'No prediction data';
    }
    
    const { predictionApplied, timestampAge, predictionMethod } = vehicle.predictionMetadata;
    
    if (!predictionApplied) {
      return 'Using API position (prediction failed)';
    }
    
    const ageSeconds = Math.round(timestampAge / 1000);
    return `Predicted position (${ageSeconds}s ahead, ${predictionMethod})`;
  };

  return (
    <Marker
      position={[currentPosition.lat, currentPosition.lon]}
      icon={icon}
      eventHandlers={{
        click: () => onVehicleClick?.(vehicle),
      }}
    >
      <Popup>
        <div style={{ minWidth: '200px' }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '16px', 
            marginBottom: '8px',
            color 
          }}>
            Vehicle {vehicle.label}
          </div>
          
          {route && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Route:</strong> {route.route_short_name} - {route.route_long_name}
            </div>
          )}
          
          <div style={{ marginBottom: '4px' }}>
            <strong>Status:</strong> {getVehicleStatus()}
          </div>
          
          <div style={{ marginBottom: '4px' }}>
            <strong>Speed:</strong> {vehicle.speed} km/h
          </div>
          
          <div style={{ marginBottom: '4px' }}>
            <strong>Last Update:</strong> {formatTimestamp(vehicle.timestamp)}
          </div>
          
          <div style={{ marginBottom: '4px' }}>
            <strong>Position:</strong> {getPredictionStatus()}
          </div>
          
          {vehicle.trip_id && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Trip:</strong> {vehicle.trip_id}
            </div>
          )}
          
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '8px',
            borderTop: '1px solid #eee',
            paddingTop: '4px'
          }}>
            ID: {vehicle.id} | Current: {currentPosition.lat.toFixed(6)}, {currentPosition.lon.toFixed(6)}
            {vehicle.predictionMetadata?.predictionApplied && (
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                API: {vehicle.apiLatitude?.toFixed(6) ?? 'N/A'}, {vehicle.apiLongitude?.toFixed(6) ?? 'N/A'}
              </div>
            )}
          </div>
          
          {/* Animation status for debugging */}
          {process.env.NODE_ENV === 'development' && animationStateRef.current && (
            <div style={{ 
              fontSize: '10px', 
              color: '#999', 
              marginTop: '4px',
              borderTop: '1px solid #eee',
              paddingTop: '2px'
            }}>
              Animating to: {animationStateRef.current.endPosition.lat.toFixed(6)}, {animationStateRef.current.endPosition.lon.toFixed(6)}
            </div>
          )}
          
          {/* Prediction metadata for debugging */}
          {vehicle.predictionMetadata?.predictionApplied && (
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '4px',
              borderTop: '1px solid #eee',
              paddingTop: '4px'
            }}>
              Moved: {Math.round(vehicle.predictionMetadata.predictedDistance)}m | 
              Stations: {vehicle.predictionMetadata.stationsEncountered} | 
              Dwell: {Math.round(vehicle.predictionMetadata.totalDwellTime / 1000)}s
            </div>
          )}
          
          {/* Accessibility info */}
          {(vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE' || 
            vehicle.bike_accessible === 'BIKE_ACCESSIBLE') && (
            <div style={{ 
              fontSize: '12px', 
              marginTop: '4px',
              color: '#4CAF50'
            }}>
              {vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE' && '♿ '}
              {vehicle.bike_accessible === 'BIKE_ACCESSIBLE' && '🚲 '}
              Accessible
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};