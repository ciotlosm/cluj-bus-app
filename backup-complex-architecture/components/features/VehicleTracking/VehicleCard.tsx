import React from 'react';
import { VehicleCardMain } from './VehicleCard/VehicleCardMain';
import type { CoreVehicle } from '../../../types/coreVehicle';

interface VehicleCardProps {
  /** Core vehicle data */
  vehicle: CoreVehicle;
  /** Station ID for highlighting current station */
  stationId?: string;
  /** Whether the stops list is expanded */
  isExpanded: boolean;
  /** Callback when stops list is toggled */
  onToggleExpanded: () => void;
  /** Callback when map button is clicked */
  onShowMap: () => void;
  /** Callback when route is clicked */
  onRouteClick?: () => void;
  /** Show short stop list always visible in card */
  showShortStopList?: boolean;
  /** Show "Show stops" button for full expandable list */
  showFullStopsButton?: boolean;
  /** Stop sequence data for displaying route stops */
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
  /** Optional arrival time override (e.g., "5 min", "Now") */
  arrivalText?: string;
  /** Optional destination override */
  destination?: string;
}

const VehicleCardComponent: React.FC<VehicleCardProps> = (props) => {
  return <VehicleCardMain {...props} />;
};

// Memoized export to prevent unnecessary re-renders
export const VehicleCard = React.memo(VehicleCardComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when only timestamp changes slightly
  return (
    prevProps.vehicle.id === nextProps.vehicle.id &&
    prevProps.vehicle.routeId === nextProps.vehicle.routeId &&
    prevProps.arrivalText === nextProps.arrivalText &&
    prevProps.destination === nextProps.destination &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.stationId === nextProps.stationId &&
    prevProps.showShortStopList === nextProps.showShortStopList &&
    prevProps.showFullStopsButton === nextProps.showFullStopsButton
  );
});

VehicleCard.displayName = 'VehicleCard';