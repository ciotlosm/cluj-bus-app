/**
 * Error Handling and Rollback System
 * Comprehensive error detection, recovery, and rollback system for refactoring operations
 * Validates Requirements: 8.5
 */

import * as fs from 'fs';
import { join, dirname } from 'path';
import * as childProcess from 'child_process';
import { logger } from '../utils/shared/logger';
import { performanceMonitor } from '../utils/performance/performance';
import type {
  RefactoringPlan,
  RefactoringOperation,
  RefactoringResult,
  RefactoringFailure,
  RollbackOperation,
  BackupData,
  ValidationReport,
  TestResult,
  BuildResult,
  FunctionalityResult
} from '../types/architectureSimplification';

/**
 * Types of errors that can occur during refactoring
 */
export type ErrorType = 
  | 'syntax_error'
  | 'build_error' 
  | 'test_failure'
  | 'import_resolution_error'
  | 'file_system_error'
  | 'validation_error'
  | 'rollback_error'
  | 'unknown_error';

/**
 * Severity levels for errors
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Recovery strategy for different error types
 */
export type RecoveryStrategy = 
  | 'retry'
  | 'rollback'
  | 'skip'
  | 'manual_intervention'
  | 'partial_rollback'
  | 'auto_fix';

/**
 * Detailed error information
 */
export interface RefactoringError {
  /** Unique error identifier */
  id: string;
  
  /** Type of error */
  type: ErrorType;
  
  /** Error severity */
  severity: ErrorSeverity;
  
  /** Human-readable error message */
  message: string;
  
  /** Technical error details */
  details: string;
  
  /** Stack trace if available */
  stackTrace?: string;
  
  /** Operation that caused the error */
  operationId?: string;
  
  /** Files affected by the error */
  affectedFiles: string[];
  
  /** Suggested recovery strategy */
  recoveryStrategy: RecoveryStrategy;
  
  /** Recovery guidance for users */
  recoveryGuidance: string;
  
  /** Timestamp when error occurred */
  timestamp: Date;
  
  /** Context information */
  context: Record<string, any>;
}

/**
 * State snapshot for rollback operations
 */
export interface StateSnapshot {
  /** Snapshot identifier */
  id: string;
  
  /** Timestamp when snapshot was created */
  timestamp: Date;
  
  /** File contents at snapshot time */
  fileContents: Record<string, string>;
  
  /** File paths at snapshot time */
  filePaths: Record<string, string>;
  
  /** Directory structure */
  directoryStructure: DirectoryNode[];
  
  /** Git commit hash if available */
  gitCommit?: string;
  
  /** Validation state at snapshot time */
  validationState: ValidationSnapshot;
}

/**
 * Directory structure node
 */
export interface DirectoryNode {
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  size?: number;
  lastModified?: Date;
}

/**
 * Validation state snapshot
 */
export interface ValidationSnapshot {
  testsPass: boolean;
  buildSucceeds: boolean;
  functionalityPreserved: boolean;
  lastValidationTime: Date;
}

/**
 * Recovery operation result
 */
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  message: string;
  recoveredFiles: string[];
  remainingIssues: RefactoringError[];
}

/**
 * Main error handling and rollback system
 */
export class ErrorHandlingRollbackSystem {
  private readonly projectRoot: string;
  private readonly snapshots = new Map<string, StateSnapshot>();
  private readonly errorHistory: RefactoringError[] = [];
  private readonly maxSnapshots = 10;
  private readonly maxErrorHistory = 100;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Creates a comprehensive state snapshot before refactoring operations
   * Validates Requirements: 8.5
   */
  async createStateSnapshot(operationId: string): Promise<StateSnapshot> {
    const startTime = performance.now();
    
    try {
      const snapshot: StateSnapshot = {
        id: operationId,
        timestamp: new Date(),
        fileContents: await this.captureFileContents(),
        filePaths: await this.captureFilePaths(),
        directoryStructure: await this.captureDirectoryStructure(),
        gitCommit: await this.getCurrentGitCommit(),
        validationState: await this.captureValidationState()
      };

      // Store snapshot with size limit
      this.snapshots.set(operationId, snapshot);
      this.enforceSnapshotLimit();

      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('error_handling.snapshot_creation', duration);
      
      logger.info('State snapshot created', {
        operationId,
        fileCount: Object.keys(snapshot.fileContents).length,
        duration
      });

      return snapshot;
    } catch (error) {
      const errorMsg = `Failed to create state snapshot: ${error}`;
      logger.error(errorMsg, { operationId, error });
      throw new Error(errorMsg);
    }
  }

