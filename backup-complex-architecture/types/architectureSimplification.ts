/**
 * Architecture Simplification Types
 * Core interfaces and data models for automated codebase refactoring
 * Validates Requirements: 8.1, 8.2
 */

// ============================================================================
// CORE ANALYSIS INTERFACES
// ============================================================================

/**
 * Main interface for analyzing codebase structure and identifying optimization opportunities
 */
export interface CodeAnalyzer {
  /**
   * Performs comprehensive codebase scanning and analysis
   * @returns Complete analysis report with all identified issues and opportunities
   */
  scanCodebase(): Promise<AnalysisReport>;
  
  /**
   * Identifies duplicate code patterns across files
   * @returns Report of all duplicate patterns found
   */
  identifyDuplicates(): Promise<DuplicationReport>;
  
  /**
   * Measures file sizes against defined limits
   * @returns Report of files exceeding size limits
   */
  measureFileSizes(): Promise<SizeReport>;
  
  /**
   * Evaluates folder structure for organization issues
   * @returns Report of folder structure problems
   */
  evaluateFolderStructure(): Promise<StructureReport>;
  
  /**
   * Assesses naming conventions and suggests improvements
   * @returns Report of naming issues and suggestions
   */
  assessNamingConventions(): Promise<NamingReport>;
}

/**
 * Main interface for performing automated code refactoring operations
 */
export interface RefactoringEngine {
  /**
   * Consolidates duplicate code patterns into reusable utilities
   * @param duplicates - Duplication report from analysis
   * @returns Refactoring plan for consolidation
   */
  consolidateDuplicates(duplicates: DuplicationReport): Promise<RefactoringPlan>;
  
  /**
   * Splits large files into smaller, focused modules
   * @param oversizedFiles - List of files exceeding size limits
   * @returns Refactoring plan for file splitting
   */
  splitLargeFiles(oversizedFiles: FileInfo[]): Promise<RefactoringPlan>;
  
  /**
   * Reorganizes folder structure for better navigation
   * @param structure - Current structure analysis
   * @returns Refactoring plan for reorganization
   */
  reorganizeFolders(structure: StructureReport): Promise<RefactoringPlan>;
  
  /**
   * Renames files and folders for better clarity
   * @param naming - Naming analysis report
   * @returns Refactoring plan for renaming
   */
  renameFiles(naming: NamingReport): Promise<RefactoringPlan>;
  
  /**
   * Executes a complete refactoring plan
   * @param plan - The refactoring plan to execute
   * @returns Results of the refactoring operation
   */
  executeRefactoring(plan: RefactoringPlan): Promise<RefactoringResult>;
}

/**
 * Main interface for validating refactoring results and ensuring functionality preservation
 */
export interface ValidationSystem {
  /**
   * Runs all existing tests to ensure they still pass
   * @returns Test execution results
   */
  runTests(): Promise<TestResult>;
  
  /**
   * Validates that the build process completes successfully
   * @returns Build validation results
   */
  validateBuild(): Promise<BuildResult>;
  
  /**
   * Checks that application functionality remains intact
   * @returns Functionality validation results
   */
  checkFunctionality(): Promise<FunctionalityResult>;
  
  /**
   * Generates comprehensive validation report
   * @returns Complete validation report
   */
  generateReport(): Promise<ValidationReport>;
}

// ============================================================================
// DATA MODELS
// ============================================================================

/**
 * Comprehensive analysis report containing all identified issues and opportunities
 */
export interface AnalysisReport {
  /** Total number of files analyzed */
  totalFiles: number;
  
  /** Files exceeding the size limit */
  oversizedFiles: FileInfo[];
  
  /** Folders containing too many files */
  overcrowdedFolders: FolderInfo[];
  
  /** Identified duplicate code patterns */
  duplicatePatterns: DuplicatePattern[];
  
  /** Files with naming convention issues */
  namingIssues: NamingIssue[];
  
