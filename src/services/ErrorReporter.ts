/**
 * Error Reporter for Vehicle Transformation Service
 * 
 * Provides comprehensive error tracking and reporting for all transformation
 * operations. Implements structured error logging, metrics collection, and
 * error analysis for monitoring and debugging.
 * 
 * Requirements: 5.4, 5.5
 * 
 * @module ErrorReporter
 */

import { TransformationError } from '../types/transformationPipeline';
import type { ValidationError, ValidationWarning } from '../types/transformationPipeline';
import type { StandardError } from '../hooks/shared/errors/types';
import { ErrorHandler } from '../hooks/shared/errors/ErrorHandler';
import { logger } from '../utils/shared/logger';

// ============================================================================
// ERROR REPORTING TYPES
// ============================================================================

/**
 * Error severity levels for reporting
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error category for classification
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  TRANSFORMATION = 'transformation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  CONFIGURATION = 'configuration',
  PERFORMANCE = 'performance',
  DATA_QUALITY = 'data_quality'
}

/**
 * Structured error report
 */
export interface ErrorReport {
  /** Unique error identifier */
  errorId: string;
  /** Error category for classification */
  category: ErrorCategory;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Human-readable error message */
  message: string;
  /** Technical error details */
  details: string;
  /** Error context and metadata */
  context: Record<string, any>;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Stack trace if available */
  stackTrace?: string;
  /** Related error IDs for correlation */
  relatedErrors: string[];
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Suggested recovery actions */
  recoverySuggestions: string[];
  /** Performance impact metrics */
  performanceImpact?: {
    duration: number;
    memoryUsage?: number;
    affectedOperations: number;
  };
}

/**
 * Error metrics for monitoring
 */
export interface ErrorMetrics {
  /** Total number of errors reported */
  totalErrors: number;
  /** Errors by severity level */
  errorsBySeverity: Map<ErrorSeverity, number>;
  /** Errors by category */
  errorsByCategory: Map<ErrorCategory, number>;
  /** Error rate over time */
  errorRate: number;
  /** Average error resolution time */
  averageResolutionTime: number;
  /** Most common error patterns */
  commonErrorPatterns: Array<{
    pattern: string;
    count: number;
    lastOccurrence: Date;
  }>;
  /** Error trends */
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

/**
 * Performance metrics for error impact analysis
 */
export interface PerformanceMetrics {
  /** Total transformation time lost to errors */
  totalTimeImpact: number;
  /** Number of failed transformations */
  failedTransformations: number;
  /** Average error handling overhead */
  averageErrorOverhead: number;
  /** Memory usage during error conditions */
  errorMemoryUsage: number[];
  /** Recovery success rate */
  recoverySuccessRate: number;
}

// ============================================================================
// ERROR REPORTER INTERFACE
// ============================================================================

/**
 * Interface for error reporting and tracking
 */
export interface IErrorReporter {
  /**
   * Report a transformation error
   */
  reportTransformationError(error: TransformationError): Promise<void>;

  /**
   * Report a validation error
   */
  reportValidationError(error: ValidationError): Promise<void>;

  /**
   * Report a validation warning
   */
  reportValidationWarning(warning: ValidationWarning): Promise<void>;

  /**
   * Report a performance issue
   */
  reportPerformanceIssue(metric: PerformanceMetrics): Promise<void>;

  /**
   * Report a general error
   */
  reportError(error: Error, context?: Record<string, any>): Promise<void>;

  /**
   * Get error metrics for monitoring
   */
  getErrorMetrics(): ErrorMetrics;

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics;

  /**
   * Clear error history
   */
  clearErrorHistory(): void;

  /**
   * Export error reports for analysis
   */
  exportErrorReports(startDate?: Date, endDate?: Date): ErrorReport[];
}

// ============================================================================
// ERROR REPORTER IMPLEMENTATION
// ============================================================================

/**
 * Comprehensive error reporter implementation
 */
export class ErrorReporter implements IErrorReporter {
  private errorHistory: ErrorReport[] = [];
  private errorMetrics: ErrorMetrics;
  private performanceMetrics: PerformanceMetrics;
  private errorIdCounter = 0;
  private readonly maxHistorySize = 10000; // Maximum number of errors to keep in memory

