/**
 * Complex TypeScript Pattern Handler
 * Handles advanced TypeScript syntax patterns for robust refactoring
 */

import * as ts from 'typescript';
import path from 'path';

export interface ComplexPattern {
  type: 'generic' | 'conditional' | 'mapped' | 'template-literal' | 'decorator' | 'namespace' | 'module-augmentation' | 'intersection' | 'union' | 'tuple' | 'recursive';
  name: string;
  complexity: number;
  dependencies: string[];
  canSplit: boolean;
  splitStrategy?: 'preserve' | 'extract' | 'inline';
  preservationReason?: string;
}

export interface AdvancedCodeElement {
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'import' | 'export' | 'namespace' | 'enum' | 'decorator';
  name: string;
  startLine: number;
  endLine: number;
  content: string;
  dependencies: string[];
  exports: string[];
  complexity?: number;
  patterns: ComplexPattern[];
  typeParameters?: string[];
  constraints?: string[];
  isGeneric: boolean;
  hasDecorators: boolean;
  isRecursive: boolean;
}

export class ComplexTypeScriptPatternHandler {
  private checker: ts.TypeChecker | null = null;

  constructor(private program: ts.Program) {
    this.checker = program.getTypeChecker();
  }

  /**
   * Analyzes complex TypeScript patterns in a source file
   */
  analyzeComplexPatterns(sourceFile: ts.SourceFile): AdvancedCodeElement[] {
    const elements: AdvancedCodeElement[] = [];

    const visit = (node: ts.Node) => {
      const element = this.extractAdvancedElement(node, sourceFile);
      if (element) {
        elements.push(element);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return elements;
  }

  /**
   * Extracts advanced code element with complex pattern analysis
   */
  private extractAdvancedElement(node: ts.Node, sourceFile: ts.SourceFile): AdvancedCodeElement | null {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const sourceText = sourceFile.getFullText();
    
    let element: Partial<AdvancedCodeElement> = {
      startLine: start.line + 1,
      endLine: end.line + 1,
      content: sourceText.substring(node.getStart(), node.getEnd()),
      dependencies: [],
      exports: [],
      patterns: [],
      typeParameters: [],
      constraints: [],
      isGeneric: false,
      hasDecorators: false,
      isRecursive: false
    };

    // Handle different node types with complex pattern detection
    if (ts.isFunctionDeclaration(node) && node.name) {
      element = this.analyzeFunctionDeclaration(node, element, sourceFile);
    } else if (ts.isClassDeclaration(node) && node.name) {
      element = this.analyzeClassDeclaration(node, element, sourceFile);
    } else if (ts.isInterfaceDeclaration(node)) {
      element = this.analyzeInterfaceDeclaration(node, element, sourceFile);
    } else if (ts.isTypeAliasDeclaration(node)) {
      element = this.analyzeTypeAliasDeclaration(node, element, sourceFile);
    } else if (ts.isVariableStatement(node)) {
      element = this.analyzeVariableStatement(node, element, sourceFile);
    } else if (ts.isModuleDeclaration(node)) {
      element = this.analyzeNamespaceDeclaration(node, element, sourceFile);
    } else if (ts.isEnumDeclaration(node)) {
      element = this.analyzeEnumDeclaration(node, element, sourceFile);
    } else {
      return null;
    }

    // Analyze complex patterns
    element.patterns = this.detectComplexPatterns(node, sourceFile);
    element.complexity = this.calculateAdvancedComplexity(node, element.patterns!);

    return element as AdvancedCodeElement;
  }

  /**
   * Analyzes function declarations with advanced patterns
   */
  private analyzeFunctionDeclaration(
    node: ts.FunctionDeclaration, 
    element: Partial<AdvancedCodeElement>,
    sourceFile: ts.SourceFile
  ): Partial<AdvancedCodeElement> {
    element.type = 'function';
    element.name = node.name!.text;
    
    // Check for generics
    if (node.typeParameters && node.typeParameters.length > 0) {
      element.isGeneric = true;
      element.typeParameters = node.typeParameters.map(tp => tp.name.text);
      element.constraints = node.typeParameters.map(tp => 
        tp.constraint ? tp.constraint.getText(sourceFile) : ''
      ).filter(c => c);
    }

    // Check for decorators
    if (node.decorators && node.decorators.length > 0) {
      element.hasDecorators = true;
    }

    // Check for export
    if (this.hasExportModifier(node)) {
      element.exports = [element.name!];
    }

    // Analyze parameters for complex types
    if (node.parameters) {
      for (const param of node.parameters) {
        if (param.type) {
          const paramDeps = this.extractTypeDependencies(param.type, sourceFile);
          element.dependencies!.push(...paramDeps);
        }
      }
    }

    // Analyze return type
    if (node.type) {
      const returnDeps = this.extractTypeDependencies(node.type, sourceFile);
      element.dependencies!.push(...returnDeps);
    }

    return element;
  }

  /**
   * Analyzes class declarations with advanced patterns
   */
  private analyzeClassDeclaration(
    node: ts.ClassDeclaration,
    element: Partial<AdvancedCodeElement>,
    sourceFile: ts.SourceFile
  ): Partial<AdvancedCodeElement> {
    element.type = 'class';
    element.name = node.name!.text;

    // Check for generics
    if (node.typeParameters && node.typeParameters.length > 0) {
      element.isGeneric = true;
      element.typeParameters = node.typeParameters.map(tp => tp.name.text);
      element.constraints = node.typeParameters.map(tp => 
        tp.constraint ? tp.constraint.getText(sourceFile) : ''
      ).filter(c => c);
    }

    // Check for decorators
    if (node.decorators && node.decorators.length > 0) {
      element.hasDecorators = true;
    }

    // Analyze heritage clauses (extends, implements)
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        for (const type of clause.types) {
          const deps = this.extractTypeDependencies(type, sourceFile);
          element.dependencies!.push(...deps);
        }
      }
    }

    // Analyze class members for additional dependencies
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && member.type) {
        const deps = this.extractTypeDependencies(member.type, sourceFile);
        element.dependencies!.push(...deps);
      } else if (ts.isMethodDeclaration(member)) {
        if (member.type) {
          const deps = this.extractTypeDependencies(member.type, sourceFile);
          element.dependencies!.push(...deps);
        }
        if (member.parameters) {
          for (const param of member.parameters) {
            if (param.type) {
              const deps = this.extractTypeDependencies(param.type, sourceFile);
              element.dependencies!.push(...deps);
            }
          }
        }
      }
    }

    // Check for export
    if (this.hasExportModifier(node)) {
      element.exports = [element.name!];
    }

    return element;
  }

  /**
   * Analyzes interface declarations with advanced patterns
   */
  private analyzeInterfaceDeclaration(
    node: ts.InterfaceDeclaration,
    element: Partial<AdvancedCodeElement>,
    sourceFile: ts.SourceFile
  ): Partial<AdvancedCodeElement> {
    element.type = 'interface';
    element.name = node.name.text;

    // Check for generics
    if (node.typeParameters && node.typeParameters.length > 0) {
      element.isGeneric = true;
      element.typeParameters = node.typeParameters.map(tp => tp.name.text);
      element.constraints = node.typeParameters.map(tp => 
        tp.constraint ? tp.constraint.getText(sourceFile) : ''
      ).filter(c => c);
    }

    // Analyze heritage clauses (extends)
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        for (const type of clause.types) {
          const deps = this.extractTypeDependencies(type, sourceFile);
          element.dependencies!.push(...deps);
        }
      }
    }

    // Analyze members for complex types
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.type) {
        const deps = this.extractTypeDependencies(member.type, sourceFile);
        element.dependencies!.push(...deps);
      } else if (ts.isMethodSignature(member)) {
        if (member.type) {
          const deps = this.extractTypeDependencies(member.type, sourceFile);
          element.dependencies!.push(...deps);
        }
        if (member.parameters) {
          for (const param of member.parameters) {
            if (param.type) {
              const deps = this.extractTypeDependencies(param.type, sourceFile);
              element.dependencies!.push(...deps);
            }
          }
        }
      }
    }

    // Check for export
    if (this.hasExportModifier(node)) {
      element.exports = [element.name!];
    }

    return element;
  }

  /**
   * Analyzes type alias declarations with advanced patterns
   */
  private analyzeTypeAliasDeclaration(
    node: ts.TypeAliasDeclaration,
    element: Partial<AdvancedCodeElement>,
    sourceFile: ts.SourceFile
  ): Partial<AdvancedCodeElement> {
    element.type = 'type';
    element.name = node.name.text;

    // Check for generics
    if (node.typeParameters && node.typeParameters.length > 0) {
      element.isGeneric = true;
      element.typeParameters = node.typeParameters.map(tp => tp.name.text);
      element.constraints = node.typeParameters.map(tp => 
        tp.constraint ? tp.constraint.getText(sourceFile) : ''
      ).filter(c => c);
    }

    // Analyze the type for dependencies
    const deps = this.extractTypeDependencies(node.type, sourceFile);
    element.dependencies!.push(...deps);

    // Check for recursion
    const typeText = node.type.getText(sourceFile);
    if (typeText.includes(node.name.text)) {
      element.isRecursive = true;
    }

    // Check for export
    if (this.hasExportModifier(node)) {
      element.exports = [element.name!];
    }

    return element;
  }

  /**
   * Analyzes variable statements with advanced patterns
   */
  private analyzeVariableStatement(
    node: ts.VariableStatement,
    element: Partial<AdvancedCodeElement>,
    sourceFile: ts.SourceFile
  ): Partial<AdvancedCodeElement> {
    const declaration = node.declarationList.declarations[0];
    if (!declaration || !ts.isIdentifier(declaration.name)) {
      return element;
    }

    element.type = 'variable';
    element.name = declaration.name.text;

    // Check for decorators
    if (node.decorators && node.decorators.length > 0) {
      element.hasDecorators = true;
    }

    // Analyze type annotation
    if (declaration.type) {
      const deps = this.extractTypeDependencies(declaration.type, sourceFile);
      element.dependencies!.push(...deps);
    }

    // Check for export
    if (this.hasExportModifier(node)) {
      element.exports = [element.name!];
    }

    return element;
  }

  /**
   * Analyzes namespace/module declarations
   */
  private analyzeNamespaceDeclaration(
    node: ts.ModuleDeclaration,
    element: Partial<AdvancedCodeElement>,
    sourceFile: ts.SourceFile
  ): Partial<AdvancedCodeElement> {
    element.type = 'namespace';
    element.name = node.name ? node.name.getText(sourceFile) : 'anonymous';

    // Check for export
    if (this.hasExportModifier(node)) {
      element.exports = [element.name!];
    }

    return element;
  }

  /**
   * Analyzes enum declarations
   */
  private analyzeEnumDeclaration(
    node: ts.EnumDeclaration,
    element: Partial<AdvancedCodeElement>,
    sourceFile: ts.SourceFile
  ): Partial<AdvancedCodeElement> {
    element.type = 'enum';
    element.name = node.name.text;

    // Check for export
    if (this.hasExportModifier(node)) {
      element.exports = [element.name!];
    }

    return element;
  }

  /**
   * Detects complex TypeScript patterns in a node
   */
  private detectComplexPatterns(node: ts.Node, sourceFile: ts.SourceFile): ComplexPattern[] {
    const patterns: ComplexPattern[] = [];
    const nodeText = node.getText(sourceFile);

    // Detect generic patterns
    if (this.hasGenerics(node)) {
      patterns.push({
        type: 'generic',
        name: 'generic-type-parameters',
        complexity: this.countTypeParameters(node),
        dependencies: this.extractGenericDependencies(node, sourceFile),
        canSplit: false,
        splitStrategy: 'preserve',
        preservationReason: 'Generic type parameters must stay with their declaration'
      });
    }

    // Detect conditional types
    if (nodeText.includes('extends') && nodeText.includes('?') && nodeText.includes(':')) {
      patterns.push({
        type: 'conditional',
        name: 'conditional-type',
        complexity: 3,
        dependencies: [],
        canSplit: false,
        splitStrategy: 'preserve',
        preservationReason: 'Conditional types are atomic and cannot be split'
      });
    }

    // Detect mapped types
    if (nodeText.includes('keyof') || (nodeText.includes('[') && nodeText.includes('in '))) {
      patterns.push({
        type: 'mapped',
        name: 'mapped-type',
        complexity: 4,
        dependencies: [],
        canSplit: false,
        splitStrategy: 'preserve',
        preservationReason: 'Mapped types require complete type definition'
      });
    }

    // Detect template literal types
    if (nodeText.includes('`') && nodeText.includes('${')) {
      patterns.push({
        type: 'template-literal',
        name: 'template-literal-type',
        complexity: 2,
        dependencies: [],
        canSplit: false,
        splitStrategy: 'preserve',
        preservationReason: 'Template literal types are atomic'
      });
    }

    // Detect decorators
    if (this.hasDecorators(node)) {
      patterns.push({
        type: 'decorator',
        name: 'decorator-pattern',
        complexity: 2,
        dependencies: this.extractDecoratorDependencies(node, sourceFile),
        canSplit: false,
        splitStrategy: 'preserve',
        preservationReason: 'Decorators must stay with their target'
      });
    }

    // Detect intersection types
    if (nodeText.includes(' & ')) {
      patterns.push({
        type: 'intersection',
        name: 'intersection-type',
        complexity: 2,
        dependencies: [],
        canSplit: true,
        splitStrategy: 'extract'
      });
    }

    // Detect union types
    if (nodeText.includes(' | ')) {
      patterns.push({
        type: 'union',
        name: 'union-type',
        complexity: 1,
        dependencies: [],
        canSplit: true,
        splitStrategy: 'extract'
      });
    }

    // Detect tuple types
    if (nodeText.match(/\[.*,.*\]/)) {
      patterns.push({
        type: 'tuple',
        name: 'tuple-type',
        complexity: 1,
        dependencies: [],
        canSplit: true,
        splitStrategy: 'extract'
      });
    }

    return patterns;
  }

  /**
   * Extracts type dependencies from a type node
   */
  private extractTypeDependencies(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string[] {
    const dependencies: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
        dependencies.push(node.typeName.text);
      } else if (ts.isQualifiedName(node)) {
        dependencies.push(node.getText(sourceFile));
      } else if (ts.isIdentifier(node)) {
        // Capture standalone identifiers that might be type references
        dependencies.push(node.text);
      }
      ts.forEachChild(node, visit);
    };

    visit(typeNode);
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Calculates advanced complexity including pattern complexity
   */
  private calculateAdvancedComplexity(node: ts.Node, patterns: ComplexPattern[]): number {
    let baseComplexity = this.calculateCyclomaticComplexity(node);
    
    // Add pattern complexity
    const patternComplexity = patterns.reduce((sum, pattern) => sum + pattern.complexity, 0);
    
    // Add generic complexity
    const genericComplexity = this.hasGenerics(node) ? this.countTypeParameters(node) * 2 : 0;
    
    // Add decorator complexity
    const decoratorComplexity = this.hasDecorators(node) ? this.countDecorators(node) * 1.5 : 0;
    
    return baseComplexity + patternComplexity + genericComplexity + decoratorComplexity;
  }

  /**
   * Calculates cyclomatic complexity
   */
  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1;

    const visit = (node: ts.Node) => {
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
   * Helper methods for pattern detection
   */
  private hasGenerics(node: ts.Node): boolean {
    return 'typeParameters' in node && Array.isArray((node as any).typeParameters) && (node as any).typeParameters.length > 0;
  }

  private hasDecorators(node: ts.Node): boolean {
    // In newer TypeScript versions, decorators might be in different locations
    if ('decorators' in node && Array.isArray((node as any).decorators) && (node as any).decorators.length > 0) {
      return true;
    }
    // Also check modifiers for decorator-like patterns
    if ('modifiers' in node && Array.isArray((node as any).modifiers)) {
      return (node as any).modifiers.some((mod: any) => mod.kind === ts.SyntaxKind.AtToken || 
        (mod.expression && ts.isCallExpression(mod.expression)));
    }
    return false;
  }

  private countTypeParameters(node: ts.Node): number {
    return this.hasGenerics(node) ? (node as any).typeParameters.length : 0;
  }

  private countDecorators(node: ts.Node): number {
    let count = 0;
    if ('decorators' in node && Array.isArray((node as any).decorators)) {
      count += (node as any).decorators.length;
    }
    if ('modifiers' in node && Array.isArray((node as any).modifiers)) {
      count += (node as any).modifiers.filter((mod: any) => 
        mod.kind === ts.SyntaxKind.AtToken || 
        (mod.expression && ts.isCallExpression(mod.expression))
      ).length;
    }
    return count;
  }

  private extractGenericDependencies(node: ts.Node, sourceFile: ts.SourceFile): string[] {
    const dependencies: string[] = [];
    
    if (this.hasGenerics(node)) {
      const typeParameters = (node as any).typeParameters as ts.TypeParameterDeclaration[];
      for (const tp of typeParameters) {
        if (tp.constraint) {
          const constraintDeps = this.extractTypeDependencies(tp.constraint, sourceFile);
          dependencies.push(...constraintDeps);
        }
        if (tp.default) {
          const defaultDeps = this.extractTypeDependencies(tp.default, sourceFile);
          dependencies.push(...defaultDeps);
        }
      }
    }
    
    return [...new Set(dependencies)];
  }

  private extractDecoratorDependencies(node: ts.Node, sourceFile: ts.SourceFile): string[] {
    const dependencies: string[] = [];
    
    // Check decorators property
    if ('decorators' in node && Array.isArray((node as any).decorators)) {
      const decorators = (node as any).decorators as ts.Decorator[];
      for (const decorator of decorators) {
        if (ts.isCallExpression(decorator.expression)) {
          if (ts.isIdentifier(decorator.expression.expression)) {
            dependencies.push(decorator.expression.expression.text);
          }
        } else if (ts.isIdentifier(decorator.expression)) {
          dependencies.push(decorator.expression.text);
        }
      }
    }
    
    // Check modifiers for decorator-like patterns
    if ('modifiers' in node && Array.isArray((node as any).modifiers)) {
      const modifiers = (node as any).modifiers;
      for (const modifier of modifiers) {
        if (modifier.expression && ts.isCallExpression(modifier.expression)) {
          if (ts.isIdentifier(modifier.expression.expression)) {
            dependencies.push(modifier.expression.expression.text);
          }
        } else if (modifier.expression && ts.isIdentifier(modifier.expression)) {
          dependencies.push(modifier.expression.text);
        }
      }
    }
    
    return [...new Set(dependencies)];
  }

  private hasExportModifier(node: ts.Node): boolean {
    return 'modifiers' in node && 
           Array.isArray((node as any).modifiers) && 
           (node as any).modifiers.some((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword);
  }

  /**
   * Determines if a complex element can be safely split
   */
  canSafelySplit(element: AdvancedCodeElement): boolean {
    // Cannot split if it has non-splittable patterns
    const hasNonSplittablePatterns = element.patterns.some(pattern => !pattern.canSplit);
    if (hasNonSplittablePatterns) {
      return false;
    }

    // Cannot split recursive types
    if (element.isRecursive) {
      return false;
    }

    // Cannot split if it has complex generics with constraints (but simple generics are OK)
    if (element.isGeneric && element.constraints && element.constraints.some(c => c.length > 20)) {
      return false;
    }

    // Cannot split decorated elements (but this is more lenient now)
    if (element.hasDecorators && element.patterns.some(p => p.type === 'decorator')) {
      return false;
    }

    return true;
  }

  /**
   * Gets splitting recommendations for complex elements
   */
  getSplittingRecommendation(element: AdvancedCodeElement): {
    canSplit: boolean;
    strategy: 'preserve' | 'extract' | 'inline' | 'split-with-care';
    reason: string;
    alternatives?: string[];
  } {
    if (!this.canSafelySplit(element)) {
      const reasons = [];
      
      if (element.patterns.some(p => !p.canSplit)) {
        reasons.push('Contains non-splittable patterns');
      }
      if (element.isRecursive) {
        reasons.push('Contains recursive type definitions');
      }
      if (element.hasDecorators) {
        reasons.push('Contains decorators that must stay with target');
      }
      if (element.isGeneric && element.constraints?.some(c => c.length > 0)) {
        reasons.push('Contains complex generic constraints');
      }

      return {
        canSplit: false,
        strategy: 'preserve',
        reason: reasons.join(', '),
        alternatives: [
          'Keep entire element in original file',
          'Consider refactoring to reduce complexity',
          'Split only non-complex parts if possible'
        ]
      };
    }

    // Determine best splitting strategy
    if (element.complexity! > 10) {
      return {
        canSplit: true,
        strategy: 'split-with-care',
        reason: 'High complexity but splittable with careful dependency management',
        alternatives: [
          'Extract utility types first',
          'Split by logical boundaries',
          'Maintain type relationships'
        ]
      };
    }

    return {
      canSplit: true,
      strategy: 'extract',
      reason: 'Safe to extract with standard splitting approach'
    };
  }
}

export default ComplexTypeScriptPatternHandler;