  /** Code complexity metrics */
  complexityMetrics: ComplexityMetric[];
  
  /** Timestamp of analysis */
  timestamp: Date;
  
  /** Analysis configuration used */
  config: AnalysisConfig;
}

/**
 * Complete refactoring plan with operations and dependencies
 */
export interface RefactoringPlan {
  /** List of refactoring operations to perform */
  operations: RefactoringOperation[];
  
  /** Dependency relationships between operations */
  dependencies: DependencyMap;
  
  /** Optimal execution order for operations */
  executionOrder: string[];
  
  /** Rollback plan for failed operations */
  rollbackPlan: RollbackOperation[];
  
  /** Estimated impact and risk assessment */
  impact: ImpactAssessment;
  
  /** Plan creation timestamp */
  timestamp: Date;
}

/**
 * Information about a single file in the codebase
 */
export interface FileInfo {
  /** Relative path from project root */
  path: string;
  
  /** Number of lines in the file */
  lineCount: number;
  
  /** Complexity score (cyclomatic complexity) */
  complexity: number;
  
  /** Files this file imports from */
  dependencies: string[];
  
  /** Symbols this file exports */
  exports: string[];
  
  /** File size in bytes */
  sizeBytes: number;
  
  /** File type (ts, tsx, js, jsx) */
  fileType: string;
  
  /** Last modification timestamp */
  lastModified: Date;
}

/**
 * Information about a folder in the codebase
 */
export interface FolderInfo {
  /** Relative path from project root */
  path: string;
  
  /** Number of files directly in this folder */
  fileCount: number;
  
  /** Number of subfolders */
  subfolderCount: number;
  
  /** Total size of all files in folder */
  totalSize: number;
  
  /** Files contained in this folder */
  files: string[];
  
  /** Subfolders contained in this folder */
  subfolders: string[];
}

// ============================================================================
// ANALYSIS REPORT TYPES
// ============================================================================

/**
 * Report of duplicate code patterns found in the codebase
 */
export interface DuplicationReport {
  /** List of duplicate patterns */
  patterns: DuplicatePattern[];
  
  /** Total number of duplicates found */
  totalDuplicates: number;
  
  /** Estimated lines of code that could be saved */
  potentialSavings: number;
  
  /** Analysis timestamp */
  timestamp: Date;
}

/**
 * Report of file size analysis
 */
export interface SizeReport {
  /** Files exceeding size limits */
  oversizedFiles: FileInfo[];
  
  /** Average file size */
  averageFileSize: number;
  
  /** Largest file found */
  largestFile: FileInfo;
  
  /** Size distribution statistics */
  sizeDistribution: SizeDistribution;
}

/**
 * Report of folder structure analysis
 */
export interface StructureReport {
  /** Folders exceeding file count limits */
  overcrowdedFolders: FolderInfo[];
  
  /** Suggested folder reorganization */
  reorganizationSuggestions: ReorganizationSuggestion[];
  
  /** Folder depth analysis */
  depthAnalysis: DepthAnalysis;
}

/**
 * Report of naming convention analysis
 */
export interface NamingReport {
  /** Files with naming issues */
  namingIssues: NamingIssue[];
  
  /** Suggested naming improvements */
  namingSuggestions: NamingSuggestion[];
  
  /** Naming pattern analysis */
  patternAnalysis: NamingPatternAnalysis;
}

// ============================================================================
// DETAILED ANALYSIS TYPES
// ============================================================================

/**
 * A duplicate code pattern found in the codebase
 */
export interface DuplicatePattern {
  /** Unique identifier for this pattern */
  id: string;
  
  /** Files containing this pattern */
  files: string[];
  
  /** The duplicated code content */
  content: string;
  
  /** Line numbers where pattern appears in each file */
  locations: PatternLocation[];
  
  /** Similarity score (0-1) */
  similarity: number;
  