  /**
   * Detects and categorizes errors during refactoring operations
   * Validates Requirements: 8.5
   */
  async detectErrors(
    operation: RefactoringOperation,
    validationReport?: ValidationReport
  ): Promise<RefactoringError[]> {
    const errors: RefactoringError[] = [];
    
    try {
      // Check for syntax errors
      const syntaxErrors = await this.detectSyntaxErrors(operation.affectedFiles);
      errors.push(...syntaxErrors);
      
      // Check for build errors
      const buildErrors = await this.detectBuildErrors();
      errors.push(...buildErrors);
      
      // Check for test failures
      const testErrors = await this.detectTestFailures();
      errors.push(...testErrors);
      
      // Check for import resolution errors
      const importErrors = await this.detectImportErrors(operation.affectedFiles);
      errors.push(...importErrors);
      
      // Check for file system errors
      const fsErrors = await this.detectFileSystemErrors(operation.affectedFiles);
      errors.push(...fsErrors);
      
      // Add validation errors if provided
      if (validationReport) {
        const validationErrors = this.convertValidationToErrors(validationReport, operation.id);
        errors.push(...validationErrors);
      }
      
      // Store errors in history
      errors.forEach(error => this.addToErrorHistory(error));
      
      logger.info('Error detection completed', {
        operationId: operation.id,
        errorCount: errors.length,
        criticalErrors: errors.filter(e => e.severity === 'critical').length
      });
      
      return errors;
    } catch (error) {
      const detectionError = this.createError(
        'unknown_error',
        'critical',
        'Error detection failed',
        `Failed to detect errors: ${error}`,
        operation.affectedFiles,
        'manual_intervention',
        'Please check the system manually and resolve any issues.',
        operation.id
      );
      
      this.addToErrorHistory(detectionError);
      return [detectionError];
    }
  }

