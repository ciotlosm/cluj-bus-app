/**
 * AST Analysis Service
 * Provides TypeScript AST parsing for intelligent code splitting and analysis
 */

import * as ts from 'typescript';
import path from 'path';
import { ComplexTypeScriptPatternHandler, AdvancedCodeElement } from './ComplexTypeScriptPatternHandler.js';

export interface CodeElement {
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'import' | 'export';
  name: string;
  startLine: number;
  endLine: number;
  content: string;
  dependencies: string[];
  exports: string[];
  complexity?: number;
}

export interface FileSplitSuggestion {
  originalFile: string;
  suggestedSplits: {
    fileName: string;
    elements: CodeElement[];
    imports: string[];
    exports: string[];
    content: string;
  }[];
  remainingContent: string;
}

export interface ImportInfo {
  moduleName: string;
  importedNames: string[];
  isDefault: boolean;
  line: number;
}

export interface ExportInfo {
  exportedName: string;
  isDefault: boolean;
  line: number;
}

export class ASTAnalysisService {
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;
  private complexPatternHandler: ComplexTypeScriptPatternHandler | null = null;

  constructor(private projectRoot: string = process.cwd()) {}

  /**
   * Initializes TypeScript program for analysis
   */
  async initializeProgram(configPath?: string): Promise<void> {
    const tsConfigPath = configPath || path.join(this.projectRoot, 'tsconfig.json');
    
    let compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true
    };