  /** Suggested consolidation approach */
  consolidationSuggestion: ConsolidationSuggestion;
}

/**
 * Location of a duplicate pattern within a file
 */
export interface PatternLocation {
  /** File path */
  file: string;
  
  /** Starting line number */
  startLine: number;
  
  /** Ending line number */
  endLine: number;
  
  /** Function or class context */
  context?: string;
}

/**
 * Suggestion for consolidating duplicate code
 */
export interface ConsolidationSuggestion {
  /** Suggested approach (utility, merge, extract) */
  approach: 'utility' | 'merge' | 'extract';
  
  /** Suggested location for consolidated code */
  targetLocation: string;
  
  /** Suggested name for consolidated function/class */
  suggestedName: string;
  
  /** Estimated effort (low, medium, high) */
  effort: 'low' | 'medium' | 'high';
}

/**
 * A naming convention issue
 */
export interface NamingIssue {
  /** File with naming issue */
  file: string;
  
  /** Type of naming issue */
  issueType: 'unclear' | 'inconsistent' | 'too-long' | 'abbreviation';
  
  /** Current name */
  currentName: string;
  
  /** Suggested improvement */
  suggestedName: string;
  
  /** Reason for the suggestion */
  reason: string;
}

/**
 * Code complexity metric
 */
export interface ComplexityMetric {
  /** File being measured */
  file: string;
  
  /** Cyclomatic complexity score */
  cyclomaticComplexity: number;
  
  /** Number of functions/methods */
  functionCount: number;
  
  /** Number of classes */
  classCount: number;
  
  /** Nesting depth */
  nestingDepth: number;
  
  /** Overall complexity rating */
  complexityRating: 'low' | 'medium' | 'high' | 'very-high';
}

// ============================================================================
// REFACTORING OPERATION TYPES
// ============================================================================

/**
 * A single refactoring operation
 */
export interface RefactoringOperation {
  /** Unique identifier for this operation */
  id: string;
  
  /** Type of refactoring operation */
  type: 'split' | 'merge' | 'move' | 'rename' | 'extract' | 'consolidate';
  
  /** Files affected by this operation */
  affectedFiles: string[];
  
  /** Detailed operation parameters */
  parameters: OperationParameters;
  
  /** Dependencies on other operations */
  dependencies: string[];
  
  /** Estimated risk level */
  riskLevel: 'low' | 'medium' | 'high';
  
  /** Estimated execution time */
  estimatedTime: number;
}

/**
 * Parameters for a refactoring operation
 */
export interface OperationParameters {
  /** Source files */
  sourceFiles?: string[];
  
  /** Target files */
  targetFiles?: string[];
  
  /** Code to extract/move */
  codeSelection?: CodeSelection;
  
  /** New names for renamed items */
  newNames?: Record<string, string>;
  
  /** Additional configuration */
  config?: Record<string, any>;
}

/**
 * Selection of code within a file
 */
export interface CodeSelection {
  /** File containing the code */
  file: string;
  
  /** Starting line number */
  startLine: number;
  
  /** Ending line number */
  endLine: number;
  
  /** Starting column (optional) */
  startColumn?: number;
  
  /** Ending column (optional) */
  endColumn?: number;
}

/**
 * Dependency mapping between operations
 */
export interface DependencyMap {
  /** Map of operation ID to its dependencies */
  [operationId: string]: string[];
}

/**
 * A rollback operation for undoing changes
 */
export interface RollbackOperation {
  /** Operation being rolled back */
  operationId: string;
  
  /** Type of rollback */
  type: 'restore' | 'undo' | 'revert';
  
  /** Files to restore */
  filesToRestore: string[];
  
  /** Backup data for restoration */
  backupData: BackupData;
}

/**
 * Backup data for rollback operations
 */
export interface BackupData {
  /** Original file contents */
  originalContents: Record<string, string>;
  
  /** Original file paths */
  originalPaths: Record<string, string>;
  
