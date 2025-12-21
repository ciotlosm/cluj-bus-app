import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface ImportUpdate {
  filePath: string;
  oldImport: string;
  newImport: string;
  lineNumber: number;
}

export interface ImportUpdateResult {
  success: boolean;
  updatedFiles: string[];
  totalUpdates: number;
  errors: string[];
}

export class ImportPathUpdater {
  private readonly srcPath = 'src';
  
  /**
   * Updates import paths after files have been moved
   */
  async updateImportPaths(movedFiles: string[]): Promise<ImportUpdateResult> {
    const result: ImportUpdateResult = {
      success: true,
      updatedFiles: [],
      totalUpdates: 0,
      errors: []
    };

    try {
      // Create mapping of old paths to new paths
      const pathMapping = this.createPathMapping(movedFiles);
      
      // Find all TypeScript files that might contain imports
      const allTsFiles = await this.findAllTypeScriptFiles();
      
      // Update imports in each file
      for (const filePath of allTsFiles) {
        const updates = await this.updateFileImports(filePath, pathMapping);
        if (updates.length > 0) {
          result.updatedFiles.push(filePath);
          result.totalUpdates += updates.length;
        }
      }
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Import update failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Creates a mapping from old import paths to new import paths
   */
  private createPathMapping(movedFiles: string[]): Map<string, string> {
    const mapping = new Map<string, string>();
    
    movedFiles.forEach(moveInfo => {
      const [oldPath, newPath] = moveInfo.split(' -> ');
      
      // Convert file paths to import paths
      const oldImportPath = this.filePathToImportPath(oldPath);
      const newImportPath = this.filePathToImportPath(newPath);
      
      mapping.set(oldImportPath, newImportPath);
    });
    
    return mapping;
  }

  /**
   * Converts a file path to an import path
   */
  private filePathToImportPath(filePath: string): string {
    // Remove src/ prefix and .ts extension
    let importPath = filePath.replace(/^src\//, '').replace(/\.ts$/, '');
    
    // Convert to relative import format
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }
    
    return importPath;
  }

  /**
   * Finds all TypeScript files in the project
   */
  private async findAllTypeScriptFiles(): Promise<string[]> {
    try {
      const pattern = path.join(this.srcPath, '**/*.{ts,tsx}');
      const files = await glob(pattern, {
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
      });
      return files;
    } catch (error) {
      console.error('Error finding TypeScript files:', error);
      return [];
    }
  }

  /**
   * Updates import statements in a single file
   */
  private async updateFileImports(filePath: string, pathMapping: Map<string, string>): Promise<ImportUpdate[]> {
    const updates: ImportUpdate[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let hasChanges = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const importMatch = this.extractImportPath(line);
        
        if (importMatch) {
          const { importPath, fullMatch } = importMatch;
          const resolvedPath = this.resolveImportPath(filePath, importPath);
          
          // Check if this import needs to be updated
          for (const [oldPath, newPath] of pathMapping.entries()) {
            if (resolvedPath.includes(oldPath.replace('./', ''))) {
              const newImportPath = this.calculateNewImportPath(filePath, newPath);
              const newLine = line.replace(importPath, newImportPath);
              
              lines[i] = newLine;
              hasChanges = true;
              
              updates.push({
                filePath,
                oldImport: importPath,
                newImport: newImportPath,
                lineNumber: i + 1
              });
              
              break;
            }
          }
        }
      }
      
      // Write back the updated content
      if (hasChanges) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      }
      
    } catch (error) {
      console.error(`Error updating imports in ${filePath}:`, error);
    }
    
    return updates;
  }

  /**
   * Extracts import path from an import statement
   */
  private extractImportPath(line: string): { importPath: string; fullMatch: string } | null {
    // Match various import patterns
    const patterns = [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/,  // import ... from '...'
      /import\s+['"]([^'"]+)['"]/,               // import '...'
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/     // require('...')
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          importPath: match[1],
          fullMatch: match[0]
        };
      }
    }
    
    return null;
  }

  /**
   * Resolves an import path relative to the importing file
   */
  private resolveImportPath(importingFile: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      // Relative import
      const importingDir = path.dirname(importingFile);
      return path.resolve(importingDir, importPath);
    } else {
      // Absolute import (from src)
      return path.resolve(this.srcPath, importPath);
    }
  }

  /**
   * Calculates the new import path from the importing file to the new location
   */
  private calculateNewImportPath(importingFile: string, newFilePath: string): string {
    const importingDir = path.dirname(importingFile);
    const targetPath = newFilePath.replace(/\.ts$/, '');
    
    let relativePath = path.relative(importingDir, targetPath);
    
    // Ensure the path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    // Normalize path separators for consistency
    return relativePath.replace(/\\/g, '/');
  }

  /**
   * Validates that all imports are still resolvable after updates
   */
  async validateImports(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const allTsFiles = await this.findAllTypeScriptFiles();
      
      for (const filePath of allTsFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const importMatch = this.extractImportPath(line);
          
          if (importMatch && importMatch.importPath.startsWith('.')) {
            const resolvedPath = this.resolveImportPath(filePath, importMatch.importPath);
            const tsPath = resolvedPath + '.ts';
            const tsxPath = resolvedPath + '.tsx';
            const indexPath = path.join(resolvedPath, 'index.ts');
            
            if (!fs.existsSync(tsPath) && !fs.existsSync(tsxPath) && !fs.existsSync(indexPath)) {
              errors.push(`${filePath}:${i + 1} - Cannot resolve import: ${importMatch.importPath}`);
            }
          }
        }
      }
      
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const importPathUpdater = new ImportPathUpdater();