import React from 'react';
import { withPerformanceMonitoring } from '../../../utils/performance';
import { StationDisplayMain } from './components/StationDisplayMain';

interface StationDisplayProps {
  // No props needed - maxVehicles comes from config
}

const StationDisplayComponent: React.FC<StationDisplayProps> = () => {
  return <StationDisplayMain />;
};

export const StationDisplay = withPerformanceMonitoring(
  StationDisplayComponent,
  'StationDisplay'
);