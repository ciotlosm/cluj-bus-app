/**
 * Comprehensive Validation Pipeline
 * Orchestrates all validation components for complete refactoring validation
 * Validates Requirements: 5.3, 7.5, 8.3, 8.4
 */

import { performanceMonitor } from '../utils/performance/performance';
import { logger } from '../utils/shared/logger';
import { CodeIntegrityPreservationSystem } from './CodeIntegrityPreservationSystem';
import { FunctionalityPreservationValidator } from './FunctionalityPreservationValidator';
import {
  type ValidationReport,
  type TestResult,
  type BuildResult,
  type FunctionalityResult,
  type RefactoringPlan,
  type RefactoringResult
} from '../types/architectureSimplification';

/**
 * Validation pipeline configuration
 */
export interface ValidationPipelineConfig {
  /** Whether to run unit tests */
  runUnitTests: boolean;
  
  /** Whether to validate build */
  validateBuild: boolean;
  
  /** Whether to run functionality validation */
  runFunctionalityValidation: boolean;
  
  /** Whether to run behavioral tests */
  runBehavioralTests: boolean;
  
  /** Whether to monitor performance */
  monitorPerformance: boolean;
  
  /** Timeout for validation operations (ms) */
  timeout: number;
  
  /** Whether to create baseline snapshots */
  createBaseline: boolean;
  
  /** Whether to fail fast on critical errors */
  failFast: boolean;
}

/**
 * Validation pipeline result
 */
export interface ValidationPipelineResult {
  /** Overall validation success */
  success: boolean;
  
  /** Individual validation results */
  testResults?: TestResult;
  buildResults?: BuildResult;
  functionalityResults?: FunctionalityResult;
  
  /** Complete validation report */
  report: ValidationReport;
  
  /** Pipeline execution time */
  executionTime: number;
  
  /** Performance metrics during validation */
  performanceMetrics: Record<string, number>;
  
  /** Any errors encountered */
  errors: string[];
  
  /** Warnings generated */
  warnings: string[];
}

/**
 * Main comprehensive validation pipeline
 */