  /** Backup timestamp */
  timestamp: Date;
}

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

/**
 * Result of test execution
 */
export interface TestResult {
  /** Whether all tests passed */
  success: boolean;
  
  /** Number of tests run */
  testsRun: number;
  
  /** Number of tests passed */
  testsPassed: number;
  
  /** Number of tests failed */
  testsFailed: number;
  
  /** Failed test details */
  failures: TestFailure[];
  
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Details of a failed test
 */
export interface TestFailure {
  /** Test name */
  testName: string;
  
  /** Error message */
  error: string;
  
  /** Stack trace */
  stackTrace?: string;
  
  /** File containing the test */
  testFile: string;
}

/**
 * Result of build validation
 */
export interface BuildResult {
  /** Whether build succeeded */
  success: boolean;
  
  /** Build errors */
  errors: BuildError[];
  
  /** Build warnings */
  warnings: BuildWarning[];
  
  /** Build time in milliseconds */
  buildTime: number;
}

/**
 * A build error
 */
export interface BuildError {
  /** File with error */
  file: string;
  
  /** Line number */
  line: number;
  
  /** Column number */
  column: number;
  
  /** Error message */
  message: string;
  
  /** Error code */
  code?: string;
}

/**
 * A build warning
 */
export interface BuildWarning {
  /** File with warning */
  file: string;
  
  /** Line number */
  line: number;
  
  /** Column number */
  column: number;
  
  /** Warning message */
  message: string;
  
  /** Warning code */
  code?: string;
}

/**
 * Result of functionality validation
 */
export interface FunctionalityResult {
  /** Whether functionality is preserved */
  functionalityPreserved: boolean;
  
  /** Detected functionality changes */
  changes: FunctionalityChange[];
  
  /** Performance impact */
  performanceImpact: PerformanceImpact;
  
  /** Validation timestamp */
  timestamp: Date;
}

/**
 * A detected functionality change
 */
export interface FunctionalityChange {
  /** Type of change */
  type: 'behavior' | 'performance' | 'interface' | 'data';
  
  /** Affected component */
  component: string;
  
  /** Description of change */
  description: string;
  
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Performance impact assessment
 */
export interface PerformanceImpact {
  /** Bundle size change (bytes) */
  bundleSizeChange: number;
  
  /** Runtime performance change (percentage) */
  runtimeChange: number;
  
  /** Memory usage change (bytes) */
  memoryChange: number;
  
  /** Overall impact rating */
  overallImpact: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for analysis operations
 */
export interface AnalysisConfig {
  /** Maximum file size in lines */
  maxFileSize: number;
  
  /** Maximum files per folder */
  maxFilesPerFolder: number;
  
  /** Minimum similarity for duplicate detection */
  duplicateSimilarityThreshold: number;
  
  /** File patterns to include */
  includePatterns: string[];
  
  /** File patterns to exclude */
  excludePatterns: string[];
  
  /** Whether to analyze test files */
  includeTests: boolean;
  
  /** Whether to analyze node_modules */
  includeNodeModules: boolean;
}

/**
 * Impact assessment for refactoring operations
 */
export interface ImpactAssessment {
  /** Number of files affected */
  filesAffected: number;
  
  /** Estimated lines of code changed */
  linesChanged: number;
  
  /** Risk level of the refactoring */
  riskLevel: 'low' | 'medium' | 'high';
  
  /** Estimated time to complete */
  estimatedTime: number;
  
  /** Potential benefits */
  benefits: string[];
  
  /** Potential risks */
  risks: string[];
}

/**
 * Complete refactoring result
 */
export interface RefactoringResult {
  /** Whether refactoring succeeded */
  success: boolean;
  
  /** Operations that were completed */
  completedOperations: string[];
  
  /** Operations that failed */
  failedOperations: RefactoringFailure[];
  
  /** Files that were modified */
  modifiedFiles: string[];
  
