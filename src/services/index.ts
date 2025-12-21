/**
 * Services Index
 * Exports all service modules for easy importing
 */

// Architecture Simplification Services
export { CodeIntegrityPreservationSystem } from './CodeIntegrityPreservationSystem';
export { FunctionalityPreservationValidator } from './FunctionalityPreservationValidator';
export { ComprehensiveValidationPipeline, DEFAULT_VALIDATION_CONFIG } from './ComprehensiveValidationPipeline';
export { PerformanceDegradationMonitor } from './PerformanceDegradationMonitor';

// Existing Services
export { agencyService } from './agencyService';
export { appVersionService } from './api/appVersionService';
export { geocodingService } from './geocodingService';
export { routeMappingService } from './routeMappingService';
export { routePlanningService } from './routePlanningService';
export { ServiceWorkerService, getServiceWorkerService } from './api/serviceWorkerService';
export { tranzyApiService } from '../api/tranzyApiService';

// Data Processing Services
export { gpsFirstDataLoader } from './gpsFirstDataLoader';
export { stationSelector } from './stationSelector';
export { 
  type RouteAssociation,
  type RouteAssociationResult,
  type StationWithValidatedRoutes,
  type RouteValidationResult,
  type RouteAssociationFilterOptions,
  validateRouteData,
  validateStopTimesData,
  validateTripsData,
  determineStationRouteAssociations,
  filterStationsWithValidRoutes,
  getStationRouteAssociation,
  validateStationForDisplay,
  getRouteAssociationStatistics
} from './routeAssociationFilter';

// Utility Services
export { DataValidator } from './DataValidator';
export { ErrorReporter } from './ErrorReporter';
export { GracefulDegradationService } from './GracefulDegradationService';
export { DebugMonitoringService } from './DebugMonitoringService';
export { TransformationRetryManager } from './TransformationRetryManager';

// Error Handling and Rollback System
export { default as ErrorHandlingRollbackSystem } from './ErrorHandlingRollbackSystem';
export type {
  ErrorType,
  ErrorSeverity,
  RecoveryStrategy,
  RefactoringError,
  StateSnapshot,
  RecoveryResult,
  DirectoryNode,
  ValidationSnapshot
} from './ErrorHandlingRollbackSystem';

// Analysis and Optimization Services
export { CodebaseAnalysisEngine } from './CodebaseAnalysisEngine';
export { DuplicationConsolidationEngine } from './DuplicationConsolidationEngine';
export { FileFolderSizeOptimizer } from './FileFolderSizeOptimizer';
export { ModernArchitecturePatternEnforcerImpl, createModernArchitecturePatternEnforcer } from './ModernArchitecturePatternEnforcer';
export { ModuleMergingService } from './ModuleMergingService';
export { SharedImplementationReplacementService } from './SharedImplementationReplacementService';
export { UtilityExtractionService } from './UtilityExtractionService';

// Configuration and Management Services
export { RealTimeConfigurationManager } from './RealTimeConfigurationManager';
export { RouteActivityAnalyzer } from './RouteActivityAnalyzer';
export { RouteFilteringConfigurationManager } from './RouteFilteringConfigurationManager';
export { IntelligentVehicleFilter } from './IntelligentVehicleFilter';
export { VehicleTransformationService } from './VehicleTransformationService';

// Type exports for functionality preservation validation
export type {
  ApplicationStateSnapshot,
  StateComparisonResult,
  BehavioralTestCase,
  StateDifference,
  ComponentTreeNode,
  BundleInfo
} from './FunctionalityPreservationValidator';

export type {
  ValidationPipelineConfig,
  ValidationPipelineResult
} from './ComprehensiveValidationPipeline';

export type {
  PerformanceBaseline,
  PerformanceDegradationAnalysis,
  DegradedMetric,
  PerformanceThresholds,
  BundleMetrics,
  RuntimeMetrics,
  MemoryMetrics,
  BuildMetrics,
  TestMetrics
} from './PerformanceDegradationMonitor';

// Type exports for modern architecture pattern enforcement
export type {
  CompositionAnalysis,
  ReactPatternAnalysis,
  DependencyAnalysis,
  ArchitecturePatternAnalysis,
  ModernizationSuggestion,
  PatternTransformation
} from '../types/architectureSimplification';