export class ComprehensiveValidationPipeline {
  private readonly codeIntegritySystem: CodeIntegrityPreservationSystem;
  private readonly functionalityValidator: FunctionalityPreservationValidator;
  private readonly projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.codeIntegritySystem = new CodeIntegrityPreservationSystem(projectRoot);
    this.functionalityValidator = new FunctionalityPreservationValidator(projectRoot);
  }

  /**
   * Runs the complete validation pipeline
   * Validates Requirements: 5.3, 7.5, 8.3, 8.4
   */
  async runValidationPipeline(config: ValidationPipelineConfig): Promise<ValidationPipelineResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    logger.info('Starting comprehensive validation pipeline', { config });
    
    try {
      let testResults: TestResult | undefined;
      let buildResults: BuildResult | undefined;
      let functionalityResults: FunctionalityResult | undefined;
      
      // Create baseline if requested
      if (config.createBaseline) {
        await this.createBaseline();
      }
      
      // Step 1: Run unit tests
      if (config.runUnitTests) {
        try {
          logger.info('Running unit tests...');
          testResults = await this.runWithTimeout(
            () => this.codeIntegritySystem.runTests(),
            config.timeout,
            'Unit tests'
          );
          
          if (!testResults.success && config.failFast) {
            errors.push(`Unit tests failed: ${testResults.testsFailed} failures`);
            return this.createFailureResult(startTime, errors, warnings, testResults, buildResults, functionalityResults);
          }
        } catch (error) {
          const errorMsg = `Unit test execution failed: ${error}`;
          errors.push(errorMsg);
          if (config.failFast) {
            return this.createFailureResult(startTime, errors, warnings, testResults, buildResults, functionalityResults);
          }
        }
      }
      
      // Step 2: Validate build
      if (config.validateBuild) {
        try {
          logger.info('Validating build...');
          buildResults = await this.runWithTimeout(
            () => this.codeIntegritySystem.validateBuild(),
            config.timeout,
            'Build validation'
          );
          
          if (!buildResults.success && config.failFast) {
            errors.push(`Build validation failed: ${buildResults.errors.length} errors`);
            return this.createFailureResult(startTime, errors, warnings, testResults, buildResults, functionalityResults);
          }
        } catch (error) {
          const errorMsg = `Build validation failed: ${error}`;
          errors.push(errorMsg);
          if (config.failFast) {
            return this.createFailureResult(startTime, errors, warnings, testResults, buildResults, functionalityResults);
          }
        }
      }
      
      // Step 3: Run functionality validation
      if (config.runFunctionalityValidation) {
        try {
          logger.info('Running functionality validation...');
          functionalityResults = await this.runWithTimeout(
            () => this.functionalityValidator.validateFunctionality(testResults, buildResults),
            config.timeout,
            'Functionality validation'
          );
          
          if (!functionalityResults.functionalityPreserved && config.failFast) {
            const criticalChanges = functionalityResults.changes.filter(c => 
              c.severity === 'critical' || c.severity === 'high'
            ).length;
            errors.push(`Functionality validation failed: ${criticalChanges} critical changes detected`);
            return this.createFailureResult(startTime, errors, warnings, testResults, buildResults, functionalityResults);
          }
        } catch (error) {
          const errorMsg = `Functionality validation failed: ${error}`;
          errors.push(errorMsg);
          if (config.failFast) {
            return this.createFailureResult(startTime, errors, warnings, testResults, buildResults, functionalityResults);
          }
        }
      }
      
      // Step 4: Generate comprehensive report
      const report = await this.generateComprehensiveReport(testResults, buildResults, functionalityResults);
      
      // Step 5: Assess overall success
      const success = this.assessOverallSuccess(testResults, buildResults, functionalityResults, errors);
      
      const executionTime = performance.now() - startTime;
      const performanceMetrics = this.capturePerformanceMetrics();
      
      performanceMonitor.recordTiming('validation_pipeline.complete_execution', executionTime);
      
      const result: ValidationPipelineResult = {
        success,
        testResults,
        buildResults,
        functionalityResults,
        report,
        executionTime,
        performanceMetrics,
        errors,
        warnings
      };
      
      logger.info('Validation pipeline completed', {
        success,
        executionTime,
        errorCount: errors.length,
        warningCount: warnings.length
      });
      
      return result;
      
    } catch (error) {
      const errorMsg = `Validation pipeline failed: ${error}`;
      errors.push(errorMsg);
      logger.error('Validation pipeline failed', { error });
      
      return this.createFailureResult(startTime, errors, warnings);
    }
  }

  /**
   * Validates a refactoring plan before execution
   * Validates Requirements: 8.3, 8.4
   */
  async validateRefactoringPlan(
    plan: RefactoringPlan,
    config: Partial<ValidationPipelineConfig> = {}
  ): Promise<ValidationPipelineResult> {
    const fullConfig: ValidationPipelineConfig = {
      runUnitTests: true,
      validateBuild: true,
      runFunctionalityValidation: true,
      runBehavioralTests: true,
      monitorPerformance: true,
      timeout: 60000, // 1 minute
      createBaseline: true,
      failFast: false,
      ...config
    };
    
    logger.info('Validating refactoring plan', {
      operationCount: plan.operations.length,
      riskLevel: plan.impact.riskLevel
    });
    
    // Create baseline before validation
    await this.createBaseline();
    
    // Run validation pipeline
    const result = await this.runValidationPipeline(fullConfig);
    
    // Add plan-specific validation
    result.warnings.push(...this.validatePlanRisks(plan));
    
    return result;
  }

  /**
   * Validates refactoring results after execution
   * Validates Requirements: 5.3, 7.5, 8.3, 8.4
   */
  async validateRefactoringResults(
    results: RefactoringResult,
    config: Partial<ValidationPipelineConfig> = {}
  ): Promise<ValidationPipelineResult> {
    const fullConfig: ValidationPipelineConfig = {
      runUnitTests: true,
      validateBuild: true,
      runFunctionalityValidation: true,
      runBehavioralTests: true,
      monitorPerformance: true,
      timeout: 60000, // 1 minute
      createBaseline: false, // Don't create new baseline after refactoring
      failFast: true, // Fail fast after refactoring to catch issues quickly
      ...config
    };
    
    logger.info('Validating refactoring results', {
      success: results.success,
      completedOperations: results.completedOperations.length,
      failedOperations: results.failedOperations.length,
      modifiedFiles: results.modifiedFiles.length
    });
    
    // Run validation pipeline
    const result = await this.runValidationPipeline(fullConfig);
    
    // Add refactoring-specific validation
    if (!results.success) {
      result.errors.push(`Refactoring failed: ${results.failedOperations.length} operations failed`);
    }
    
    // Check for file integrity issues
    const integrityIssues = await this.validateFileIntegrity(results.modifiedFiles);
    result.warnings.push(...integrityIssues);
    
    return result;
  }

  /**
   * Creates a baseline snapshot for future comparisons
   */
  async createBaseline(): Promise<void> {
    logger.info('Creating baseline snapshot...');
    await this.functionalityValidator.setBaseline();
    logger.info('Baseline snapshot created');
  }

  /**
   * Clears the baseline snapshot
   */
  clearBaseline(): void {
    this.functionalityValidator.clearBaseline();
    logger.info('Baseline snapshot cleared');
  }

  // Private helper methods

  private async runWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeout}ms`));
      }, timeout);
      
      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async generateComprehensiveReport(
    testResults?: TestResult,
    buildResults?: BuildResult,
    functionalityResults?: FunctionalityResult
  ): Promise<ValidationReport> {
    // Use existing report generation if available, otherwise create minimal report
    if (testResults && buildResults && functionalityResults) {
      return this.codeIntegritySystem.generateReport();
    }
    
    // Create minimal report from available results
    const overallSuccess = (testResults?.success ?? true) && 
                          (buildResults?.success ?? true) && 
                          (functionalityResults?.functionalityPreserved ?? true);
    
    const issuesSummary: string[] = [];
    const recommendations: string[] = [];
    
    if (testResults && !testResults.success) {
      issuesSummary.push(`${testResults.testsFailed} tests failed`);
      recommendations.push('Fix failing tests before proceeding');
    }
    
    if (buildResults && !buildResults.success) {
      issuesSummary.push(`${buildResults.errors.length} build errors`);
      recommendations.push('Resolve build errors');
    }
    
    if (functionalityResults && !functionalityResults.functionalityPreserved) {
      const criticalChanges = functionalityResults.changes.filter(c => 
        c.severity === 'critical' || c.severity === 'high'
      ).length;
      issuesSummary.push(`${criticalChanges} critical functionality changes`);
      recommendations.push('Review functionality changes');
    }
    
    return {
      testResults: testResults || { success: true, testsRun: 0, testsPassed: 0, testsFailed: 0, failures: [], executionTime: 0 },
      buildResults: buildResults || { success: true, errors: [], warnings: [], buildTime: 0 },
      functionalityResults: functionalityResults || { functionalityPreserved: true, changes: [], performanceImpact: { bundleSizeChange: 0, runtimeChange: 0, memoryChange: 0, overallImpact: 'neutral' }, timestamp: new Date() },
      overallSuccess,
      issuesSummary,
      recommendations
    };
  }

  private assessOverallSuccess(
    testResults?: TestResult,
    buildResults?: BuildResult,
    functionalityResults?: FunctionalityResult,
    errors: string[] = []
  ): boolean {
    if (errors.length > 0) return false;
    
    const testSuccess = testResults?.success ?? true;
    const buildSuccess = buildResults?.success ?? true;
    const functionalitySuccess = functionalityResults?.functionalityPreserved ?? true;
    
    return testSuccess && buildSuccess && functionalitySuccess;
  }

  private capturePerformanceMetrics(): Record<string, number> {
    const summary = performanceMonitor.getSummary();
    const metrics: Record<string, number> = {};
    
    Object.entries(summary).forEach(([name, stats]) => {
      metrics[`${name}.avg`] = stats.avg;
      metrics[`${name}.max`] = stats.max;
      metrics[`${name}.count`] = stats.count;
    });
    
    return metrics;
  }

  private createFailureResult(
    startTime: number,
    errors: string[],
    warnings: string[],
    testResults?: TestResult,
    buildResults?: BuildResult,
    functionalityResults?: FunctionalityResult
  ): ValidationPipelineResult {
    const executionTime = performance.now() - startTime;
    
    return {
      success: false,
      testResults,
      buildResults,
      functionalityResults,
      report: {
        testResults: testResults || { success: false, testsRun: 0, testsPassed: 0, testsFailed: 0, failures: [], executionTime: 0 },
        buildResults: buildResults || { success: false, errors: [], warnings: [], buildTime: 0 },
        functionalityResults: functionalityResults || { functionalityPreserved: false, changes: [], performanceImpact: { bundleSizeChange: 0, runtimeChange: 0, memoryChange: 0, overallImpact: 'negative' }, timestamp: new Date() },
        overallSuccess: false,
        issuesSummary: errors,
        recommendations: ['Fix critical errors before proceeding with refactoring']
      },
      executionTime,
      performanceMetrics: this.capturePerformanceMetrics(),
      errors,
      warnings
    };
  }

  private validatePlanRisks(plan: RefactoringPlan): string[] {
    const warnings: string[] = [];
    
    if (plan.impact.riskLevel === 'high') {
      warnings.push('High-risk refactoring plan detected - proceed with caution');
    }
    
    if (plan.operations.length > 10) {
      warnings.push('Large number of operations - consider breaking into smaller batches');
    }
    
    if (plan.impact.filesAffected > 50) {
      warnings.push('Large number of files affected - ensure comprehensive testing');
    }
    
    return warnings;
  }

  private async validateFileIntegrity(modifiedFiles: string[]): Promise<string[]> {
    const warnings: string[] = [];
    
    // Check for common file integrity issues
    for (const file of modifiedFiles) {
      try {
        // Basic file existence check
        const fs = await import('fs/promises');
        await fs.access(file);
      } catch (error) {
        warnings.push(`Modified file not accessible: ${file}`);
      }
    }
    
    return warnings;
  }
}

/**
 * Default configuration for validation pipeline
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationPipelineConfig = {
  runUnitTests: true,
  validateBuild: true,
  runFunctionalityValidation: true,
  runBehavioralTests: true,
  monitorPerformance: true,
  timeout: 60000, // 1 minute
  createBaseline: false,
  failFast: false
};

/**
 * Default export for easy importing
 */
export default ComprehensiveValidationPipeline;