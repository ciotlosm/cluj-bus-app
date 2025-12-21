/**
 * Complex TypeScript Pattern Handler Tests
 * Tests handling of advanced TypeScript syntax patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplexTypeScriptPatternHandler, AdvancedCodeElement } from './ComplexTypeScriptPatternHandler.js';
import * as ts from 'typescript';
import path from 'path';

describe('ComplexTypeScriptPatternHandler', () => {
  let handler: ComplexTypeScriptPatternHandler;
  let program: ts.Program;

  beforeEach(() => {
    // Create a minimal TypeScript program for testing
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      strict: true,
      skipLibCheck: true
    };

    program = ts.createProgram([], compilerOptions);
    handler = new ComplexTypeScriptPatternHandler(program);
  });

  describe('Generic Type Patterns', () => {
    it('should detect and analyze generic functions', () => {
      const sourceCode = `
export function identity<T>(arg: T): T {
  return arg;
}

export function map<T, U>(items: T[], fn: (item: T) => U): U[] {
  return items.map(fn);
}
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      expect(elements).toHaveLength(2);
      
      const identityFn = elements.find(e => e.name === 'identity');
      expect(identityFn).toBeDefined();
      expect(identityFn!.isGeneric).toBe(true);
      expect(identityFn!.typeParameters).toEqual(['T']);
      expect(identityFn!.patterns.some(p => p.type === 'generic')).toBe(true);

      const mapFn = elements.find(e => e.name === 'map');
      expect(mapFn).toBeDefined();
      expect(mapFn!.isGeneric).toBe(true);
      expect(mapFn!.typeParameters).toEqual(['T', 'U']);
      expect(mapFn!.complexity).toBeGreaterThan(1);
    });

    it('should detect generic classes with constraints', () => {
      const sourceCode = `
export class Repository<T extends { id: string }> {
  private items: T[] = [];
  
  add(item: T): void {
    this.items.push(item);
  }
  
  findById(id: string): T | undefined {
    return this.items.find(item => item.id === id);
  }
}
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const repoClass = elements.find(e => e.name === 'Repository');
      expect(repoClass).toBeDefined();
      expect(repoClass!.isGeneric).toBe(true);
      expect(repoClass!.typeParameters).toEqual(['T']);
      expect(repoClass!.constraints).toEqual(['{ id: string }']);
      expect(repoClass!.dependencies).toContain('id');
    });

    it('should detect generic interfaces with multiple constraints', () => {
      const sourceCode = `
export interface Comparable<T> {
  compareTo(other: T): number;
}

export interface Serializable<T extends string | number> {
  serialize(): T;
  deserialize(data: T): void;
}

export interface ComplexGeneric<T extends Comparable<T>, U extends Serializable<string>> {
  process(item: T): U;
}
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      expect(elements).toHaveLength(3);

      const complexGeneric = elements.find(e => e.name === 'ComplexGeneric');
      expect(complexGeneric).toBeDefined();
      expect(complexGeneric!.isGeneric).toBe(true);
      expect(complexGeneric!.typeParameters).toEqual(['T', 'U']);
      expect(complexGeneric!.dependencies).toContain('Comparable');
      expect(complexGeneric!.dependencies).toContain('Serializable');
    });
  });

  describe('Conditional Type Patterns', () => {
    it('should detect conditional types', () => {
      const sourceCode = `
export type NonNullable<T> = T extends null | undefined ? never : T;

export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

export type ComplexConditional<T> = T extends string 
  ? string[]
  : T extends number
  ? number[]
  : T extends boolean
  ? boolean[]
  : never;
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      expect(elements).toHaveLength(3);

      elements.forEach(element => {
        expect(element.patterns.some(p => p.type === 'conditional')).toBe(true);
        expect(element.patterns.find(p => p.type === 'conditional')?.canSplit).toBe(false);
      });

      const complexConditional = elements.find(e => e.name === 'ComplexConditional');
      expect(complexConditional).toBeDefined();
      expect(complexConditional!.complexity).toBeGreaterThan(3);
    });
  });

  describe('Mapped Type Patterns', () => {
    it('should detect mapped types', () => {
      const sourceCode = `
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Record<K extends keyof any, T> = {
  [P in K]: T;
};
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      expect(elements).toHaveLength(4);

      elements.forEach(element => {
        expect(element.patterns.some(p => p.type === 'mapped')).toBe(true);
        expect(element.patterns.find(p => p.type === 'mapped')?.canSplit).toBe(false);
      });
    });
  });

  describe('Template Literal Type Patterns', () => {
    it('should detect template literal types', () => {
      const sourceCode = `
export type EventName<T extends string> = \`on\${Capitalize<T>}\`;

export type CSSProperty = \`--\${string}\`;

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type APIEndpoint<T extends HTTPMethod> = \`\${T} /api/\${string}\`;

export type ComplexTemplate<T extends string, U extends string> = 
  \`\${T}-\${U}-\${number}\`;
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const templateElements = elements.filter(e => 
        e.patterns.some(p => p.type === 'template-literal')
      );

      expect(templateElements.length).toBeGreaterThan(0);

      templateElements.forEach(element => {
        const templatePattern = element.patterns.find(p => p.type === 'template-literal');
        expect(templatePattern?.canSplit).toBe(false);
        expect(templatePattern?.preservationReason).toContain('atomic');
      });
    });
  });

  describe('Decorator Patterns', () => {
    it('should detect decorator patterns', () => {
      const sourceCode = `
function Component(options: any) {
  return function(target: any) {
    // decorator implementation
  };
}

function Injectable() {
  return function(target: any) {
    // decorator implementation
  };
}

@Component({ selector: 'app-test' })
export class TestComponent {
  @Injectable()
  private service: any;

  @Component({ template: 'test' })
  method() {}
}
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const decoratedClass = elements.find(e => e.name === 'TestComponent');
      expect(decoratedClass).toBeDefined();
      expect(decoratedClass!.hasDecorators).toBe(true);
      expect(decoratedClass!.patterns.some(p => p.type === 'decorator')).toBe(true);
      
      const decoratorPattern = decoratedClass!.patterns.find(p => p.type === 'decorator');
      expect(decoratorPattern?.canSplit).toBe(false);
      expect(decoratorPattern?.dependencies).toContain('Component');
    });
  });

  describe('Namespace and Module Patterns', () => {
    it('should detect namespace declarations', () => {
      const sourceCode = `
export namespace Utils {
  export interface Config {
    debug: boolean;
  }
  
  export class Logger {
    log(message: string): void {
      console.log(message);
    }
  }
  
  export namespace Internal {
    export const SECRET = 'hidden';
  }
}

declare module 'external-lib' {
  interface ExternalInterface {
    newMethod(): void;
  }
}
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const utilsNamespace = elements.find(e => e.name === 'Utils');
      expect(utilsNamespace).toBeDefined();
      expect(utilsNamespace!.type).toBe('namespace');
      expect(utilsNamespace!.exports).toContain('Utils');
    });
  });

  describe('Recursive Type Patterns', () => {
    it('should detect recursive types', () => {
      const sourceCode = `
export type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
};

export type LinkedList<T> = {
  value: T;
  next: LinkedList<T> | null;
};

export type JSON = string | number | boolean | null | JSON[] | { [key: string]: JSON };
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const recursiveElements = elements.filter(e => e.isRecursive);
      expect(recursiveElements.length).toBeGreaterThan(0);

      recursiveElements.forEach(element => {
        const recommendation = handler.getSplittingRecommendation(element);
        expect(recommendation.canSplit).toBe(false);
        expect(recommendation.reason).toContain('recursive');
      });
    });
  });

  describe('Union and Intersection Types', () => {
    it('should detect union and intersection types', () => {
      const sourceCode = `
export type StringOrNumber = string | number;

export type ComplexUnion = string | number | boolean | null | undefined;

export type Intersection = { a: string } & { b: number };

export type ComplexIntersection = 
  { name: string } & 
  { age: number } & 
  { active: boolean };

export type MixedType = (string | number) & { toString(): string };
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const unionElements = elements.filter(e => 
        e.patterns.some(p => p.type === 'union')
      );
      const intersectionElements = elements.filter(e => 
        e.patterns.some(p => p.type === 'intersection')
      );

      expect(unionElements.length).toBeGreaterThan(0);
      expect(intersectionElements.length).toBeGreaterThan(0);

      // Union types can typically be split
      unionElements.forEach(element => {
        const unionPattern = element.patterns.find(p => p.type === 'union');
        expect(unionPattern?.canSplit).toBe(true);
      });

      // Intersection types can typically be split
      intersectionElements.forEach(element => {
        const intersectionPattern = element.patterns.find(p => p.type === 'intersection');
        expect(intersectionPattern?.canSplit).toBe(true);
      });
    });
  });

  describe('Tuple Type Patterns', () => {
    it('should detect tuple types', () => {
      const sourceCode = `
export type Point2D = [number, number];

export type Point3D = [number, number, number];

export type NamedTuple = [name: string, age: number, active: boolean];

export type RestTuple = [string, ...number[]];

export type ComplexTuple = [
  id: string,
  data: { value: number },
  callback: (result: boolean) => void
];
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const tupleElements = elements.filter(e => 
        e.patterns.some(p => p.type === 'tuple')
      );

      expect(tupleElements.length).toBeGreaterThan(0);

      tupleElements.forEach(element => {
        const tuplePattern = element.patterns.find(p => p.type === 'tuple');
        expect(tuplePattern?.canSplit).toBe(true);
        expect(tuplePattern?.complexity).toBe(1);
      });
    });
  });

  describe('Splitting Recommendations', () => {
    it('should provide correct splitting recommendations for complex elements', () => {
      const sourceCode = `
// Safe to split - simple generic
export interface SimpleGeneric<T> {
  value: T;
}

// Cannot split - recursive
export type RecursiveType<T> = {
  value: T;
  children: RecursiveType<T>[];
};

// Cannot split - decorated
@Component()
export class DecoratedClass {
  method() {}
}

// Cannot split - complex conditional
export type ComplexConditional<T> = T extends string 
  ? T extends \`prefix-\${infer U}\`
    ? U extends 'special'
      ? 'very-special'
      : 'normal'
    : 'no-prefix'
  : never;

// Can split with care - high complexity but no blocking patterns
export interface HighComplexity<T, U, V> {
  a: T;
  b: U;
  c: V;
  method1(x: T): U;
  method2(y: U): V;
  method3(z: V): T;
  method4(a: T, b: U): V;
  method5(x: T, y: U, z: V): boolean;
}
`;

      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);

      const simpleGeneric = elements.find(e => e.name === 'SimpleGeneric');
      const recursiveType = elements.find(e => e.name === 'RecursiveType');
      const decoratedClass = elements.find(e => e.name === 'DecoratedClass');
      const complexConditional = elements.find(e => e.name === 'ComplexConditional');
      const highComplexity = elements.find(e => e.name === 'HighComplexity');

      // Simple generic should be splittable
      const simpleRec = handler.getSplittingRecommendation(simpleGeneric!);
      expect(simpleRec.canSplit).toBe(true);
      expect(simpleRec.strategy).toBe('extract');

      // Recursive type should not be splittable
      const recursiveRec = handler.getSplittingRecommendation(recursiveType!);
      expect(recursiveRec.canSplit).toBe(false);
      expect(recursiveRec.reason).toContain('recursive');

      // Decorated class should not be splittable
      const decoratedRec = handler.getSplittingRecommendation(decoratedClass!);
      expect(decoratedRec.canSplit).toBe(false);
      expect(decoratedRec.reason).toContain('decorators');

      // Complex conditional should not be splittable
      const conditionalRec = handler.getSplittingRecommendation(complexConditional!);
      expect(conditionalRec.canSplit).toBe(false);
      expect(conditionalRec.reason).toContain('non-splittable patterns');

      // High complexity should be splittable with care
      if (highComplexity && highComplexity.complexity! > 10) {
        const highComplexityRec = handler.getSplittingRecommendation(highComplexity);
        expect(highComplexityRec.canSplit).toBe(true);
        expect(highComplexityRec.strategy).toBe('split-with-care');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed TypeScript gracefully', () => {
      const sourceCode = `
// Incomplete generic
export type Incomplete<T extends 

// Missing closing brace
export interface MissingBrace {
  prop: string

// Invalid syntax
export type Invalid = string |
`;

      // This should not throw an error
      expect(() => {
        const sourceFile = createSourceFile(sourceCode);
        handler.analyzeComplexPatterns(sourceFile);
      }).not.toThrow();
    });

    it('should handle empty files', () => {
      const sourceCode = '';
      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);
      
      expect(elements).toHaveLength(0);
    });

    it('should handle files with only comments', () => {
      const sourceCode = `
// This is a comment
/* This is a block comment */
/**
 * This is a JSDoc comment
 */
`;
      const sourceFile = createSourceFile(sourceCode);
      const elements = handler.analyzeComplexPatterns(sourceFile);
      
      expect(elements).toHaveLength(0);
    });
  });
});

/**
 * Helper function to create a TypeScript source file for testing
 */
function createSourceFile(sourceCode: string): ts.SourceFile {
  return ts.createSourceFile(
    'test.ts',
    sourceCode,
    ts.ScriptTarget.ES2020,
    true
  );
}