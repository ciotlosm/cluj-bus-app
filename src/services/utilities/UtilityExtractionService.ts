/**
 * Utility Extraction Service
 * Handles extraction of common code patterns into reusable utilities
 * Validates Requirements: 1.2, 1.3
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type {
  DuplicatePattern,
  ConsolidationSuggestion,
  CodeSelection,
  PatternLocation
} from '../types/architectureSimplification';

/**
 * Service for extracting duplicate code into reusable utilities
 */
export class UtilityExtractionService {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  /**
   * Extracts duplicate code pattern into a utility function
   */
  async extractUtility(pattern: DuplicatePattern): Promise<{
    utilityCode: string;
    utilityPath: string;
    replacementCode: string;
    importStatements: Record<string, string>;
  }> {
    const suggestion = pattern.consolidationSuggestion;
    
    // Generate utility code
    const utilityCode = this.generateUtilityCode(pattern, suggestion);
    
    // Generate utility file path
    const utilityPath = path.join(suggestion.targetLocation, `${suggestion.suggestedName}.ts`);
    
    // Generate replacement code for original locations
    const replacementCode = this.generateReplacementCode(pattern, suggestion);
    
    // Generate import statements for each affected file
    const importStatements = this.generateImportStatements(pattern, suggestion, utilityPath);

    return {
      utilityCode,
      utilityPath,
      replacementCode,
      importStatements
    };
  }

  /**
   * Analyzes code pattern to determine extraction strategy
   */
  analyzePattern(content: string): {
    type: 'function' | 'class' | 'constant' | 'interface' | 'mixed';
    extractable: boolean;
    complexity: 'low' | 'medium' | 'high';
    dependencies: string[];
  } {
    try {
      const sourceFile = ts.createSourceFile(
        'temp.ts',
        content,
        ts.ScriptTarget.Latest,
        true
      );

      let type: 'function' | 'class' | 'constant' | 'interface' | 'mixed' = 'mixed';
      let functionCount = 0;
      let classCount = 0;
      let constantCount = 0;
      let interfaceCount = 0;
      const dependencies: string[] = [];

      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
          functionCount++;
        } else if (ts.isClassDeclaration(node)) {
          classCount++;
        } else if (ts.isVariableStatement(node)) {
          constantCount++;
        } else if (ts.isInterfaceDeclaration(node)) {
          interfaceCount++;
        } else if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          dependencies.push(node.moduleSpecifier.text);
        }
        
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      // Determine primary type
      if (functionCount > 0 && classCount === 0 && constantCount === 0) {
        type = 'function';
      } else if (classCount > 0 && functionCount === 0 && constantCount === 0) {
        type = 'class';
      } else if (constantCount > 0 && functionCount === 0 && classCount === 0) {
        type = 'constant';
      } else if (interfaceCount > 0 && functionCount === 0 && classCount === 0 && constantCount === 0) {
        type = 'interface';
      }

      const extractable = functionCount > 0 || classCount > 0 || constantCount > 0 || interfaceCount > 0;
      const totalElements = functionCount + classCount + constantCount + interfaceCount;
      const complexity = totalElements > 3 ? 'high' : totalElements > 1 ? 'medium' : 'low';