    // Try to load tsconfig.json if it exists
    try {
      const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
      if (configFile.config) {
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          path.dirname(tsConfigPath)
        );
        compilerOptions = parsedConfig.options;
      }
    } catch (error) {
      console.warn('Could not load tsconfig.json, using default options');
    }

    // Create program with all TypeScript files
    const files = await this.findTypeScriptFiles();
    this.program = ts.createProgram(files, compilerOptions);
    this.checker = this.program.getTypeChecker();
    this.complexPatternHandler = new ComplexTypeScriptPatternHandler(this.program);
  }

  /**
   * Analyzes a TypeScript file and extracts code elements
   */
  async analyzeFile(filePath: string): Promise<CodeElement[]> {
    if (!this.program) {
      await this.initializeProgram();
    }

    const resolvedPath = path.resolve(this.projectRoot, filePath);
    const sourceFile = this.program!.getSourceFile(resolvedPath);
    if (!sourceFile) {
      throw new Error(`Could not find source file: ${filePath} (resolved to: ${resolvedPath})`);
    }

    const elements: CodeElement[] = [];
    const sourceText = sourceFile.getFullText();

    const visit = (node: ts.Node) => {
      const element = this.extractCodeElement(node, sourceFile, sourceText);
      if (element) {
        elements.push(element);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return elements;
  }

  /**
   * Analyzes complex TypeScript patterns in a file
   */
  async analyzeComplexPatterns(filePath: string): Promise<AdvancedCodeElement[]> {
    if (!this.program || !this.complexPatternHandler) {
      await this.initializeProgram();
    }

    const resolvedPath = path.resolve(this.projectRoot, filePath);
    const sourceFile = this.program!.getSourceFile(resolvedPath);
    if (!sourceFile) {
      throw new Error(`Could not find source file: ${filePath} (resolved to: ${resolvedPath})`);
    }

    return this.complexPatternHandler!.analyzeComplexPatterns(sourceFile);
  }

  /**
   * Enhanced file split suggestion with complex pattern awareness
   */
  async suggestFileSplitWithComplexPatterns(filePath: string, maxLinesPerFile: number = 200): Promise<FileSplitSuggestion> {
    const complexElements = await this.analyzeComplexPatterns(filePath);
    const resolvedPath = path.resolve(this.projectRoot, filePath);
    const sourceFile = this.program!.getSourceFile(resolvedPath)!;
    
    if (!sourceFile) {
      throw new Error(`Could not find source file: ${filePath} (resolved to: ${resolvedPath})`);
    }
    
    const sourceText = sourceFile.getFullText();
    
    // Filter elements that can be safely split
    const splittableElements: AdvancedCodeElement[] = [];
    const preserveElements: AdvancedCodeElement[] = [];
    
    for (const element of complexElements) {
      const recommendation = this.complexPatternHandler!.getSplittingRecommendation(element);
      if (recommendation.canSplit) {
        splittableElements.push(element);
      } else {
        preserveElements.push(element);
        console.warn(`⚠️  Preserving ${element.name} in original file: ${recommendation.reason}`);
      }
    }
    
    // Group splittable elements by complexity and relationships
    const groups = this.groupComplexElements(splittableElements);
    
    // Create split suggestions
    const suggestedSplits: FileSplitSuggestion['suggestedSplits'] = [];
    const baseName = path.basename(filePath, path.extname(filePath));
    const baseDir = path.dirname(filePath);

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const totalLines = group.reduce((sum, el) => sum + (el.endLine - el.startLine), 0);
      
      if (totalLines > 50) { // Only split if group is substantial
        const fileName = this.generateComplexSplitFileName(baseName, group, i);
        const filePath = path.join(baseDir, fileName);
        
        const imports = this.calculateComplexRequiredImports(group, complexElements);
        const exports = group.flatMap(el => el.exports);
        const content = this.generateComplexFileContent(group, imports, exports, sourceText);
        
        suggestedSplits.push({
          fileName: filePath,
          elements: group.map(el => this.convertToCodeElement(el)),
          imports,
          exports,
          content
        });
      }
    }

    // Calculate remaining content (preserved elements + non-moved splittable elements)
    const movedElements = new Set(suggestedSplits.flatMap(split => split.elements.map(e => e.name)));
    const remainingElements = complexElements.filter(el => 
      !movedElements.has(el.name) || preserveElements.includes(el)
    );
    const remainingContent = this.generateComplexFileContent(remainingElements, [], [], sourceText);

    return {
      originalFile: filePath,
      suggestedSplits,
      remainingContent
    };
  }
  async suggestFileSplit(filePath: string, maxLinesPerFile: number = 200): Promise<FileSplitSuggestion> {
    const elements = await this.analyzeFile(filePath);
    const resolvedPath = path.resolve(this.projectRoot, filePath);
    const sourceFile = this.program!.getSourceFile(resolvedPath)!;
    
    if (!sourceFile) {
      throw new Error(`Could not find source file: ${filePath} (resolved to: ${resolvedPath})`);
    }
    
    const sourceText = sourceFile.getFullText();
    
    // Group related elements
    const groups = this.groupRelatedElements(elements);
    
    // Create split suggestions
    const suggestedSplits: FileSplitSuggestion['suggestedSplits'] = [];
    const baseName = path.basename(filePath, path.extname(filePath));
    const baseDir = path.dirname(filePath);

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const totalLines = group.reduce((sum, el) => sum + (el.endLine - el.startLine), 0);
      
      if (totalLines > 50) { // Only split if group is substantial
        const fileName = this.generateSplitFileName(baseName, group, i);
        const filePath = path.join(baseDir, fileName);
        
        const imports = this.calculateRequiredImports(group, elements);
        const exports = group.flatMap(el => el.exports);
        const content = this.generateFileContent(group, imports, exports, sourceText);
        
        suggestedSplits.push({
          fileName: filePath,
          elements: group,
          imports,
          exports,
          content
        });
      }
    }

    // Calculate remaining content (elements not moved to splits)
    const movedElements = new Set(suggestedSplits.flatMap(split => split.elements));
    const remainingElements = elements.filter(el => !movedElements.has(el));
    const remainingContent = this.generateFileContent(remainingElements, [], [], sourceText);

    return {
      originalFile: filePath,
      suggestedSplits,
      remainingContent
    };
  }

  /**
   * Extracts imports from a file
   */
  async extractImports(filePath: string): Promise<ImportInfo[]> {
    if (!this.program) {
      await this.initializeProgram();
    }

    const sourceFile = this.program!.getSourceFile(path.resolve(filePath));
    if (!sourceFile) {
      return [];
    }

    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImportInfo(node, sourceFile);
        if (importInfo) {
          imports.push(importInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Extracts exports from a file
   */
  async extractExports(filePath: string): Promise<ExportInfo[]> {
    if (!this.program) {
      await this.initializeProgram();
    }

    const sourceFile = this.program!.getSourceFile(path.resolve(filePath));
    if (!sourceFile) {
      return [];
    }

    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node) => {
      // Check for any export-related nodes
      const exportInfo = this.extractAllExportInfo(node, sourceFile);
      if (exportInfo) {
        exports.push(exportInfo);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  /**
   * Calculates cyclomatic complexity of a function or method
   */
  calculateComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const visit = (node: ts.Node) => {
      // Add complexity for control flow statements
      if (ts.isIfStatement(node) ||
          ts.isWhileStatement(node) ||
          ts.isForStatement(node) ||
          ts.isForInStatement(node) ||
          ts.isForOfStatement(node) ||
          ts.isDoStatement(node) ||
          ts.isSwitchStatement(node) ||
          ts.isCatchClause(node) ||
          ts.isConditionalExpression(node)) {
        complexity++;
      }
      
      // Add complexity for logical operators
      if (ts.isBinaryExpression(node)) {
        if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          complexity++;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(node);
    return complexity;
  }

  /**
   * Extracts a code element from an AST node
   */
  private extractCodeElement(node: ts.Node, sourceFile: ts.SourceFile, sourceText: string): CodeElement | null {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    let element: Partial<CodeElement> = {
      startLine: start.line + 1,
      endLine: end.line + 1,
      content: sourceText.substring(node.getStart(), node.getEnd()),
      dependencies: [],
      exports: []
    };

    if (ts.isFunctionDeclaration(node) && node.name) {
      element.type = 'function';
      element.name = node.name.text;
      element.complexity = this.calculateComplexity(node);
      if (this.hasExportModifier(node)) {
        element.exports = [element.name];
      }
    } else if (ts.isClassDeclaration(node) && node.name) {
      element.type = 'class';
      element.name = node.name.text;
      element.complexity = this.calculateComplexity(node);
      if (this.hasExportModifier(node)) {
        element.exports = [element.name];
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      element.type = 'interface';
      element.name = node.name.text;
      if (this.hasExportModifier(node)) {
        element.exports = [element.name];
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      element.type = 'type';
      element.name = node.name.text;
      if (this.hasExportModifier(node)) {
        element.exports = [element.name];
      }
    } else if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isIdentifier(declaration.name)) {
        element.type = 'variable';
        element.name = declaration.name.text;
        if (this.hasExportModifier(node)) {
          element.exports = [element.name];
        }
      }
    } else {
      return null;
    }

    return element as CodeElement;
  }

  /**
   * Groups related code elements together
   */
  private groupRelatedElements(elements: CodeElement[]): CodeElement[][] {
    const groups: CodeElement[][] = [];
    const processed = new Set<CodeElement>();

    // Group by dependencies and exports
    for (const element of elements) {
      if (processed.has(element)) continue;

      const group = [element];
      processed.add(element);

      // Find related elements
      for (const other of elements) {
        if (processed.has(other)) continue;

        // Check if elements are related by dependencies or similar names
        if (this.areElementsRelated(element, other)) {
          group.push(other);
          processed.add(other);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Checks if two elements are related and should be grouped together
   */
  private areElementsRelated(element1: CodeElement, element2: CodeElement): boolean {
    // Same type elements are often related
    if (element1.type === element2.type) {
      // Check name similarity
      if (this.calculateNameSimilarity(element1.name, element2.name) > 0.7) {
        return true;
      }
    }

    // Check dependency relationships
    if (element1.dependencies.includes(element2.name) || 
        element2.dependencies.includes(element1.name)) {
      return true;
    }

    // Check if they're in similar line ranges (likely related)
    const lineDistance = Math.abs(element1.startLine - element2.startLine);
    if (lineDistance < 50 && element1.type === element2.type) {
      return true;
    }

    return false;
  }

  /**
   * Calculates name similarity between two strings
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generates a filename for a split file
   */
  private generateSplitFileName(baseName: string, elements: CodeElement[], index: number): string {
    // Try to use the most prominent element name
    const mainElement = elements.find(el => el.type === 'class') || 
                       elements.find(el => el.type === 'function') || 
                       elements[0];
    
    if (mainElement && mainElement.name) {
      return `${baseName}.${mainElement.name}.ts`;
    }
    
    return `${baseName}.part${index + 1}.ts`;
  }

  /**
   * Calculates required imports for a group of elements
   */
  private calculateRequiredImports(group: CodeElement[], allElements: CodeElement[]): string[] {
    const imports = new Set<string>();
    
    for (const element of group) {
      for (const dep of element.dependencies) {
        // Check if dependency is provided by another element in the same group
        const isInGroup = group.some(el => el.exports.includes(dep));
        if (!isInGroup) {
          imports.add(dep);
        }
      }
    }
    
    return Array.from(imports);
  }

  /**
   * Generates file content for a group of elements
   */
  private generateFileContent(elements: CodeElement[], imports: string[], exports: string[], originalSource: string): string {
    let content = '';
    
    // Add imports
    if (imports.length > 0) {
      content += `// Auto-generated imports\n`;
      for (const imp of imports) {
        content += `import { ${imp} } from '../${imp}';\n`;
      }
      content += '\n';
    }
    
    // Add element content
    for (const element of elements) {
      content += element.content + '\n\n';
    }
    
    // Add exports if needed
    if (exports.length > 0) {
      content += `// Auto-generated exports\n`;
      content += `export { ${exports.join(', ')} };\n`;
    }
    
    return content;
  }

  /**
   * Checks if a node has export modifier
   */
  private hasExportModifier(node: ts.Node): boolean {
    return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) || false;
  }

  /**
   * Extracts import information from import declaration
   */
  private extractImportInfo(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo | null {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
      return null;
    }

    const moduleName = node.moduleSpecifier.text;
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const importedNames: string[] = [];
    let isDefault = false;

    if (node.importClause) {
      if (node.importClause.name) {
        importedNames.push(node.importClause.name.text);
        isDefault = true;
      }
      
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            importedNames.push(element.name.text);
          }
        }
      }
    }

    return { moduleName, importedNames, isDefault, line };
  }

  /**
   * Extracts export information from export declaration
   */
  private extractExportInfo(node: ts.ExportDeclaration | ts.ExportAssignment, sourceFile: ts.SourceFile): ExportInfo | null {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    
    if (ts.isExportAssignment(node)) {
      return {
        exportedName: 'default',
        isDefault: true,
        line
      };
    }
    
    // Handle export declarations
    if (ts.isExportDeclaration(node)) {
      // Handle named exports
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        // Return first export for simplicity
        const firstExport = node.exportClause.elements[0];
        if (firstExport) {
          return {
            exportedName: firstExport.name.text,
            isDefault: false,
            line
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Enhanced export extraction that handles all export types
   */
  private extractAllExportInfo(node: ts.Node, sourceFile: ts.SourceFile): ExportInfo | null {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    
    // Handle export default declarations
    if (ts.isExportAssignment(node)) {
      return {
        exportedName: 'default',
        isDefault: true,
        line
      };
    }
    
    // Handle export declarations with modifiers (export default class, export default function, etc.)
    if (node.modifiers) {
      const hasExport = node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
      const hasDefault = node.modifiers.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword);
      
      if (hasExport && hasDefault) {
        let name = 'default';
        if (ts.isClassDeclaration(node) && node.name) {
          name = node.name.text;
        } else if (ts.isFunctionDeclaration(node) && node.name) {
          name = node.name.text;
        }
        
        return {
          exportedName: name,
          isDefault: true,
          line
        };
      }
      
      if (hasExport && !hasDefault) {
        let name = 'unknown';
        if (ts.isClassDeclaration(node) && node.name) {
          name = node.name.text;
        } else if (ts.isFunctionDeclaration(node) && node.name) {
          name = node.name.text;
        } else if (ts.isVariableStatement(node)) {
          const declaration = node.declarationList.declarations[0];
          if (declaration && ts.isIdentifier(declaration.name)) {
            name = declaration.name.text;
          }
        }
        
        return {
          exportedName: name,
          isDefault: false,
          line
        };
      }
    }
    
    // Handle export declarations (export { ... })
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        const firstExport = node.exportClause.elements[0];
        if (firstExport) {
          return {
            exportedName: firstExport.name.text,
            isDefault: false,
            line
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Finds all TypeScript files in the project
   */
  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];
    const fs = await import('fs/promises');
    
    const scanDirectory = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore directories we can't read
      }
    };
    
    await scanDirectory(this.projectRoot);
    return files;
  }
}

export default ASTAnalysisService;