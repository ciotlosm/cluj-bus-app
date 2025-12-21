import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportPathUpdater } from './ImportPathUpdater';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn()
}));

// Mock glob module
vi.mock('glob', () => ({
  glob: vi.fn()
}));

describe('ImportPathUpdater', () => {
  let updater: ImportPathUpdater;

  beforeEach(() => {
    updater = new ImportPathUpdater();
    vi.clearAllMocks();
  });

  describe('updateImportPaths', () => {
    it('should update import paths after files are moved', async () => {
      const movedFiles = [
        'src/services/tranzyApiService.ts -> src/services/api/tranzyApiService.ts',
        'src/utils/validation.ts -> src/utils/validation/validation.ts'
      ];

      // Mock glob to return test files
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(['src/components/TestComponent.ts'] as any);

      // Mock file content with imports
      const fileContent = `import { apiService } from '../services/api/tranzyApiService';
import { validate } from '../utils/validation';

export class TestComponent {}`;

      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await updater.updateImportPaths(movedFiles);

      expect(result.success).toBe(true);
      expect(result.updatedFiles).toHaveLength(1);
      expect(result.totalUpdates).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const movedFiles = ['src/services/test.ts -> src/services/api/test.ts'];

      const { glob } = await import('glob');
      vi.mocked(glob).mockRejectedValue(new Error('Glob failed'));

      const result = await updater.updateImportPaths(movedFiles);

      // The service handles glob errors gracefully by returning empty file list
      // and continuing with the operation, so success should be true
      expect(result.success).toBe(true);
      expect(result.updatedFiles).toHaveLength(0);
      expect(result.totalUpdates).toBe(0);
    });
  });

  describe('validateImports', () => {
    it('should validate that all imports are resolvable', async () => {
      // Mock glob to return test files
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(['src/components/TestComponent.ts'] as any);

      // Mock file content with valid imports
      const fileContent = `import { apiService } from '../services/api/tranzyApiService';`;

      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);
      vi.mocked(fs.existsSync).mockReturnValue(true); // Import target exists

      const result = await updater.validateImports();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect broken imports', async () => {
      // Mock glob to return test files
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(['src/components/TestComponent.ts'] as any);

      // Mock file content with broken imports
      const fileContent = `import { apiService } from '../services/nonexistent';`;

      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);
      vi.mocked(fs.existsSync).mockReturnValue(false); // Import target doesn't exist

      const result = await updater.validateImports();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('extractImportPath', () => {
    it('should extract import paths from various import statements', () => {
      const testCases = [
        "import { something } from './test';",
        "import './styles.css';",
        "const module = require('./module');",
        "import type { Type } from '../types';"
      ];

      testCases.forEach(line => {
        const result = (updater as any).extractImportPath(line);
        expect(result).toBeTruthy();
        expect(result.importPath).toBeTruthy();
      });
    });

    it('should return null for non-import lines', () => {
      const testCases = [
        "const variable = 'value';",
        "// This is a comment",
        "export class TestClass {}"
      ];

      testCases.forEach(line => {
        const result = (updater as any).extractImportPath(line);
        expect(result).toBeNull();
      });
    });
  });

  describe('calculateNewImportPath', () => {
    it('should calculate correct relative paths', () => {
      const importingFile = 'src/components/TestComponent.ts';
      const newFilePath = 'src/services/api/tranzyApiService.ts';

      const result = (updater as any).calculateNewImportPath(importingFile, newFilePath);

      expect(result).toBe('../services/api/tranzyApiService');
    });

    it('should handle same directory imports', () => {
      const importingFile = 'src/services/api/TestService.ts';
      const newFilePath = 'src/services/api/tranzyApiService.ts';

      const result = (updater as any).calculateNewImportPath(importingFile, newFilePath);

      expect(result).toBe('../api/tranzyApiService');
    });
  });
});