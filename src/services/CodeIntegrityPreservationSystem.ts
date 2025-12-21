/**
 * Code Integrity Preservation System
 * Implements ValidationSystem interface for ensuring refactoring operations maintain code integrity
 * Validates Requirements: 2.5, 3.5, 4.5, 8.1, 8.2
 */

import { promises as fs } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { execSync } from 'child_process';
import {
  type ValidationSystem,
  type TestResult,
  type BuildResult,
  type FunctionalityResult,
  type ValidationReport,
  type TestFailure,
  type BuildError,
  type BuildWarning,
  type FunctionalityChange,
  type PerformanceImpact,
  type RefactoringPlan,
  type BackupData,
  type RollbackOperation
} from '../types/architectureSimplification';

/**
 * Import path analysis and update system
 */
interface ImportPathAnalysis {
  file: string;
  imports: ImportStatement[];
  exports: ExportStatement[];
}

interface ImportStatement {
  source: string;
  specifiers: string[];
  line: number;
  raw: string;
}

interface ExportStatement {
  specifiers: string[];
  line: number;
  raw: string;
}

/**
 * Main implementation of the ValidationSystem interface
 * Provides comprehensive code integrity preservation during refactoring operations
 */
export class CodeIntegrityPreservationSystem implements ValidationSystem {
  private readonly projectRoot: string;
  private readonly backupStorage = new Map<string, BackupData>();
  private readonly importCache = new Map<string, ImportPathAnalysis>();

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Runs all existing tests to ensure they still pass
   * Validates Requirements: 8.1
   */
  async runTests(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Run tests using npm test command
      const output = execSync('npm test', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 60000 // 1 minute timeout
      });

      const executionTime = Date.now() - startTime;
      
      // Parse test output to extract results
      const testResults = this.parseTestOutput(output);
      
