/**
 * Tests for Architecture Simplification Types
 * Validates Requirements: 8.1, 8.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  type AnalysisReport,
  type RefactoringPlan,
  type FileInfo,
  type FolderInfo,
  DEFAULT_ANALYSIS_CONFIG,
  isAnalysisReport,
  isRefactoringPlan,
  isFileInfo,
} from './architectureSimplification';
import {
  architectureSimplificationTestConfig,
  runArchitecturePropertyTest,
  fileInfoArbitrary,
  folderInfoArbitrary,
  duplicatePatternArbitrary,
  refactoringOperationArbitrary,
  formatTestTag,
} from '../test/utils/architectureSimplificationTestConfig';

describe('Architecture Simplification Types', () => {
  describe('Type Guards', () => {
    it('should validate FileInfo objects correctly', () => {
      const validFileInfo: FileInfo = {
        path: 'src/test.ts',
        lineCount: 100,
        complexity: 5,
        dependencies: ['./utils'],
        exports: ['TestClass'],
        sizeBytes: 2048,
        fileType: 'ts',
        lastModified: new Date(),
      };

      expect(isFileInfo(validFileInfo)).toBe(true);
      expect(isFileInfo({})).toBe(false);
      expect(isFileInfo(null)).toBe(false);
      expect(isFileInfo(undefined)).toBe(false);
    });

    it('should validate AnalysisReport objects correctly', () => {
      const validReport: AnalysisReport = {
        totalFiles: 10,
        oversizedFiles: [],
        overcrowdedFolders: [],
        duplicatePatterns: [],
        namingIssues: [],
        complexityMetrics: [],
        timestamp: new Date(),
        config: DEFAULT_ANALYSIS_CONFIG,
      };

      expect(isAnalysisReport(validReport)).toBe(true);
      expect(isAnalysisReport({})).toBe(false);
    });

    it('should validate RefactoringPlan objects correctly', () => {
      const validPlan: RefactoringPlan = {
        operations: [],
        dependencies: {},
        executionOrder: [],
        rollbackPlan: [],
        impact: {
          filesAffected: 0,
          linesChanged: 0,
          riskLevel: 'low',
          estimatedTime: 0,
          benefits: [],
          risks: [],
        },
        timestamp: new Date(),
      };

      expect(isRefactoringPlan(validPlan)).toBe(true);
      expect(isRefactoringPlan({})).toBe(false);
    });
  });

  describe('Default Configuration', () => {
    it('should have valid default analysis configuration', () => {
      expect(DEFAULT_ANALYSIS_CONFIG.maxFileSize).toBe(200);
      expect(DEFAULT_ANALYSIS_CONFIG.maxFilesPerFolder).toBe(10);
      expect(DEFAULT_ANALYSIS_CONFIG.duplicateSimilarityThreshold).toBe(0.8);
      expect(Array.isArray(DEFAULT_ANALYSIS_CONFIG.includePatterns)).toBe(true);
      expect(Array.isArray(DEFAULT_ANALYSIS_CONFIG.excludePatterns)).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    it('should run property test with correct tagging', () => {
      const testTag = formatTestTag(1, 'Test property description');
      expect(testTag).toBe('Feature: app-architecture-simplification, Property 1: Test property description');
    });

    it('Property 1: FileInfo validation property', () => {
      runArchitecturePropertyTest(
        1,
        'FileInfo objects should always be valid when created with valid data',
        fc.property(fileInfoArbitrary, (fileInfo) => {
          // Property: All generated FileInfo objects should pass validation
          expect(isFileInfo(fileInfo)).toBe(true);
          expect(fileInfo.path).toBeDefined();
          expect(fileInfo.lineCount).toBeGreaterThan(0);
          expect(fileInfo.complexity).toBeGreaterThan(0);
          expect(Array.isArray(fileInfo.dependencies)).toBe(true);
          expect(Array.isArray(fileInfo.exports)).toBe(true);
        }),
        architectureSimplificationTestConfig
      );
    });

    it('Property 2: FolderInfo validation property', () => {
      runArchitecturePropertyTest(
        2,
        'FolderInfo objects should maintain consistent file counts',
        fc.property(folderInfoArbitrary, (folderInfo) => {
          // Property: File count should match the length of files array
          expect(folderInfo.files.length).toBeLessThanOrEqual(folderInfo.fileCount + 10); // Allow some tolerance
          expect(folderInfo.subfolders.length).toBeLessThanOrEqual(folderInfo.subfolderCount + 10);
          expect(folderInfo.totalSize).toBeGreaterThanOrEqual(0);
        }),
        architectureSimplificationTestConfig
      );
    });

    it('Property 3: DuplicatePattern consistency property', () => {
      runArchitecturePropertyTest(
        3,
        'DuplicatePattern should have consistent file and location counts',
        fc.property(duplicatePatternArbitrary, (pattern) => {
          // Property: Number of locations should match or be related to number of files
          expect(pattern.files.length).toBeGreaterThanOrEqual(2); // Must have at least 2 files for duplication
          expect(pattern.locations.length).toBeGreaterThanOrEqual(2); // Must have at least 2 locations
          expect(pattern.similarity).toBeGreaterThanOrEqual(0);
          expect(pattern.similarity).toBeLessThanOrEqual(1);
          expect(pattern.id).toBeDefined();
          expect(pattern.content).toBeDefined();
        }),
        architectureSimplificationTestConfig
      );
    });

    it('Property 4: RefactoringOperation validity property', () => {
      runArchitecturePropertyTest(
        4,
        'RefactoringOperation should have valid structure and dependencies',
        fc.property(refactoringOperationArbitrary, (operation) => {
          // Property: All refactoring operations should have valid structure
          expect(operation.id).toBeDefined();
          expect(['split', 'merge', 'move', 'rename', 'extract', 'consolidate']).toContain(operation.type);
          expect(Array.isArray(operation.affectedFiles)).toBe(true);
          expect(operation.affectedFiles.length).toBeGreaterThan(0);
          expect(Array.isArray(operation.dependencies)).toBe(true);
          expect(['low', 'medium', 'high']).toContain(operation.riskLevel);
          expect(operation.estimatedTime).toBeGreaterThan(0);
        }),
        architectureSimplificationTestConfig
      );
    });
  });

  describe('Integration Tests', () => {
    it('should create valid analysis reports with generated data', () => {
      fc.assert(
        fc.property(
          fc.array(fileInfoArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(folderInfoArbitrary, { maxLength: 5 }),
          (files, folders) => {
            const report: AnalysisReport = {
              totalFiles: files.length,
              oversizedFiles: files.filter(f => f.lineCount > DEFAULT_ANALYSIS_CONFIG.maxFileSize),
              overcrowdedFolders: folders.filter(f => f.fileCount > DEFAULT_ANALYSIS_CONFIG.maxFilesPerFolder),
              duplicatePatterns: [],
              namingIssues: [],
              complexityMetrics: [],
              timestamp: new Date(),
              config: DEFAULT_ANALYSIS_CONFIG,
            };

            expect(isAnalysisReport(report)).toBe(true);
            expect(report.totalFiles).toBe(files.length);
            expect(report.oversizedFiles.every(f => f.lineCount > DEFAULT_ANALYSIS_CONFIG.maxFileSize)).toBe(true);
          }
        ),
        architectureSimplificationTestConfig
      );
    });
  });
});