  /**
   * Executes rollback operations to restore previous state
   * Validates Requirements: 8.5
   */
  async executeRollback(
    snapshotId: string,
    rollbackOperations?: RollbackOperation[]
  ): Promise<RecoveryResult> {
    const startTime = performance.now();
    
    try {
      const snapshot = this.snapshots.get(snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }
      
      logger.info('Starting rollback operation', { snapshotId });
      
      // Create backup of current state before rollback
      const preRollbackSnapshot = await this.createStateSnapshot(`rollback-backup-${Date.now()}`);
      
      const recoveredFiles: string[] = [];
      const remainingIssues: RefactoringError[] = [];
      
      try {
        // Restore file contents
        for (const [filePath, originalContent] of Object.entries(snapshot.fileContents)) {
          try {
            await this.ensureDirectoryExists(dirname(filePath));
            await fs.promises.writeFile(filePath, originalContent, 'utf8');
            recoveredFiles.push(filePath);
          } catch (error) {
            const rollbackError = this.createError(
              'rollback_error',
              'high',
              `Failed to restore file: ${filePath}`,
              `${error}`,
              [filePath],
              'manual_intervention',
              `Manually restore the file ${filePath} from backup.`
            );
            remainingIssues.push(rollbackError);
          }
        }
        
        // Restore file paths (handle renames/moves)
        for (const [currentPath, originalPath] of Object.entries(snapshot.filePaths)) {
          if (currentPath !== originalPath) {
            try {
              await fs.promises.rename(currentPath, originalPath);
              recoveredFiles.push(originalPath);
            } catch (error) {
              const rollbackError = this.createError(
                'rollback_error',
                'medium',
                `Failed to restore path: ${currentPath} -> ${originalPath}`,
                `${error}`,
                [currentPath, originalPath],
                'manual_intervention',
                `Manually move ${currentPath} to ${originalPath}.`
              );
              remainingIssues.push(rollbackError);
            }
          }
        }
        
        // Execute custom rollback operations if provided
        if (rollbackOperations) {
          for (const rollbackOp of rollbackOperations) {
            try {
              await this.executeCustomRollback(rollbackOp);
            } catch (error) {
              const rollbackError = this.createError(
                'rollback_error',
                'high',
                `Custom rollback failed: ${rollbackOp.operationId}`,
                `${error}`,
                rollbackOp.filesToRestore,
                'manual_intervention',
                `Manually review and fix issues with operation ${rollbackOp.operationId}.`
              );
              remainingIssues.push(rollbackError);
            }
          }
        }
        
        // Validate rollback success
        const postRollbackValidation = await this.validateRollback(snapshot);
        if (!postRollbackValidation.success) {
          remainingIssues.push(...postRollbackValidation.errors);
        }
        
        const duration = performance.now() - startTime;
        performanceMonitor.recordTiming('error_handling.rollback_execution', duration);
        
        const result: RecoveryResult = {
          success: remainingIssues.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
          strategy: 'rollback',
          message: remainingIssues.length === 0 
            ? 'Rollback completed successfully'
            : `Rollback completed with ${remainingIssues.length} remaining issues`,
          recoveredFiles,
          remainingIssues
        };
        
        logger.info('Rollback operation completed', {
          snapshotId,
          success: result.success,
          recoveredFiles: recoveredFiles.length,
          remainingIssues: remainingIssues.length,
          duration
        });
        
        return result;
        
      } catch (error) {
        // Critical rollback failure - try to restore pre-rollback state
        logger.error('Critical rollback failure, attempting to restore pre-rollback state', {
          snapshotId,
          error
        });
        
        try {
          await this.executeRollback(preRollbackSnapshot.id);
        } catch (restoreError) {
          logger.error('Failed to restore pre-rollback state', { restoreError });
        }
        
        throw error;
      }
      
    } catch (error) {
      const rollbackError = this.createError(
        'rollback_error',
        'critical',
        'Rollback operation failed',
        `${error}`,
        [],
        'manual_intervention',
        'System is in an inconsistent state. Manual intervention required to restore functionality.'
      );
      
      this.addToErrorHistory(rollbackError);
      
      return {
        success: false,
        strategy: 'rollback',
        message: `Rollback failed: ${error}`,
        recoveredFiles: [],
        remainingIssues: [rollbackError]
      };
    }
  }

  /**
   * Provides automated recovery for common failure scenarios
   * Validates Requirements: 8.5
   */
  async attemptAutomaticRecovery(errors: RefactoringError[]): Promise<RecoveryResult[]> {
    const results: RecoveryResult[] = [];
    
    for (const error of errors) {
      try {
        let result: RecoveryResult;
        
        switch (error.recoveryStrategy) {
          case 'retry':
            result = await this.retryOperation(error);
            break;
            
          case 'auto_fix':
            result = await this.attemptAutoFix(error);
            break;
            
          case 'partial_rollback':
            result = await this.executePartialRollback(error);
            break;
            
          case 'skip':
            result = await this.skipOperation(error);
            break;
            
          default:
            result = {
              success: false,
              strategy: error.recoveryStrategy,
              message: `Manual intervention required for ${error.type}`,
              recoveredFiles: [],
              remainingIssues: [error]
            };
        }
        
        results.push(result);
        
      } catch (recoveryError) {
        const failedRecovery: RecoveryResult = {
          success: false,
          strategy: error.recoveryStrategy,
          message: `Recovery failed: ${recoveryError}`,
          recoveredFiles: [],
          remainingIssues: [error]
        };
        
        results.push(failedRecovery);
      }
    }
    
    logger.info('Automatic recovery completed', {
      totalErrors: errors.length,
      successfulRecoveries: results.filter(r => r.success).length,
      failedRecoveries: results.filter(r => !r.success).length
    });
    
    return results;
  }

