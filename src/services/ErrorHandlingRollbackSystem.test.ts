/**
 * Error Handling and Rollback System Tests
 * Comprehensive test suite for error detection, recovery, and rollback functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import ErrorHandlingRollbackSystem from './ErrorHandlingRollbackSystem';
import {
  RefactoringOperation,
  ValidationReport
} from '../types/architectureSimplification';

// Mock external dependencies
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn()
  }
}));

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

vi.mock('../utils/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../utils/performance/performance', () => ({
  performanceMonitor: {
    recordTiming: vi.fn(),
    getSummary: vi.fn(() => ({}))
  }
}));

describe('ErrorHandlingRollbackSystem', () => {
  let system: ErrorHandlingRollbackSystem;
  let mockFs: any;
  let mockExecSync: any;

  beforeEach(() => {
    system = new ErrorHandlingRollbackSystem('/test/project');
    mockFs = vi.mocked(fs.promises);
    mockExecSync = vi.mocked(childProcess.execSync);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ size: 1000, mtime: new Date() } as any);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('test content');
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockExecSync.mockReturnValue('success');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Snapshot Creation', () => {
    it('should create basic state snapshot', async () => {
      // Setup minimal mock file system
      mockFs.readdir.mockResolvedValue([
        { name: 'test.ts', isDirectory: () => false, isFile: () => true }
      ] as any);
      
      mockFs.readFile.mockResolvedValue('export const test = "value";');
      mockExecSync.mockReturnValue('abc123commit');

      const snapshot = await system.createStateSnapshot('test-operation');

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBe('test-operation');
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.fileContents).toBeDefined();
      expect(snapshot.filePaths).toBeDefined();
      expect(snapshot.directoryStructure).toBeDefined();
      expect(snapshot.validationState).toBeDefined();
      expect(snapshot.gitCommit).toBe('abc123commit');
    });

    it('should handle snapshot creation errors gracefully', async () => {
      // Setup a scenario where some operations fail but others succeed
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      // Git command should still work
      mockExecSync.mockReturnValue('abc123commit');

      const snapshot = await system.createStateSnapshot('test-operation');

      // Should still create a snapshot, but with empty file contents
      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBe('test-operation');
      expect(snapshot.fileContents).toEqual({});
      expect(snapshot.gitCommit).toBe('abc123commit');
    });
  });

  describe('Error Detection', () => {
    let testOperation: RefactoringOperation;

    beforeEach(() => {
      testOperation = {
        id: 'test-op',
        type: 'split',
        affectedFiles: ['/test/file1.ts'],
        parameters: {},
        dependencies: [],
        riskLevel: 'medium',
        estimatedTime: 1000
      };
    });

    it('should detect syntax errors', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('tsc')) {
          throw new Error('Syntax error: Missing semicolon');
        }
        return 'success';
      });

      const errors = await system.detectErrors(testOperation);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('syntax_error');
      expect(errors[0].severity).toBe('high');
      expect(errors[0].recoveryStrategy).toBe('auto_fix');
    });

    it('should detect build errors', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('tsc --noEmit')) {
          throw new Error('Build failed: Type error');
        }
        return 'success';
      });

      const errors = await system.detectErrors(testOperation);

      expect(errors.some(e => e.type === 'build_error')).toBe(true);
      const buildError = errors.find(e => e.type === 'build_error');
      expect(buildError?.severity).toBe('critical');
      expect(buildError?.recoveryStrategy).toBe('rollback');
    });
  });

  describe('Error Reporting', () => {
    it('should generate error report', () => {
      const errors = [
        {
          id: 'critical-error',
          type: 'build_error' as const,
          severity: 'critical' as const,
          message: 'Critical build failure',
          details: 'TypeScript compilation failed',
          affectedFiles: ['/test/file.ts'],
          recoveryStrategy: 'rollback' as const,
          recoveryGuidance: 'Rollback changes immediately',
          timestamp: new Date(),
          context: {}
        }
      ];

      const report = system.generateErrorReport(errors);

      expect(report).toContain('# Refactoring Error Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('**Total Errors**: 1');
      expect(report).toContain('**Critical**: 1');
      expect(report).toContain('🚨 Critical Errors');
      expect(report).toContain('Critical build failure');
      expect(report).toContain('Rollback changes immediately');
    });

    it('should handle empty error list', () => {
      const report = system.generateErrorReport([]);
      expect(report).toBe('No errors detected.');
    });
  });

  describe('System Management', () => {
    it('should maintain error history', async () => {
      const operation: RefactoringOperation = {
        id: 'test-op',
        type: 'split',
        affectedFiles: ['/test/file.ts'],
        parameters: {},
        dependencies: [],
        riskLevel: 'low',
        estimatedTime: 500
      };

      // Trigger some errors
      mockExecSync.mockImplementation(() => {
        throw new Error('Test error');
      });

      await system.detectErrors(operation);
      
      const history = system.getErrorHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should cleanup old data', () => {
      system.cleanup();
      
      const snapshots = system.getAvailableSnapshots();
      expect(Array.isArray(snapshots)).toBe(true);
    });
  });
});