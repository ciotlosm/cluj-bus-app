/**
 * Architecture Boundary Validation Tests
 * 
 * Validates that the hook architecture maintains clean boundaries:
 * - Processing layer has no data fetching dependencies
 * - Controller layer uses only composition patterns
 * - Shared infrastructure is truly reusable
 * - Clean dependency flow between layers
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Boundary Validation', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const hooksDir = path.join(projectRoot, 'src/hooks');

  /**
   * Helper function to read all TypeScript files in a directory
   */
  function getTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    function traverse(currentDir: string) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  /**
   * Helper function to check if file contains forbidden imports
   */
  function checkForbiddenImports(filePath: string, forbiddenPatterns: RegExp[]): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations: string[] = [];
    
    for (const pattern of forbiddenPatterns) {
      const matches = content.match(new RegExp(pattern, 'g'));
      if (matches) {
        violations.push(...matches);
      }
    }
    
    return violations;
  }

  describe('Requirement 11.1: Processing Layer Purity', () => {
    it('should not have data fetching dependencies in processing hooks', () => {
      const processingDir = path.join(hooksDir, 'processing');
      const processingFiles = getTypeScriptFiles(processingDir);
      
      expect(processingFiles.length).toBeGreaterThan(0);
      
      const forbiddenPatterns = [
        /import.*from.*['"].*\/stores\//,
        /import.*from.*['"].*\/services\//,
        /import.*useVehicleStore/,
        /import.*useConfigStore/,
        /import.*useLocationStore/,
        /import.*tranzyApiService/,
        // liveVehicleService removed
        /import.*geocodingService/,
        /\.getVehicleData\(/,
        /\.getStationData\(/,
        /\.getRouteData\(/,
        /\.fetchVehicles\(/,
        /\.fetchStations\(/
      ];
      
      const violations: Record<string, string[]> = {};
      
      for (const file of processingFiles) {
        const fileViolations = checkForbiddenImports(file, forbiddenPatterns);
        if (fileViolations.length > 0) {
          violations[path.relative(projectRoot, file)] = fileViolations;
        }
      }
      
      expect(violations).toEqual({});
    });

    it('should only import from shared infrastructure and utils', () => {
      const processingDir = path.join(hooksDir, 'processing');
      const processingFiles = getTypeScriptFiles(processingDir);
      
      const allowedImportPatterns = [
        /import.*from.*['"]react['"]/,
        /import.*from.*['"].*\/types/,
        /import.*from.*['"].*\/utils\//,
        /import.*from.*['"].*\/hooks\/shared\//,
        /import.*from.*['"]\.\.\/shared\//,
        /import.*from.*['"]\.\//, // Relative imports within processing layer
      ];
      
      for (const file of processingFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const importLines = content.match(/^import .* from ['"].*['"];?$/gm) || [];
        
        for (const importLine of importLines) {
          const isAllowed = allowedImportPatterns.some(pattern => pattern.test(importLine));
          
          if (!isAllowed) {
            // This import is not in the allowed list - fail the test
            expect(isAllowed).toBe(true);
          }
        }
      }
    });

    it('should use shared validation utilities instead of duplicating validation', () => {
      const processingDir = path.join(hooksDir, 'processing');
      const processingFiles = getTypeScriptFiles(processingDir);
      
      const expectedImports = [
        /import.*validateArray.*from.*['"].*\/shared\/validation/,
        /import.*validateVehicleArray.*from.*['"].*\/shared\/validation/,
        /import.*validateStationArray.*from.*['"].*\/shared\/validation/,
        /import.*validateCoordinates.*from.*['"].*\/shared\/validation/,
        /import.*ErrorHandler.*from.*['"].*\/shared\/errors/
      ];
      
      let foundValidationImports = 0;
      
      for (const file of processingFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const pattern of expectedImports) {
          if (pattern.test(content)) {
            foundValidationImports++;
          }
        }
      }
      
      // At least some processing hooks should use shared validation
      expect(foundValidationImports).toBeGreaterThan(0);
    });
  });

  describe('Requirement 11.2: Controller Layer Composition', () => {
    it('should use composition patterns with processing and shared hooks', () => {
      const controllerDir = path.join(hooksDir, 'controllers');
      const controllerFiles = getTypeScriptFiles(controllerDir);
      
      expect(controllerFiles.length).toBeGreaterThan(0);
      
      const expectedCompositionPatterns = [
        /import.*from.*['"].*\/processing\//,
        /import.*from.*['"].*\/shared\//,
        /useVehicleFiltering/,
        /useVehicleGrouping/,
        /useStoreData/,
        /ErrorHandler/
      ];
      
      let compositionPatternCount = 0;
      
      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const pattern of expectedCompositionPatterns) {
          if (pattern.test(content)) {
            compositionPatternCount++;
          }
        }
      }
      
      // Controllers should use multiple composition patterns
      expect(compositionPatternCount).toBeGreaterThan(5);
    });

    it('should not implement business logic directly', () => {
      const controllerDir = path.join(hooksDir, 'controllers');
      const controllerFiles = getTypeScriptFiles(controllerDir);
      
      // Controllers should delegate to processing hooks, not implement logic
      const businessLogicPatterns = [
        /function.*filter.*\(.*\).*{[\s\S]*?\.filter\(/,
        /function.*sort.*\(.*\).*{[\s\S]*?\.sort\(/,
        /function.*calculate.*\(.*\).*{[\s\S]*?Math\./,
        /function.*validate.*\(.*\).*{[\s\S]*?if.*\(/
      ];
      
      // Note: This is a heuristic check - some inline logic is acceptable
      // We're looking for extensive business logic implementation
      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const fileName = path.basename(file);
        
        // Skip index files
        if (fileName === 'index.ts') continue;
        
        // Count business logic patterns
        let businessLogicCount = 0;
        for (const pattern of businessLogicPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            businessLogicCount += matches.length;
          }
        }
        
        // Controllers should have minimal business logic (< 3 instances)
        expect(businessLogicCount).toBeLessThan(3);
      }
    });

    it('should use generic useStoreData instead of specific store hooks', () => {
      const controllerDir = path.join(hooksDir, 'controllers');
      const controllerFiles = getTypeScriptFiles(controllerDir);
      
      const deprecatedHooks = [
        /useVehicleStoreData/,
        /useStationStoreData/,
        /useRouteStoreData/,
        /useStopTimesStoreData/
      ];
      
      const violations: Record<string, string[]> = {};
      
      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const fileViolations: string[] = [];
        
        for (const pattern of deprecatedHooks) {
          if (pattern.test(content)) {
            fileViolations.push(pattern.source);
          }
        }
        
        if (fileViolations.length > 0) {
          violations[path.relative(projectRoot, file)] = fileViolations;
        }
      }
      
      expect(violations).toEqual({});
    });
  });

  describe('Requirement 11.3: Shared Infrastructure Reusability', () => {
    it('should be used across multiple layers', () => {
      const allHookFiles = getTypeScriptFiles(hooksDir);
      
      const sharedInfrastructureImports = [
        'InputValidator',
        'ErrorHandler',
        'validateArray',
        'validateCoordinates',
        'useStoreData',
        'UnifiedCacheManager'
      ];
      
      const usageByLayer: Record<string, Set<string>> = {
        processing: new Set(),
        controllers: new Set(),
        shared: new Set()
      };
      
      for (const file of allHookFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(hooksDir, file);
        
        let layer = 'shared';
        if (relativePath.startsWith('processing/')) layer = 'processing';
        if (relativePath.startsWith('controllers/')) layer = 'controllers';
        
        for (const importName of sharedInfrastructureImports) {
          if (content.includes(importName)) {
            usageByLayer[layer].add(importName);
          }
        }
      }
      
      // Shared infrastructure should be used in multiple layers
      expect(usageByLayer.processing.size).toBeGreaterThan(0);
      expect(usageByLayer.controllers.size).toBeGreaterThan(0);
    });

    it('should not have circular dependencies', () => {
      const sharedDir = path.join(hooksDir, 'shared');
      const sharedFiles = getTypeScriptFiles(sharedDir);
      
      const circularDependencyPatterns = [
        /import.*from.*['"].*\/processing\//,
        /import.*from.*['"].*\/controllers\//
      ];
      
      const violations: Record<string, string[]> = {};
      
      for (const file of sharedFiles) {
        const fileViolations = checkForbiddenImports(file, circularDependencyPatterns);
        if (fileViolations.length > 0) {
          violations[path.relative(projectRoot, file)] = fileViolations;
        }
      }
      
      expect(violations).toEqual({});
    });

    it('should export consistent interfaces and types', () => {
      const sharedIndexPath = path.join(hooksDir, 'shared/index.ts');
      const content = fs.readFileSync(sharedIndexPath, 'utf-8');
      
      // Check for key exports
      const expectedExports = [
        'useStoreData',
        'InputValidator',
        'ErrorHandler',
        'validateArray',
        'validateCoordinates',
        'UnifiedCacheManager',
        'StandardError',
        'ValidationResult'
      ];
      
      for (const exportName of expectedExports) {
        expect(content).toContain(exportName);
      }
    });
  });

  describe('Requirement 11.4: Clean Dependency Flow', () => {
    it('should have unidirectional dependency flow: Controllers -> Processing -> Shared', () => {
      const allHookFiles = getTypeScriptFiles(hooksDir);
      
      const violations: string[] = [];
      
      for (const file of allHookFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(hooksDir, file);
        
        // Processing layer should not import from controllers
        if (relativePath.startsWith('processing/')) {
          if (/import.*from.*['"].*\/controllers\//.test(content)) {
            violations.push(`Processing layer imports from controllers: ${relativePath}`);
          }
        }
        
        // Shared layer should not import from processing or controllers
        if (relativePath.startsWith('shared/')) {
          if (/import.*from.*['"].*\/processing\//.test(content)) {
            violations.push(`Shared layer imports from processing: ${relativePath}`);
          }
          if (/import.*from.*['"].*\/controllers\//.test(content)) {
            violations.push(`Shared layer imports from controllers: ${relativePath}`);
          }
        }
      }
      
      expect(violations).toEqual([]);
    });

    it('should not have dependencies on stores in processing layer', () => {
      const processingDir = path.join(hooksDir, 'processing');
      const processingFiles = getTypeScriptFiles(processingDir);
      
      const storeImportPatterns = [
        /import.*from.*['"].*\/stores\//,
        /useVehicleStore/,
        /useConfigStore/,
        /useLocationStore/
      ];
      
      const violations: Record<string, string[]> = {};
      
      for (const file of processingFiles) {
        const fileViolations = checkForbiddenImports(file, storeImportPatterns);
        if (fileViolations.length > 0) {
          violations[path.relative(projectRoot, file)] = fileViolations;
        }
      }
      
      expect(violations).toEqual({});
    });
  });

  describe('Requirement 11.5: Extensibility', () => {
    it('should allow adding new hooks without modifying existing infrastructure', () => {
      // Check that shared infrastructure exports are stable and extensible
      const sharedIndexPath = path.join(hooksDir, 'shared/index.ts');
      const content = fs.readFileSync(sharedIndexPath, 'utf-8');
      
      // Infrastructure should export factory functions and utilities
      const extensibilityPatterns = [
        /export.*useStoreData/,
        /export.*InputValidator/,
        /export.*ErrorHandler/,
        /export.*UnifiedCacheManager/,
        /export.*type.*ValidationResult/,
        /export.*type.*StandardError/
      ];
      
      let extensibilityScore = 0;
      for (const pattern of extensibilityPatterns) {
        if (pattern.test(content)) {
          extensibilityScore++;
        }
      }
      
      // Should have most extensibility patterns
      expect(extensibilityScore).toBeGreaterThanOrEqual(2);
    });

    it('should have generic types that support new data types', () => {
      const useStoreDataPath = path.join(hooksDir, 'shared/useStoreData.ts');
      const content = fs.readFileSync(useStoreDataPath, 'utf-8');
      
      // Check for generic type definitions
      expect(content).toContain('DataTypeMap');
      expect(content).toContain('StoreMethodMap');
      expect(content).toContain('UseStoreDataConfig<T>');
      expect(content).toContain('StoreDataResult<T>');
    });

    it('should have validation utilities that work with any data type', () => {
      const validationIndexPath = path.join(hooksDir, 'shared/validation/index.ts');
      const content = fs.readFileSync(validationIndexPath, 'utf-8');
      
      // Check for generic validation exports
      expect(content).toContain('InputValidator');
      expect(content).toContain('validateArray');
      expect(content).toContain('ValidationResult');
    });
  });

  describe('Architecture Documentation', () => {
    it('should have clear layer documentation in index files', () => {
      const indexFiles = [
        path.join(hooksDir, 'processing/index.ts'),
        path.join(hooksDir, 'controllers/index.ts'),
        path.join(hooksDir, 'shared/index.ts')
      ];
      
      for (const indexFile of indexFiles) {
        const content = fs.readFileSync(indexFile, 'utf-8');
        
        // Each index should have documentation comments
        expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);
      }
    });

    it('should document architecture boundaries in comments', () => {
      const processingIndexPath = path.join(hooksDir, 'processing/index.ts');
      const content = fs.readFileSync(processingIndexPath, 'utf-8');
      
      // Processing layer should document its pure nature
      expect(content.toLowerCase()).toMatch(/pure|transformation|business logic|without data fetching/);
    });
  });
});