  constructor() {
    this.errorMetrics = {
      totalErrors: 0,
      errorsBySeverity: new Map(),
      errorsByCategory: new Map(),
      errorRate: 0,
      averageResolutionTime: 0,
      commonErrorPatterns: [],
      trends: {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0),
        weekly: new Array(52).fill(0)
      }
    };

    this.performanceMetrics = {
      totalTimeImpact: 0,
      failedTransformations: 0,
      averageErrorOverhead: 0,
      errorMemoryUsage: [],
      recoverySuccessRate: 0
    };

    // Initialize severity and category maps
    Object.values(ErrorSeverity).forEach(severity => {
      this.errorMetrics.errorsBySeverity.set(severity, 0);
    });

    Object.values(ErrorCategory).forEach(category => {
      this.errorMetrics.errorsByCategory.set(category, 0);
    });

    // Start periodic cleanup and metrics calculation
    this.startPeriodicTasks();
  }

  // ============================================================================
  // ERROR REPORTING METHODS
  // ============================================================================

  /**
   * Report a transformation error
   */
  async reportTransformationError(error: TransformationError): Promise<void> {
    const errorReport: ErrorReport = {
      errorId: this.generateErrorId(),
      category: ErrorCategory.TRANSFORMATION,
      severity: this.determineSeverity(error),
      message: error.message,
      details: error.toDetailedString(),
      context: {
        step: error.step,
        vehicleId: error.vehicleId,
        recoverable: error.recoverable,
        ...error.context
      },
      timestamp: new Date(),
      stackTrace: error.stack,
      relatedErrors: [],
      recoverable: error.recoverable,
      recoverySuggestions: this.generateRecoverySuggestions(error),
      performanceImpact: {
        duration: 0, // Will be updated if performance data is available
        affectedOperations: 1
      }
    };

    await this.processErrorReport(errorReport);

    // Update performance metrics
    this.performanceMetrics.failedTransformations++;
    
    logger.error('Transformation error reported', {
      errorId: errorReport.errorId,
      step: error.step,
      vehicleId: error.vehicleId,
      recoverable: error.recoverable
    }, 'ERROR_REPORTER');
  }

  /**
   * Report a validation error
   */
  async reportValidationError(error: ValidationError): Promise<void> {
    const errorReport: ErrorReport = {
      errorId: this.generateErrorId(),
      category: ErrorCategory.VALIDATION,
      severity: error.severity === 'error' ? ErrorSeverity.MEDIUM : ErrorSeverity.LOW,
      message: error.message,
      details: `Validation failed for field '${error.field}': ${error.message}`,
      context: {
        field: error.field,
        code: error.code,
        metadata: error.metadata
      },
      timestamp: new Date(),
      relatedErrors: [],
      recoverable: true, // Validation errors are typically recoverable
      recoverySuggestions: [
        'Check input data format and structure',
        'Verify required fields are present',
        'Review field validation rules'
      ]
    };

    await this.processErrorReport(errorReport);

    logger.warn('Validation error reported', {
      errorId: errorReport.errorId,
      field: error.field,
      code: error.code
    }, 'ERROR_REPORTER');
  }

  /**
   * Report a validation warning
   */
  async reportValidationWarning(warning: ValidationWarning): Promise<void> {
    const errorReport: ErrorReport = {
      errorId: this.generateErrorId(),
      category: ErrorCategory.DATA_QUALITY,
      severity: ErrorSeverity.LOW,
      message: warning.message,
      details: `Validation warning for field '${warning.field}': ${warning.message}`,
      context: {
        field: warning.field,
        code: warning.code,
        suggestion: warning.suggestion,
        metadata: warning.metadata
      },
      timestamp: new Date(),
      relatedErrors: [],
      recoverable: true,
      recoverySuggestions: warning.suggestion ? [warning.suggestion] : []
    };

    await this.processErrorReport(errorReport);

    logger.debug('Validation warning reported', {
      errorId: errorReport.errorId,
      field: warning.field,
      code: warning.code
    }, 'ERROR_REPORTER');
  }