  /** Files that were created */
  createdFiles: string[];
  
  /** Files that were deleted */
  deletedFiles: string[];
  
  /** Total execution time */
  executionTime: number;
  
  /** Validation results */
  validation: ValidationReport;
}

/**
 * Details of a failed refactoring operation
 */
export interface RefactoringFailure {
  /** Operation that failed */
  operationId: string;
  
  /** Error message */
  error: string;
  
  /** Stack trace */
  stackTrace?: string;
  
  /** Files affected by the failure */
  affectedFiles: string[];
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  /** Test results */
  testResults: TestResult;
  
  /** Build results */
  buildResults: BuildResult;
  
  /** Functionality results */
  functionalityResults: FunctionalityResult;
  
  /** Overall validation success */
  overallSuccess: boolean;
  
  /** Summary of issues found */
  issuesSummary: string[];
  
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Size distribution statistics
 */
export interface SizeDistribution {
  /** Files under 50 lines */
  small: number;
  
  /** Files 50-200 lines */
  medium: number;
  
  /** Files 200-500 lines */
  large: number;
  
  /** Files over 500 lines */
  extraLarge: number;
}

/**
 * Folder reorganization suggestion
 */
export interface ReorganizationSuggestion {
  /** Current folder path */
  currentPath: string;
  
  /** Suggested new structure */
  suggestedStructure: FolderStructure;
  
  /** Reason for suggestion */
  reason: string;
  
  /** Estimated effort */
  effort: 'low' | 'medium' | 'high';
}

/**
 * Suggested folder structure
 */
export interface FolderStructure {
  /** Folder name */
  name: string;
  
  /** Files in this folder */
  files: string[];
  
  /** Subfolders */
  subfolders: FolderStructure[];
}

/**
 * Folder depth analysis
 */
export interface DepthAnalysis {
  /** Maximum depth found */
  maxDepth: number;
  
  /** Average depth */
  averageDepth: number;
  
  /** Folders with excessive depth */
  deepFolders: string[];
}

/**
 * Naming suggestion
 */
export interface NamingSuggestion {
  /** Current name */
  currentName: string;
  
  /** Suggested name */
  suggestedName: string;
  
  /** File path */
  filePath: string;
  
  /** Reason for suggestion */
  reason: string;
}

/**
 * Naming pattern analysis
 */
export interface NamingPatternAnalysis {
  /** Common naming patterns found */
  patterns: string[];
  
  /** Inconsistencies detected */
  inconsistencies: string[];
  
  /** Suggested conventions */
  suggestedConventions: string[];
}

// ============================================================================
// MODERN ARCHITECTURE PATTERN TYPES
// ============================================================================

/**
 * Analysis of composition vs inheritance patterns
 */
export interface CompositionAnalysis {
  /** Inheritance patterns found in the codebase */
  inheritancePatterns: Array<{
    file: string;
    className: string;
    baseClass: string;
    lineNumber: number;
    complexity: 'low' | 'medium' | 'high';
  }>;
  
  /** Composition patterns found in the codebase */
  compositionPatterns: Array<{
    file: string;
    componentName: string;
    composedTypes: string[];
    lineNumber: number;
  }>;
  
  /** Ratio of composition to total patterns (0-1) */
  compositionRatio: number;
  
  /** Recommendations for improving composition usage */
  recommendations: string[];
}

/**
 * Analysis of React component patterns
 */
export interface ReactPatternAnalysis {
  /** Class components found in the codebase */
  classComponents: Array<{
    file: string;
    componentName: string;
    lineNumber: number;
    hasState: boolean;
    hasLifecycleMethods: boolean;
  }>;
  
  /** Hook-based components found in the codebase */
  hookComponents: Array<{
    file: string;
    componentName: string;
    lineNumber: number;
    hooksUsed: string[];
  }>;
  