  /**
   * Provides clear error messages and recovery guidance
   * Validates Requirements: 8.5
   */
  generateErrorReport(errors: RefactoringError[]): string {
    if (errors.length === 0) {
      return 'No errors detected.';
    }
    
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const highErrors = errors.filter(e => e.severity === 'high');
    const mediumErrors = errors.filter(e => e.severity === 'medium');
    const lowErrors = errors.filter(e => e.severity === 'low');
    
    let report = '# Refactoring Error Report\n\n';
    
    // Summary
    report += '## Summary\n\n';
    report += `- **Total Errors**: ${errors.length}\n`;
    report += `- **Critical**: ${criticalErrors.length}\n`;
    report += `- **High**: ${highErrors.length}\n`;
    report += `- **Medium**: ${mediumErrors.length}\n`;
    report += `- **Low**: ${lowErrors.length}\n\n`;
    
    // Critical errors first
    if (criticalErrors.length > 0) {
      report += '## 🚨 Critical Errors (Immediate Action Required)\n\n';
      criticalErrors.forEach(error => {
        report += this.formatErrorDetails(error);
      });
    }
    
    // High priority errors
    if (highErrors.length > 0) {
      report += '## ⚠️ High Priority Errors\n\n';
      highErrors.forEach(error => {
        report += this.formatErrorDetails(error);
      });
    }
    
    // Medium priority errors
    if (mediumErrors.length > 0) {
      report += '## ⚡ Medium Priority Errors\n\n';
      mediumErrors.forEach(error => {
        report += this.formatErrorDetails(error);
      });
    }
    
    // Low priority errors
    if (lowErrors.length > 0) {
      report += '## ℹ️ Low Priority Errors\n\n';
      lowErrors.forEach(error => {
        report += this.formatErrorDetails(error);
      });
    }
    
    // Recovery recommendations
    report += '## 🔧 Recovery Recommendations\n\n';
    const recoveryStrategies = new Map<RecoveryStrategy, RefactoringError[]>();
    
    errors.forEach(error => {
      if (!recoveryStrategies.has(error.recoveryStrategy)) {
        recoveryStrategies.set(error.recoveryStrategy, []);
      }
      recoveryStrategies.get(error.recoveryStrategy)!.push(error);
    });
    
    recoveryStrategies.forEach((strategyErrors, strategy) => {
      report += `### ${this.getRecoveryStrategyDescription(strategy)}\n\n`;
      strategyErrors.forEach(error => {
        report += `- **${error.message}**: ${error.recoveryGuidance}\n`;
      });
      report += '\n';
    });
    
    return report;
  }

  /**
   * Gets error history for analysis and debugging
   */
  getErrorHistory(): RefactoringError[] {
    return [...this.errorHistory];
  }

  /**
   * Gets available snapshots
   */
  getAvailableSnapshots(): StateSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Clears error history and old snapshots
   */
  cleanup(): void {
    // Keep only recent errors
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.splice(0, this.errorHistory.length - this.maxErrorHistory);
    }
    
    // Keep only recent snapshots
    this.enforceSnapshotLimit();
    