  /**
   * Report a performance issue
   */
  async reportPerformanceIssue(metric: PerformanceMetrics): Promise<void> {
    const errorReport: ErrorReport = {
      errorId: this.generateErrorId(),
      category: ErrorCategory.PERFORMANCE,
      severity: this.determinePerformanceSeverity(metric),
      message: 'Performance degradation detected',
      details: `Performance metrics indicate degradation: ${JSON.stringify(metric, null, 2)}`,
      context: {
        performanceMetrics: metric
      },
      timestamp: new Date(),
      relatedErrors: [],
      recoverable: true,
      recoverySuggestions: [
        'Check system resources and memory usage',
        'Review transformation pipeline efficiency',
        'Consider cache optimization',
        'Monitor data volume and complexity'
      ],
      performanceImpact: {
        duration: metric.totalTimeImpact,
        affectedOperations: metric.failedTransformations
      }
    };

    await this.processErrorReport(errorReport);

    // Update performance metrics
    this.performanceMetrics.totalTimeImpact += metric.totalTimeImpact;
    this.performanceMetrics.averageErrorOverhead = 
      (this.performanceMetrics.averageErrorOverhead + metric.averageErrorOverhead) / 2;

    logger.warn('Performance issue reported', {
      errorId: errorReport.errorId,
      timeImpact: metric.totalTimeImpact,
      failedTransformations: metric.failedTransformations
    }, 'ERROR_REPORTER');
  }

  /**
   * Report a general error
   */
  async reportError(error: Error, context: Record<string, any> = {}): Promise<void> {
    const standardError = ErrorHandler.fromError(error, context);
    
    const errorReport: ErrorReport = {
      errorId: this.generateErrorId(),
      category: this.categorizeError(error),
      severity: this.mapStandardErrorSeverity(ErrorHandler.getSeverity(standardError)),
      message: error.message,
      details: error.toString(),
      context: {
        ...context,
        errorType: error.constructor.name,
        standardError: ErrorHandler.createErrorReport(standardError)
      },
      timestamp: new Date(),
      stackTrace: error.stack,
      relatedErrors: [],
      recoverable: standardError.retryable,
      recoverySuggestions: this.generateGeneralRecoverySuggestions(error)
    };

    await this.processErrorReport(errorReport);

    logger.error('General error reported', {
      errorId: errorReport.errorId,
      errorType: error.constructor.name,
      message: error.message
    }, 'ERROR_REPORTER');
  }

  // ============================================================================
  // METRICS AND MONITORING
  // ============================================================================

  /**
   * Get error metrics for monitoring
   */
  getErrorMetrics(): ErrorMetrics {
    this.updateErrorMetrics();
    return { ...this.errorMetrics };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.resetMetrics();
    
    logger.info('Error history cleared', {}, 'ERROR_REPORTER');
  }

