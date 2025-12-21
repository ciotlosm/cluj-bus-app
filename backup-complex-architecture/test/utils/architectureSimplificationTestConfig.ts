/**
 * Property-based test configuration for Architecture Simplification
 * Validates Requirements: 8.1, 8.2
 */

import * as fc from 'fast-check';
import { propertyTestConfig } from './propertyTestConfig';

/**
 * Configuration specifically for architecture simplification property tests
 * Follows design document requirements for minimum 100 iterations
 */
export const architectureSimplificationTestConfig: fc.Parameters<unknown> = {
  ...propertyTestConfig,
  numRuns: 100, // Minimum iterations as specified in design document
  timeout: 10000, // Longer timeout for complex analysis operations
  verbose: true, // Detailed failure reporting for debugging
  seed: undefined, // Use random seed for comprehensive testing
  endOnFailure: false, // Continue testing to find all issues
};

/**
 * Fast configuration for development testing
 */
export const fastArchitectureTestConfig: fc.Parameters<unknown> = {
  ...architectureSimplificationTestConfig,
  numRuns: 20, // Fewer runs for faster feedback during development
  timeout: 5000, // Shorter timeout for quick tests
};

/**
 * Thorough configuration for comprehensive validation
 */
export const thoroughArchitectureTestConfig: fc.Parameters<unknown> = {
  ...architectureSimplificationTestConfig,
  numRuns: 500, // More runs for thorough validation
  timeout: 30000, // Longer timeout for complex scenarios
};

/**
 * Helper function to run architecture simplification property tests
 * with proper tagging for traceability to design document properties
 */
export const runArchitecturePropertyTest = <T>(
  propertyNumber: number,
  propertyDescription: string,
  property: fc.IProperty<T>,
  config: fc.Parameters<T> = architectureSimplificationTestConfig as fc.Parameters<T>
) => {
  // Add test metadata for traceability
  const testMetadata = {
    feature: 'app-architecture-simplification',
    property: propertyNumber,
    description: propertyDescription,
    timestamp: new Date().toISOString(),
  };
  
  console.log(`Running Property ${propertyNumber}: ${propertyDescription}`);
  console.log(`Feature: app-architecture-simplification, Property ${propertyNumber}: ${propertyDescription}`);
  
  try {
    return fc.assert(property, config);
  } catch (error) {
    console.error(`Property ${propertyNumber} failed:`, error);
    throw error;
  }
};

/**
 * Creates a tagged property test for architecture simplification
 * Ensures proper tagging format as specified in design document
 */
export const createArchitecturePropertyTest = <T extends readonly unknown[]>(
  propertyNumber: number,
  propertyDescription: string,
  arbitraries: fc.Arbitrary<T[number]>[],
  predicate: (...args: T) => boolean | void,
  config: fc.Parameters<T> = architectureSimplificationTestConfig as fc.Parameters<T>
) => {
  const tupleArbitrary = fc.tuple(...arbitraries);
  const property = fc.property(tupleArbitrary, (args: T) => predicate(...args));
  
  return () => runArchitecturePropertyTest(
    propertyNumber,
    propertyDescription,
    property,
    config
  );
};

/**
 * Arbitraries for generating test data for architecture simplification
 */