    logger.info('Error handling system cleanup completed', {
      errorHistorySize: this.errorHistory.length,
      snapshotCount: this.snapshots.size
    });
  }

  // Private helper methods

  private async captureFileContents(): Promise<Record<string, string>> {
    const contents: Record<string, string> = {};
    const files = await this.getAllSourceFiles();
    
    for (const file of files) {
      try {
        contents[file] = await fs.promises.readFile(file, 'utf8');
      } catch (error) {
        // File might not exist or be accessible
        logger.warn(`Failed to capture content for ${file}`, { error });
      }
    }
    
    return contents;
  }

  private async captureFilePaths(): Promise<Record<string, string>> {
    const paths: Record<string, string> = {};
    const files = await this.getAllSourceFiles();
    
    files.forEach(file => {
      paths[file] = file; // Current path maps to itself
    });
    
    return paths;
  }

  private async captureDirectoryStructure(): Promise<DirectoryNode[]> {
    return await this.scanDirectory(this.projectRoot);
  }

  private async scanDirectory(dirPath: string): Promise<DirectoryNode[]> {
    const nodes: DirectoryNode[] = [];
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
            const children = await this.scanDirectory(fullPath);
            nodes.push({
              path: fullPath,
              type: 'directory',
              children
            });
          }
        } else if (entry.isFile()) {
          const stats = await fs.promises.stat(fullPath);
          nodes.push({
            path: fullPath,
            type: 'file',
            size: stats.size,
            lastModified: stats.mtime
          });
        }
      }
    } catch (error) {
      logger.warn(`Failed to scan directory ${dirPath}`, { error });
    }
    
    return nodes;
  }

  private async getCurrentGitCommit(): Promise<string | undefined> {
    try {
      return childProcess.execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      return undefined;
    }
  }

  private async captureValidationState(): Promise<ValidationSnapshot> {
    // Basic validation state capture
    // In a real implementation, this would run actual validation
    return {
      testsPass: true,
      buildSucceeds: true,
      functionalityPreserved: true,
      lastValidationTime: new Date()
    };
  }

  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
              await scanDir(fullPath);
            }
          } else if (entry.isFile()) {
            if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Directory might not exist or be accessible
      }
    };
    
    await scanDir(this.projectRoot);
    return files;
  }

  private async detectSyntaxErrors(files: string[]): Promise<RefactoringError[]> {
    const errors: RefactoringError[] = [];
    
    for (const file of files) {
      try {
        // Try to parse the file with TypeScript
        childProcess.execSync(`npx tsc --noEmit --skipLibCheck ${file}`, {
          cwd: this.projectRoot,
          encoding: 'utf8'
        });
      } catch (error: any) {
        const syntaxError = this.createError(
          'syntax_error',
          'high',
          `Syntax error in ${file}`,
          error.message,
          [file],
          'auto_fix',
          `Review and fix syntax errors in ${file}. Check for missing semicolons, brackets, or type errors.`
        );
        errors.push(syntaxError);
      }
    }
    
    return errors;
  }

  private async detectBuildErrors(): Promise<RefactoringError[]> {
    try {
      childProcess.execSync('npx tsc --noEmit', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      return [];
    } catch (error: any) {
      return [this.createError(
        'build_error',
        'critical',
        'Build compilation failed',
        error.message,
        [],
        'rollback',
        'Fix TypeScript compilation errors or rollback the changes.'
      )];
    }
  }

  private async detectTestFailures(): Promise<RefactoringError[]> {
    try {
      childProcess.execSync('npm test', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      return [];
    } catch (error: any) {
      return [this.createError(
        'test_failure',
        'high',
        'Tests are failing',
        error.message,
        [],
        'rollback',
        'Fix failing tests or rollback the changes that caused test failures.'
      )];
    }
  }

  private async detectImportErrors(files: string[]): Promise<RefactoringError[]> {
    const errors: RefactoringError[] = [];
    
    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        const importMatches = content.match(/import\s+.+?\s+from\s+['"](.+?)['"];?/g);
        
        if (importMatches) {
          for (const importMatch of importMatches) {
            const pathMatch = importMatch.match(/from\s+['"](.+?)['"];?/);
            if (pathMatch) {
              const importPath = pathMatch[1];
              if (importPath.startsWith('.')) {
                // Check if relative import exists
                const resolvedPath = join(dirname(file), importPath);
                const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
                
                let exists = false;
                for (const ext of possibleExtensions) {
                  try {
                    await fs.promises.access(resolvedPath + ext);
                    exists = true;
                    break;
                  } catch {
                    // Continue checking
                  }
                }
                
                if (!exists) {
                  const importError = this.createError(
                    'import_resolution_error',
                    'high',
                    `Import not found: ${importPath} in ${file}`,
                    `Cannot resolve import "${importPath}"`,
                    [file],
                    'auto_fix',
                    `Update the import path "${importPath}" in ${file} to point to the correct location.`
                  );
                  errors.push(importError);
                }
              }
            }
          }
        }
      } catch (error) {
        // File might not exist or be readable
      }
    }
    
    return errors;
  }

  private async detectFileSystemErrors(files: string[]): Promise<RefactoringError[]> {
    const errors: RefactoringError[] = [];
    
    for (const file of files) {
      try {
        await fs.promises.access(file);
      } catch (error) {
        const fsError = this.createError(
          'file_system_error',
          'medium',
          `File system error: ${file}`,
          `Cannot access file: ${error}`,
          [file],
          'manual_intervention',
          `Check file permissions and existence for ${file}.`
        );
        errors.push(fsError);
      }
    }
    
    return errors;
  }

  private convertValidationToErrors(
    validationReport: ValidationReport,
    operationId: string
  ): RefactoringError[] {
    const errors: RefactoringError[] = [];
    
    // Convert test failures
    if (!validationReport.testResults.success) {
      validationReport.testResults.failures.forEach(failure => {
        const testError = this.createError(
          'test_failure',
          'high',
          `Test failure: ${failure.testName}`,
          failure.error,
          [failure.testFile],
          'rollback',
          `Fix the failing test "${failure.testName}" or rollback the changes.`,
          operationId
        );
        errors.push(testError);
      });
    }
    
    // Convert build errors
    if (!validationReport.buildResults.success) {
      validationReport.buildResults.errors.forEach(buildError => {
        const error = this.createError(
          'build_error',
          'critical',
          `Build error in ${buildError.file}`,
          buildError.message,
          [buildError.file],
          'rollback',
          `Fix the build error at line ${buildError.line} in ${buildError.file}.`,
          operationId
        );
        errors.push(error);
      });
    }
    
    // Convert functionality changes
    if (!validationReport.functionalityResults.functionalityPreserved) {
      validationReport.functionalityResults.changes
        .filter(change => change.severity === 'critical' || change.severity === 'high')
        .forEach(change => {
          const funcError = this.createError(
            'validation_error',
            change.severity as ErrorSeverity,
            `Functionality change: ${change.component}`,
            change.description,
            [change.component],
            'rollback',
            `Review and address the functionality change in ${change.component}.`,
            operationId
          );
          errors.push(funcError);
        });
    }
    
    return errors;
  }

  private createError(
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    details: string,
    affectedFiles: string[],
    recoveryStrategy: RecoveryStrategy,
    recoveryGuidance: string,
    operationId?: string
  ): RefactoringError {
    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      details,
      affectedFiles,
      recoveryStrategy,
      recoveryGuidance,
      operationId,
      timestamp: new Date(),
      context: {}
    };
  }

  private addToErrorHistory(error: RefactoringError): void {
    this.errorHistory.push(error);
    
    // Enforce history limit
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  private enforceSnapshotLimit(): void {
    if (this.snapshots.size > this.maxSnapshots) {
      // Remove oldest snapshots
      const sortedSnapshots = Array.from(this.snapshots.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const toRemove = sortedSnapshots.slice(0, this.snapshots.size - this.maxSnapshots);
      toRemove.forEach(([id]) => this.snapshots.delete(id));
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async executeCustomRollback(rollbackOp: RollbackOperation): Promise<void> {
    // Execute custom rollback operation based on type
    switch (rollbackOp.type) {
      case 'restore':
        for (const file of rollbackOp.filesToRestore) {
          const originalContent = rollbackOp.backupData.originalContents[file];
          if (originalContent !== undefined) {
            await fs.promises.writeFile(file, originalContent, 'utf8');
          }
        }
        break;
        
      case 'undo':
        // Implement undo logic based on operation type
        break;
        
      case 'revert':
        // Implement revert logic
        break;
    }
  }

  private async validateRollback(snapshot: StateSnapshot): Promise<{
    success: boolean;
    errors: RefactoringError[];
  }> {
    const errors: RefactoringError[] = [];
    
    try {
      // Validate that files were restored correctly
      for (const [filePath, expectedContent] of Object.entries(snapshot.fileContents)) {
        try {
          const actualContent = await fs.promises.readFile(filePath, 'utf8');
          if (actualContent !== expectedContent) {
            errors.push(this.createError(
              'rollback_error',
              'medium',
              `File content mismatch after rollback: ${filePath}`,
              'File was not restored to expected state',
              [filePath],
              'manual_intervention',
              `Manually verify and fix the content of ${filePath}.`
            ));
          }
        } catch (error) {
          errors.push(this.createError(
            'rollback_error',
            'high',
            `File missing after rollback: ${filePath}`,
            `${error}`,
            [filePath],
            'manual_intervention',
            `Manually restore the missing file ${filePath}.`
          ));
        }
      }
      
      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        success: false,
        errors: [this.createError(
          'rollback_error',
          'critical',
          'Rollback validation failed',
          `${error}`,
          [],
          'manual_intervention',
          'System state validation failed. Manual review required.'
        )]
      };
    }
  }

  private async retryOperation(error: RefactoringError): Promise<RecoveryResult> {
    // Implement retry logic based on error type
    return {
      success: false,
      strategy: 'retry',
      message: 'Retry not implemented for this error type',
      recoveredFiles: [],
      remainingIssues: [error]
    };
  }

  private async attemptAutoFix(error: RefactoringError): Promise<RecoveryResult> {
    // Implement auto-fix logic based on error type
    return {
      success: false,
      strategy: 'auto_fix',
      message: 'Auto-fix not implemented for this error type',
      recoveredFiles: [],
      remainingIssues: [error]
    };
  }

  private async executePartialRollback(error: RefactoringError): Promise<RecoveryResult> {
    // Implement partial rollback logic
    return {
      success: false,
      strategy: 'partial_rollback',
      message: 'Partial rollback not implemented for this error type',
      recoveredFiles: [],
      remainingIssues: [error]
    };
  }

  private async skipOperation(error: RefactoringError): Promise<RecoveryResult> {
    // Skip the operation and continue
    return {
      success: true,
      strategy: 'skip',
      message: `Skipped operation due to ${error.type}`,
      recoveredFiles: [],
      remainingIssues: []
    };
  }

  private formatErrorDetails(error: RefactoringError): string {
    let details = `### ${error.message}\n\n`;
    details += `- **Type**: ${error.type}\n`;
    details += `- **Severity**: ${error.severity}\n`;
    details += `- **Files**: ${error.affectedFiles.join(', ')}\n`;
    details += `- **Recovery Strategy**: ${error.recoveryStrategy}\n`;
    details += `- **Guidance**: ${error.recoveryGuidance}\n`;
    if (error.operationId) {
      details += `- **Operation**: ${error.operationId}\n`;
    }
    details += `- **Time**: ${error.timestamp.toISOString()}\n\n`;
    details += `**Details**: ${error.details}\n\n`;
    
    return details;
  }

  private getRecoveryStrategyDescription(strategy: RecoveryStrategy): string {
    switch (strategy) {
      case 'retry':
        return 'Retry Operations';
      case 'rollback':
        return 'Rollback Changes';
      case 'skip':
        return 'Skip Operations';
      case 'manual_intervention':
        return 'Manual Intervention Required';
      case 'partial_rollback':
        return 'Partial Rollback';
      case 'auto_fix':
        return 'Automatic Fixes';
      default:
        return 'Other Actions';
    }
  }
}

/**
 * Default export for easy importing
 */
export default ErrorHandlingRollbackSystem;