  /**
   * Export error reports for analysis
   */
  exportErrorReports(startDate?: Date, endDate?: Date): ErrorReport[] {
    let reports = this.errorHistory;

    if (startDate || endDate) {
      reports = reports.filter(report => {
        const reportTime = report.timestamp.getTime();
        const afterStart = !startDate || reportTime >= startDate.getTime();
        const beforeEnd = !endDate || reportTime <= endDate.getTime();
        return afterStart && beforeEnd;
      });
    }

    return reports.map(report => ({ ...report })); // Return copies
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async processErrorReport(errorReport: ErrorReport): Promise<void> {
    // Add to history
    this.errorHistory.push(errorReport);

    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Update metrics
    this.updateMetricsForNewError(errorReport);

    // Check for error patterns and correlations
    this.analyzeErrorPatterns(errorReport);

    // Update trends
    this.updateErrorTrends(errorReport);
  }

  private generateErrorId(): string {
    return `ERR-${Date.now()}-${++this.errorIdCounter}`;
  }

  private determineSeverity(error: TransformationError): ErrorSeverity {
    if (!error.recoverable) {
      return ErrorSeverity.CRITICAL;
    }

    if (error.step === 'input-validation' || error.step === 'context-validation') {
      return ErrorSeverity.HIGH;
    }

    if (error.vehicleId) {
      return ErrorSeverity.MEDIUM; // Single vehicle error
    }

    // Check step name for severity hints
    if (error.step.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }

    return ErrorSeverity.MEDIUM; // Default to medium for transformation errors
  }

  private determinePerformanceSeverity(metric: PerformanceMetrics): ErrorSeverity {
    if (metric.recoverySuccessRate < 0.5) {
      return ErrorSeverity.CRITICAL;
    }

    if (metric.totalTimeImpact > 10000 || metric.failedTransformations > 100) {
      return ErrorSeverity.HIGH;
    }

    if (metric.averageErrorOverhead > 1000) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const errorType = error.constructor.name.toLowerCase();

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }

    if (message.includes('auth') || message.includes('401') || message.includes('403')) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (message.includes('config') || message.includes('setup')) {
      return ErrorCategory.CONFIGURATION;
    }

    if (errorType.includes('transformation') || message.includes('transform')) {
      return ErrorCategory.TRANSFORMATION;
    }

    return ErrorCategory.DATA_QUALITY;
  }

  private mapStandardErrorSeverity(severity: string): ErrorSeverity {
    switch (severity) {
      case 'critical': return ErrorSeverity.CRITICAL;
      case 'high': return ErrorSeverity.HIGH;
      case 'medium': return ErrorSeverity.MEDIUM;
      case 'low': return ErrorSeverity.LOW;
      default: return ErrorSeverity.MEDIUM;
    }
  }

  private generateRecoverySuggestions(error: TransformationError): string[] {
    const suggestions: string[] = [];

    if (error.step === 'normalize-api-data') {
      suggestions.push('Check API response format and data structure');
      suggestions.push('Verify API endpoint is returning expected data');
    } else if (error.step === 'enrich-with-schedule') {
      suggestions.push('Check schedule data availability and format');
      suggestions.push('Verify station and route information');
    } else if (error.step === 'analyze-directions') {
      suggestions.push('Check GPS data quality and vehicle positions');
      suggestions.push('Verify direction analysis algorithms');
    } else if (error.step === 'generate-display-data') {
      suggestions.push('Check display data formatting and templates');
      suggestions.push('Verify UI data requirements');
    }

    if (error.vehicleId) {
      suggestions.push(`Check specific vehicle data for ID: ${error.vehicleId}`);
    }

    if (error.recoverable) {
      suggestions.push('Retry the operation with corrected data');
    } else {
      suggestions.push('Review system configuration and data sources');
    }

    return suggestions;
  }