export const architectureArbitraries = {
  /**
   * Generates valid file paths
   */
  filePath: fc.string({ minLength: 1, maxLength: 100 })
    .filter(s => s.length > 0 && !s.includes('..') && !s.startsWith('/'))
    .map(s => s.replace(/[<>:"|?*]/g, '_')), // Remove invalid path characters
  
  /**
   * Generates file line counts
   */
  lineCount: fc.integer({ min: 1, max: 1000 }),
  
  /**
   * Generates complexity scores
   */
  complexity: fc.integer({ min: 1, max: 50 }),
  
  /**
   * Generates file size in bytes
   */
  fileSize: fc.integer({ min: 1, max: 100000 }),
  
  /**
   * Generates file types
   */
  fileType: fc.constantFrom('ts', 'tsx', 'js', 'jsx'),
  
  /**
   * Generates folder paths
   */
  folderPath: fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.length > 0 && !s.includes('..') && !s.startsWith('/'))
    .map(s => s.replace(/[<>:"|?*]/g, '_')),
  
  /**
   * Generates file counts for folders
   */
  fileCount: fc.integer({ min: 0, max: 50 }),
  
  /**
   * Generates similarity scores
   */
  similarity: fc.float({ min: 0, max: 1, noNaN: true }),
  
  /**
   * Generates code content
   */
  codeContent: fc.string({ minLength: 10, maxLength: 500 }),
  
  /**
   * Generates operation types
   */
  operationType: fc.constantFrom('split', 'merge', 'move', 'rename', 'extract', 'consolidate'),
  
  /**
   * Generates risk levels
   */
  riskLevel: fc.constantFrom('low', 'medium', 'high'),
  
  /**
   * Generates complexity ratings
   */
  complexityRating: fc.constantFrom('low', 'medium', 'high', 'very-high'),
  
  /**
   * Generates naming issue types
   */
  namingIssueType: fc.constantFrom('unclear', 'inconsistent', 'too-long', 'abbreviation'),
  
  /**
   * Generates consolidation approaches
   */
  consolidationApproach: fc.constantFrom('utility', 'merge', 'extract'),
  
  /**
   * Generates effort levels
   */
  effortLevel: fc.constantFrom('low', 'medium', 'high'),
};

/**
 * Generates a valid FileInfo object for testing
 */
export const fileInfoArbitrary = fc.record({
  path: architectureArbitraries.filePath,
  lineCount: architectureArbitraries.lineCount,
  complexity: architectureArbitraries.complexity,
  dependencies: fc.array(architectureArbitraries.filePath, { maxLength: 10 }),
  exports: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
  sizeBytes: architectureArbitraries.fileSize,
  fileType: architectureArbitraries.fileType,
  lastModified: fc.date(),
});

/**
 * Generates a valid FolderInfo object for testing
 */
export const folderInfoArbitrary = fc.record({
  path: architectureArbitraries.folderPath,
  fileCount: architectureArbitraries.fileCount,
  subfolderCount: fc.integer({ min: 0, max: 10 }),
  totalSize: fc.integer({ min: 0, max: 1000000 }),
  files: fc.array(architectureArbitraries.filePath, { maxLength: 20 }),
  subfolders: fc.array(architectureArbitraries.folderPath, { maxLength: 10 }),
});

/**
 * Generates a valid DuplicatePattern object for testing
 */
export const duplicatePatternArbitrary = fc.record({
  id: fc.uuid(),
  files: fc.array(architectureArbitraries.filePath, { minLength: 2, maxLength: 5 }),
  content: architectureArbitraries.codeContent,
  locations: fc.array(fc.record({
    file: architectureArbitraries.filePath,
    startLine: fc.integer({ min: 1, max: 100 }),
    endLine: fc.integer({ min: 1, max: 100 }),
    context: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  }), { minLength: 2, maxLength: 5 }),
  similarity: architectureArbitraries.similarity,
  consolidationSuggestion: fc.record({
    approach: architectureArbitraries.consolidationApproach,
    targetLocation: architectureArbitraries.filePath,
    suggestedName: fc.string({ minLength: 1, maxLength: 30 }),
    effort: architectureArbitraries.effortLevel,
  }),
});

/**
 * Generates a valid RefactoringOperation object for testing
 */
export const refactoringOperationArbitrary = fc.record({
  id: fc.uuid(),
  type: architectureArbitraries.operationType,
  affectedFiles: fc.array(architectureArbitraries.filePath, { minLength: 1, maxLength: 10 }),
  parameters: fc.record({
    sourceFiles: fc.option(fc.array(architectureArbitraries.filePath, { maxLength: 5 })),
    targetFiles: fc.option(fc.array(architectureArbitraries.filePath, { maxLength: 5 })),
    codeSelection: fc.option(fc.record({
      file: architectureArbitraries.filePath,
      startLine: fc.integer({ min: 1, max: 100 }),
      endLine: fc.integer({ min: 1, max: 100 }),
      startColumn: fc.option(fc.integer({ min: 1, max: 100 })),
      endColumn: fc.option(fc.integer({ min: 1, max: 100 })),
    })),
    newNames: fc.option(fc.dictionary(fc.string(), fc.string())),
    config: fc.option(fc.dictionary(fc.string(), fc.anything())),
  }),
  dependencies: fc.array(fc.uuid(), { maxLength: 5 }),
  riskLevel: architectureArbitraries.riskLevel,
  estimatedTime: fc.integer({ min: 1, max: 3600 }), // 1 second to 1 hour
});

/**
 * Test tag format as specified in design document
 */
export const formatTestTag = (propertyNumber: number, propertyDescription: string): string => {
  return `Feature: app-architecture-simplification, Property ${propertyNumber}: ${propertyDescription}`;
};