  /** Modern React patterns found */
  modernPatterns: Array<{
    file: string;
    patternType: 'composition' | 'custom-hook' | 'context' | 'reducer';
    description: string;
    lineNumber: number;
  }>;
  
  /** Modernization score (0-1, higher is more modern) */
  modernizationScore: number;
  
  /** Recommendations for React modernization */
  recommendations: string[];
}

/**
 * Analysis of module dependencies
 */
export interface DependencyAnalysis {
  /** Dependency graph representation */
  dependencyGraph: Record<string, string[]>;
  
  /** Circular dependencies found */
  circularDependencies: Array<{
    cycle: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
  
  /** Files with excessive dependencies */
  excessiveDependencies: Array<{
    file: string;
    dependencyCount: number;
    dependencies: string[];
  }>;
  
  /** Average number of dependencies per file */
  averageDependencies: number;
  
  /** Overall coupling score (0-1, lower is better) */
  couplingScore: number;
  
  /** Recommendations for dependency reduction */
  recommendations: string[];
}

/**
 * Overall architecture pattern analysis
 */
export interface ArchitecturePatternAnalysis {
  /** Composition vs inheritance analysis */
  compositionAnalysis: CompositionAnalysis;
  
  /** React pattern analysis */
  reactAnalysis: ReactPatternAnalysis;
  
  /** Dependency analysis */
  dependencyAnalysis: DependencyAnalysis;
  
  /** Overall modernization score */
  overallScore: number;
  
  /** Priority recommendations */
  priorityRecommendations: string[];
}

/**
 * Suggestion for modernizing code patterns
 */
export interface ModernizationSuggestion {
  /** Type of modernization */
  type: 'composition-refactor' | 'react-hooks-migration' | 'dependency-reduction' | 'pattern-modernization';
  
  /** File to be modernized */
  file: string;
  
  /** Description of the modernization */
  description: string;
  
  /** Current pattern being replaced */
  currentPattern: string;
  
  /** Suggested modern pattern */
  suggestedPattern: string;
  
  /** Estimated effort required */
  effort: 'low' | 'medium' | 'high';
  
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
  
  /** Benefits of the modernization */
  benefits: string[];
}

/**
 * Pattern transformation operation
 */
export interface PatternTransformation {
  /** Unique identifier */
  id: string;
  
  /** Type of transformation */
  type: 'inheritance-to-composition' | 'class-to-hooks' | 'dependency-injection' | 'extract-utility';
  
  /** File being transformed */
  file: string;
  
  /** Description of transformation */
  description: string;
  
  /** Source code selection */
  sourceSelection: CodeSelection;
  
  /** Target location for transformed code */
  targetLocation?: string;
  
  /** Transformation parameters */
  parameters: Record<string, any>;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default analysis configuration
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  maxFileSize: 200,
  maxFilesPerFolder: 10,
  duplicateSimilarityThreshold: 0.8,
  includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
  includeTests: false,
  includeNodeModules: false,
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for AnalysisReport
 */
export function isAnalysisReport(obj: any): obj is AnalysisReport {
  return obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.totalFiles === 'number' &&
    Array.isArray(obj.oversizedFiles) &&
    Array.isArray(obj.overcrowdedFolders) &&
    Array.isArray(obj.duplicatePatterns) &&
    obj.timestamp instanceof Date;
}

/**
 * Type guard for RefactoringPlan
 */
export function isRefactoringPlan(obj: any): obj is RefactoringPlan {
  return obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    Array.isArray(obj.operations) &&
    typeof obj.dependencies === 'object' &&
    Array.isArray(obj.executionOrder) &&
    Array.isArray(obj.rollbackPlan);
}

/**
 * Type guard for FileInfo
 */
export function isFileInfo(obj: any): obj is FileInfo {
  return obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.path === 'string' &&
    typeof obj.lineCount === 'number' &&
    typeof obj.complexity === 'number' &&
    Array.isArray(obj.dependencies) &&
    Array.isArray(obj.exports);
}