  private generateGeneralRecoverySuggestions(error: Error): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('Check network connectivity');
      suggestions.push('Verify API endpoint availability');
      suggestions.push('Retry the operation');
    } else if (message.includes('timeout')) {
      suggestions.push('Increase timeout values');
      suggestions.push('Check system performance');
      suggestions.push('Retry with smaller data sets');
    } else if (message.includes('memory') || message.includes('heap')) {
      suggestions.push('Reduce data processing batch size');
      suggestions.push('Clear caches and optimize memory usage');
      suggestions.push('Check for memory leaks');
    } else {
      suggestions.push('Check error logs for more details');
      suggestions.push('Verify system configuration');
      suggestions.push('Contact support if issue persists');
    }

    return suggestions;
  }

  private updateMetricsForNewError(errorReport: ErrorReport): void {
    this.errorMetrics.totalErrors++;
    
    // Update severity counts
    const currentSeverityCount = this.errorMetrics.errorsBySeverity.get(errorReport.severity) || 0;
    this.errorMetrics.errorsBySeverity.set(errorReport.severity, currentSeverityCount + 1);
    
    // Update category counts
    const currentCategoryCount = this.errorMetrics.errorsByCategory.get(errorReport.category) || 0;
    this.errorMetrics.errorsByCategory.set(errorReport.category, currentCategoryCount + 1);
    
    // Update error rate (errors per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(e => e.timestamp > oneHourAgo);
    this.errorMetrics.errorRate = recentErrors.length;
  }

  private analyzeErrorPatterns(errorReport: ErrorReport): void {
    // Look for similar errors in recent history
    const recentErrors = this.errorHistory.slice(-100); // Last 100 errors
    const pattern = `${errorReport.category}:${errorReport.message.substring(0, 50)}`;
    
    let existingPattern = this.errorMetrics.commonErrorPatterns.find(p => p.pattern === pattern);
    
    if (existingPattern) {
      existingPattern.count++;
      existingPattern.lastOccurrence = errorReport.timestamp;
    } else {
      this.errorMetrics.commonErrorPatterns.push({
        pattern,
        count: 1,
        lastOccurrence: errorReport.timestamp
      });
    }
    
    // Keep only top 20 patterns
    this.errorMetrics.commonErrorPatterns.sort((a, b) => b.count - a.count);
    this.errorMetrics.commonErrorPatterns = this.errorMetrics.commonErrorPatterns.slice(0, 20);
  }

  private updateErrorTrends(errorReport: ErrorReport): void {
    const now = errorReport.timestamp;
    
    // Update hourly trend
    const hour = now.getHours();
    this.errorMetrics.trends.hourly[hour]++;
    
    // Update daily trend
    const dayOfWeek = now.getDay();
    this.errorMetrics.trends.daily[dayOfWeek]++;
    
    // Update weekly trend (simplified - use week of year)
    const weekOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const weekIndex = weekOfYear % 52;
    this.errorMetrics.trends.weekly[weekIndex]++;
  }

  private updateErrorMetrics(): void {
    // Calculate average resolution time (simplified)
    const resolvedErrors = this.errorHistory.filter(e => e.recoverable);
    if (resolvedErrors.length > 0) {
      // This is a simplified calculation - in a real system, you'd track actual resolution times
      this.errorMetrics.averageResolutionTime = 300000; // 5 minutes average
    }
  }

  private resetMetrics(): void {
    this.errorMetrics.totalErrors = 0;
    this.errorMetrics.errorsBySeverity.clear();
    this.errorMetrics.errorsByCategory.clear();
    this.errorMetrics.errorRate = 0;
    this.errorMetrics.averageResolutionTime = 0;
    this.errorMetrics.commonErrorPatterns = [];
    this.errorMetrics.trends = {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0),
      weekly: new Array(52).fill(0)
    };

    // Reinitialize maps
    Object.values(ErrorSeverity).forEach(severity => {
      this.errorMetrics.errorsBySeverity.set(severity, 0);
    });

    Object.values(ErrorCategory).forEach(category => {
      this.errorMetrics.errorsByCategory.set(category, 0);
    });

    this.performanceMetrics = {
      totalTimeImpact: 0,
      failedTransformations: 0,
      averageErrorOverhead: 0,
      errorMemoryUsage: [],
      recoverySuccessRate: 0
    };
  }

  private startPeriodicTasks(): void {
    // Clean up old error history every hour
    setInterval(() => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const initialLength = this.errorHistory.length;
      
      this.errorHistory = this.errorHistory.filter(error => error.timestamp > oneWeekAgo);
      
      const removedCount = initialLength - this.errorHistory.length;
      if (removedCount > 0) {
        logger.debug('Cleaned up old error history', { removedCount }, 'ERROR_REPORTER');
      }
    }, 60 * 60 * 1000); // Every hour

    // Update metrics every 5 minutes
    setInterval(() => {
      this.updateErrorMetrics();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

/**
 * Default error reporter instance
 */
export const errorReporter = new ErrorReporter();