      return {
        type,
        extractable,
        complexity,
        dependencies
      };
    } catch (error) {
      return {
        type: 'mixed',
        extractable: false,
        complexity: 'high',
        dependencies: []
      };
    }
  }

  /**
   * Calculates similarity score between two code blocks
   */
  calculateSimilarity(code1: string, code2: string): number {
    const normalize = (code: string) => {
      return code
        .replace(/\s+/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .trim()
        .toLowerCase();
    };

    const normalized1 = normalize(code1);
    const normalized2 = normalize(code2);

    if (normalized1 === normalized2) return 1.0;

    // Use Levenshtein distance for similarity
    return this.levenshteinSimilarity(normalized1, normalized2);
  }

  /**
   * Identifies common patterns across multiple code blocks
   */
  identifyCommonPatterns(codeBlocks: string[]): {
    commonFunctions: string[];
    commonVariables: string[];
    commonImports: string[];
    sharedLogic: string[];
  } {
    const commonFunctions: string[] = [];
    const commonVariables: string[] = [];
    const commonImports: string[] = [];
    const sharedLogic: string[] = [];

    try {
      const sourceFiles = codeBlocks.map((code, index) => 
        ts.createSourceFile(`temp${index}.ts`, code, ts.ScriptTarget.Latest, true)
      );

      // Extract functions from each file
      const allFunctions = sourceFiles.map(sf => this.extractFunctions(sf));
      const allVariables = sourceFiles.map(sf => this.extractVariables(sf));
      const allImports = sourceFiles.map(sf => this.extractImports(sf));

      // Find common elements
      if (allFunctions.length > 1) {
        const firstFunctions = allFunctions[0];
        for (const func of firstFunctions) {
          if (allFunctions.every(funcs => funcs.some(f => this.calculateSimilarity(f, func) > 0.8))) {
            commonFunctions.push(func);
          }
        }
      }

      if (allVariables.length > 1) {
        const firstVariables = allVariables[0];
        for (const variable of firstVariables) {
          if (allVariables.every(vars => vars.some(v => this.calculateSimilarity(v, variable) > 0.8))) {
            commonVariables.push(variable);
          }
        }
      }

      if (allImports.length > 1) {
        const firstImports = allImports[0];
        for (const importStmt of firstImports) {
          if (allImports.every(imports => imports.includes(importStmt))) {
            commonImports.push(importStmt);
          }
        }
      }

    } catch (error) {
      console.warn('Failed to identify common patterns:', error);
    }

    return {
      commonFunctions,
      commonVariables,
      commonImports,
      sharedLogic
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generates utility code from duplicate pattern
   */
  private generateUtilityCode(pattern: DuplicatePattern, suggestion: ConsolidationSuggestion): string {
    const analysis = this.analyzePattern(pattern.content);
    
    let utilityCode = '';
    
    // Add file header
    utilityCode += `/**\n * ${suggestion.suggestedName}\n * Extracted utility from duplicate code pattern\n */\n\n`;
    
    // Add imports if needed
    if (analysis.dependencies.length > 0) {
      for (const dep of analysis.dependencies) {
        utilityCode += `import ${this.generateImportClause(dep)} from '${dep}';\n`;
      }
      utilityCode += '\n';
    }
    
    // Add the extracted code
    const cleanedContent = this.cleanCodeForExtraction(pattern.content);
    
    if (analysis.type === 'function') {
      // Ensure function is exported
      if (!cleanedContent.includes('export')) {
        utilityCode += `export ${cleanedContent}`;
      } else {
        utilityCode += cleanedContent;
      }
    } else if (analysis.type === 'class') {
      // Ensure class is exported
      if (!cleanedContent.includes('export')) {
        utilityCode += `export ${cleanedContent}`;
      } else {
        utilityCode += cleanedContent;
      }
    } else if (analysis.type === 'constant') {
      // Ensure constant is exported
      if (!cleanedContent.includes('export')) {
        utilityCode += `export ${cleanedContent}`;
      } else {
        utilityCode += cleanedContent;
      }
    } else {
      // Mixed or unknown type - wrap in namespace
      utilityCode += `export namespace ${suggestion.suggestedName} {\n`;
      utilityCode += this.indentCode(cleanedContent, 2);
      utilityCode += '\n}\n';
    }
    
    return utilityCode;
  }

  /**
   * Generates replacement code for original locations
   */
  private generateReplacementCode(pattern: DuplicatePattern, suggestion: ConsolidationSuggestion): string {
    const analysis = this.analyzePattern(pattern.content);
    
    if (analysis.type === 'function') {
      // Extract function name
      const functionMatch = pattern.content.match(/(?:function\s+|const\s+)(\w+)/);
      const functionName = functionMatch ? functionMatch[1] : suggestion.suggestedName;
      return `${functionName}(/* parameters */)`; // Placeholder for function call
    } else if (analysis.type === 'class') {
      return `new ${suggestion.suggestedName}(/* parameters */)`;
    } else if (analysis.type === 'constant') {
      return suggestion.suggestedName;
    } else {
      return `${suggestion.suggestedName}./* method or property */`;
    }
  }

  /**
   * Generates import statements for affected files
   */
  private generateImportStatements(
    pattern: DuplicatePattern, 
    suggestion: ConsolidationSuggestion, 
    utilityPath: string
  ): Record<string, string> {
    const importStatements: Record<string, string> = {};
    const analysis = this.analyzePattern(pattern.content);
    
    for (const filePath of pattern.files) {
      const relativePath = this.calculateRelativeImportPath(filePath, utilityPath);
      
      if (analysis.type === 'function') {
        const functionMatch = pattern.content.match(/(?:function\s+|const\s+)(\w+)/);
        const functionName = functionMatch ? functionMatch[1] : suggestion.suggestedName;
        importStatements[filePath] = `import { ${functionName} } from '${relativePath}';`;
      } else if (analysis.type === 'class') {
        importStatements[filePath] = `import { ${suggestion.suggestedName} } from '${relativePath}';`;
      } else if (analysis.type === 'constant') {
        importStatements[filePath] = `import { ${suggestion.suggestedName} } from '${relativePath}';`;
      } else {
        importStatements[filePath] = `import * as ${suggestion.suggestedName} from '${relativePath}';`;
      }
    }
    
    return importStatements;
  }

  /**
   * Cleans code for extraction (removes comments, normalizes formatting)
   */
  private cleanCodeForExtraction(code: string): string {
    return code
      .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/^\s*\n/gm, '') // Remove empty lines
      .trim();
  }

  /**
   * Indents code by specified number of spaces
   */
  private indentCode(code: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return code.split('\n').map(line => line.trim() ? indent + line : line).join('\n');
  }

  /**
   * Calculates relative import path between two files
   */
  private calculateRelativeImportPath(fromFile: string, toFile: string): string {
    const fromDir = path.dirname(fromFile);
    const relativePath = path.relative(fromDir, toFile);
    
    // Remove .ts extension and ensure it starts with ./ or ../
    const withoutExt = relativePath.replace(/\.ts$/, '');
    
    if (!withoutExt.startsWith('.')) {
      return './' + withoutExt;
    }
    
    return withoutExt;
  }

  /**
   * Generates appropriate import clause for a dependency
   */
  private generateImportClause(dependency: string): string {
    // Simple heuristic for import clause generation
    if (dependency.startsWith('.')) {
      return '* as imported';
    } else if (dependency.includes('/')) {
      const parts = dependency.split('/');
      return parts[parts.length - 1];
    } else {
      return dependency;
    }
  }

  /**
   * Calculates Levenshtein similarity between two strings
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Extracts function declarations from a source file
   */
  private extractFunctions(sourceFile: ts.SourceFile): string[] {
    const functions: string[] = [];
    
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
        const start = node.getFullStart();
        const end = node.getEnd();
        const text = sourceFile.text.substring(start, end).trim();
        functions.push(text);
      }
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return functions;
  }

  /**
   * Extracts variable declarations from a source file
   */
  private extractVariables(sourceFile: ts.SourceFile): string[] {
    const variables: string[] = [];
    
    const visit = (node: ts.Node) => {
      if (ts.isVariableStatement(node)) {
        const start = node.getFullStart();
        const end = node.getEnd();
        const text = sourceFile.text.substring(start, end).trim();
        variables.push(text);
      }
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return variables;
  }

  /**
   * Extracts import statements from a source file
   */
  private extractImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];
    
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return imports;
  }
}

/**
 * Factory function to create a configured UtilityExtractionService
 */
export function createUtilityExtractionService(rootPath?: string): UtilityExtractionService {
  return new UtilityExtractionService(rootPath);
}

/**
 * Default export for convenience
 */
export default UtilityExtractionService;