      return {
        success: testResults.testsFailed === 0,
        testsRun: testResults.testsRun,
        testsPassed: testResults.testsPassed,
        testsFailed: testResults.testsFailed,
        failures: testResults.failures,
        executionTime
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Parse error output for test failures
      const errorOutput = error.stdout || error.stderr || error.message;
      const testResults = this.parseTestOutput(errorOutput);
      
      return {
        success: false,
        testsRun: testResults.testsRun,
        testsPassed: testResults.testsPassed,
        testsFailed: testResults.testsFailed || 1,
        failures: testResults.failures.length > 0 ? testResults.failures : [{
          testName: 'Test execution',
          error: error.message,
          stackTrace: error.stack,
          testFile: 'unknown'
        }],
        executionTime
      };
    }
  }

  /**
   * Validates that the build process completes successfully
   * Validates Requirements: 8.2
   */
  async validateBuild(): Promise<BuildResult> {
    const startTime = Date.now();
    
    try {
      // Run TypeScript compilation check
      const output = execSync('npx tsc --noEmit', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 30000 // 30 second timeout
      });

      const buildTime = Date.now() - startTime;
      
      return {
        success: true,
        errors: [],
        warnings: this.parseBuildWarnings(output),
        buildTime
      };
    } catch (error: any) {
      const buildTime = Date.now() - startTime;
      const errorOutput = error.stdout || error.stderr || error.message;
      
      const { errors, warnings } = this.parseBuildErrors(errorOutput);
      
      return {
        success: false,
        errors,
        warnings,
        buildTime
      };
    }
  }

  /**
   * Checks that application functionality remains intact
   * Validates Requirements: 8.3, 8.4
   */
  async checkFunctionality(): Promise<FunctionalityResult> {
    const changes: FunctionalityChange[] = [];
    
    // Check for import/export integrity
    const importIntegrityChanges = await this.checkImportIntegrity();
    changes.push(...importIntegrityChanges);
    
    // Check for performance impact (basic bundle size check)
    const performanceImpact = await this.assessPerformanceImpact();
    
    return {
      functionalityPreserved: changes.filter(c => c.severity === 'high' || c.severity === 'critical').length === 0,
      changes,
      performanceImpact,
      timestamp: new Date()
    };
  }

  /**
   * Generates comprehensive validation report
   * Validates Requirements: 8.1, 8.2
   */
  async generateReport(): Promise<ValidationReport> {
    const testResults = await this.runTests();
    const buildResults = await this.validateBuild();
    const functionalityResults = await this.checkFunctionality();
    
    const overallSuccess = testResults.success && 
                          buildResults.success && 
                          functionalityResults.functionalityPreserved;
    
    const issuesSummary: string[] = [];
    const recommendations: string[] = [];
    
    if (!testResults.success) {
      issuesSummary.push(`${testResults.testsFailed} tests failed`);
      recommendations.push('Fix failing tests before proceeding with refactoring');
    }
    
    if (!buildResults.success) {
      issuesSummary.push(`${buildResults.errors.length} build errors found`);
      recommendations.push('Resolve TypeScript compilation errors');
    }
    
    if (!functionalityResults.functionalityPreserved) {
      const criticalChanges = functionalityResults.changes.filter(c => 
        c.severity === 'high' || c.severity === 'critical'
      ).length;
      issuesSummary.push(`${criticalChanges} critical functionality changes detected`);
      recommendations.push('Review and address functionality changes');
    }
    
    return {
      testResults,
      buildResults,
      functionalityResults,
      overallSuccess,
      issuesSummary,
      recommendations
    };
  }

  /**
   * Analyzes import paths in a file and identifies dependencies
   * Validates Requirements: 2.5, 3.5, 4.5
   */
  async analyzeImportPaths(filePath: string): Promise<ImportPathAnalysis> {
    const cacheKey = filePath;
    if (this.importCache.has(cacheKey)) {
      return this.importCache.get(cacheKey)!;
    }

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      const imports: ImportStatement[] = [];
      const exports: ExportStatement[] = [];
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Match import statements
        const importMatch = trimmedLine.match(/^import\s+(.+?)\s+from\s+['"](.+?)['"];?$/);
        if (importMatch) {
          const [, specifiers, source] = importMatch;
          imports.push({
            source,
            specifiers: this.parseImportSpecifiers(specifiers),
            line: index + 1,
            raw: line
          });
        }
        
        // Match export statements
        const exportMatch = trimmedLine.match(/^export\s+(.+?)(?:\s+from\s+['"](.+?)['"])?;?$/);
        if (exportMatch) {
          const [, specifiers] = exportMatch;
          exports.push({
            specifiers: this.parseExportSpecifiers(specifiers),
            line: index + 1,
            raw: line
          });
        }
      });
      
      const analysis: ImportPathAnalysis = {
        file: filePath,
        imports,
        exports
      };
      
      this.importCache.set(cacheKey, analysis);
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze import paths in ${filePath}: ${error}`);
    }
  }

  /**
   * Updates import paths when files are moved or renamed
   * Validates Requirements: 3.5, 4.5
   */
  async updateImportPaths(fileMovements: Record<string, string>): Promise<void> {
    const allFiles = await this.getAllTypeScriptFiles();
    
    for (const file of allFiles) {
      try {
        const analysis = await this.analyzeImportPaths(file);
        let content = await fs.readFile(file, 'utf8');
        let hasChanges = false;
        
        for (const importStmt of analysis.imports) {
          const resolvedPath = this.resolveImportPath(file, importStmt.source);
          
          // Check if this import points to a moved file
          for (const [oldPath, newPath] of Object.entries(fileMovements)) {
            if (resolvedPath === oldPath) {
              const newImportPath = this.calculateRelativeImportPath(file, newPath);
              content = content.replace(importStmt.raw, 
                importStmt.raw.replace(importStmt.source, newImportPath));
              hasChanges = true;
            }
          }
        }
        
        if (hasChanges) {
          await fs.writeFile(file, content, 'utf8');
          // Clear cache for updated file
          this.importCache.delete(file);
        }
      } catch (error) {
        console.warn(`Failed to update imports in ${file}:`, error);
      }
    }
  }

  /**
   * Creates backup data for rollback operations
   * Validates Requirements: 8.5
   */
  async createBackup(files: string[]): Promise<BackupData> {
    const originalContents: Record<string, string> = {};
    const originalPaths: Record<string, string> = {};
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        originalContents[file] = content;
        originalPaths[file] = file; // Store original path
      } catch (error) {
        // File might not exist yet (for new files)
        originalContents[file] = '';
        originalPaths[file] = file;
      }
    }
    
    const backup: BackupData = {
      originalContents,
      originalPaths,
      timestamp: new Date()
    };
    
    // Store backup for potential rollback
    const backupKey = backup.timestamp.toISOString();
    this.backupStorage.set(backupKey, backup);
    
    return backup;
  }

  /**
   * Executes rollback operations to restore previous state
   * Validates Requirements: 8.5
   */
  async executeRollback(rollbackOperations: RollbackOperation[]): Promise<void> {
    for (const rollback of rollbackOperations) {
      try {
        const { backupData } = rollback;
        
        // Restore original file contents
        for (const [filePath, originalContent] of Object.entries(backupData.originalContents)) {
          if (originalContent === '') {
            // File was newly created, delete it
            try {
              await fs.unlink(filePath);
            } catch (error) {
              // File might not exist, ignore
            }
          } else {
            // Restore original content
            await fs.writeFile(filePath, originalContent, 'utf8');
          }
        }
        
        // Restore original file paths (handle renames/moves)
        for (const [currentPath, originalPath] of Object.entries(backupData.originalPaths)) {
          if (currentPath !== originalPath) {
            try {
              await fs.rename(currentPath, originalPath);
            } catch (error) {
              console.warn(`Failed to restore path ${currentPath} -> ${originalPath}:`, error);
            }
          }
        }
      } catch (error) {
        throw new Error(`Rollback failed for operation ${rollback.operationId}: ${error}`);
      }
    }
    
    // Clear import cache after rollback
    this.importCache.clear();
  }

  /**
   * Validates a refactoring plan before execution
   * Validates Requirements: 8.1, 8.2
   */
  async validateRefactoringPlan(plan: RefactoringPlan): Promise<ValidationReport> {
    // Create backup before validation
    const allAffectedFiles = new Set<string>();
    plan.operations.forEach(op => {
      op.affectedFiles.forEach(file => allAffectedFiles.add(file));
    });
    
    await this.createBackup(Array.from(allAffectedFiles));
    
    // Run initial validation
    return await this.generateReport();
  }

  // Private helper methods

  private parseTestOutput(output: string): {
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    failures: TestFailure[];
  } {
    const failures: TestFailure[] = [];
    let testsRun = 0;
    let testsPassed = 0;
    let testsFailed = 0;

    // Parse Vitest output format
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match test summary line (e.g., "Test Files  2 passed, 1 failed (3)")
      const summaryMatch = line.match(/Test Files\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?\s+\((\d+)\)/);
      if (summaryMatch) {
        const [, passed, failed, total] = summaryMatch;
        testsPassed = parseInt(passed, 10);
        testsFailed = failed ? parseInt(failed, 10) : 0;
        testsRun = parseInt(total, 10);
      }
      
      // Match individual test failures
      const failureMatch = line.match(/FAIL\s+(.+?)\s+>\s+(.+)/);
      if (failureMatch) {
        const [, testFile, testName] = failureMatch;
        failures.push({
          testName,
          error: 'Test failed',
          testFile: testFile.trim()
        });
      }
    }

    return { testsRun, testsPassed, testsFailed, failures };
  }

  private parseBuildErrors(output: string): { errors: BuildError[]; warnings: BuildWarning[] } {
    const errors: BuildError[] = [];
    const warnings: BuildWarning[] = [];
    
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match TypeScript error format: "file.ts(line,col): error TS#### message"
      const errorMatch = line.match(/(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/);
      if (errorMatch) {
        const [, file, lineStr, colStr, code, message] = errorMatch;
        errors.push({
          file: file.trim(),
          line: parseInt(lineStr, 10),
          column: parseInt(colStr, 10),
          message: message.trim(),
          code
        });
      }
      
      // Match TypeScript warning format
      const warningMatch = line.match(/(.+?)\((\d+),(\d+)\):\s+warning\s+(TS\d+):\s+(.+)/);
      if (warningMatch) {
        const [, file, lineStr, colStr, code, message] = warningMatch;
        warnings.push({
          file: file.trim(),
          line: parseInt(lineStr, 10),
          column: parseInt(colStr, 10),
          message: message.trim(),
          code
        });
      }
    }
    
    return { errors, warnings };
  }

  private parseBuildWarnings(output: string): BuildWarning[] {
    const { warnings } = this.parseBuildErrors(output);
    return warnings;
  }

  private async checkImportIntegrity(): Promise<FunctionalityChange[]> {
    const changes: FunctionalityChange[] = [];
    const allFiles = await this.getAllTypeScriptFiles();
    
    for (const file of allFiles) {
      try {
        const analysis = await this.analyzeImportPaths(file);
        
        for (const importStmt of analysis.imports) {
          const resolvedPath = this.resolveImportPath(file, importStmt.source);
          
          // Check if imported file exists
          try {
            await fs.access(resolvedPath);
          } catch (error) {
            changes.push({
              type: 'interface',
              component: file,
              description: `Import not found: ${importStmt.source}`,
              severity: 'high'
            });
          }
        }
      } catch (error) {
        changes.push({
          type: 'interface',
          component: file,
          description: `Failed to analyze imports: ${error}`,
          severity: 'medium'
        });
      }
    }
    
    return changes;
  }

  private async assessPerformanceImpact(): Promise<PerformanceImpact> {
    // Basic performance impact assessment
    // In a real implementation, this would compare bundle sizes, etc.
    return {
      bundleSizeChange: 0,
      runtimeChange: 0,
      memoryChange: 0,
      overallImpact: 'neutral'
    };
  }

  private async getAllTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip node_modules and other excluded directories
            if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            // Include TypeScript and JavaScript files
            if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && 
                !entry.name.includes('.test.') && 
                !entry.name.includes('.spec.')) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Directory might not exist or be accessible
      }
    };
    
    await scanDirectory(this.projectRoot);
    return files;
  }

  private parseImportSpecifiers(specifiers: string): string[] {
    // Simple parsing of import specifiers
    // This could be enhanced with a proper AST parser
    return specifiers.split(',').map(s => s.trim().replace(/[{}]/g, ''));
  }

  private parseExportSpecifiers(specifiers: string): string[] {
    // Simple parsing of export specifiers
    return specifiers.split(',').map(s => s.trim().replace(/[{}]/g, ''));
  }

  private resolveImportPath(fromFile: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      // Relative import
      const fromDir = dirname(fromFile);
      return resolve(fromDir, importPath);
    } else if (importPath.startsWith('@/')) {
      // Absolute import with @ alias (assuming @ points to src)
      return resolve(this.projectRoot, 'src', importPath.substring(2));
    } else {
      // Node module import - return as is
      return importPath;
    }
  }

  private calculateRelativeImportPath(fromFile: string, toFile: string): string {
    const fromDir = dirname(fromFile);
    let relativePath = relative(fromDir, toFile);
    
    // Remove file extension for imports
    relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Ensure relative paths start with ./
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath;
  }
}

/**
 * Default export for easy importing
 */
export default CodeIntegrityPreservationSystem;