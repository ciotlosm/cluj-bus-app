/**
 * Edge Cases Integration Tests for Complex TypeScript Patterns
 * Tests the refactoring system with advanced TypeScript syntax
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IntegratedRefactoringSystem } from './IntegratedRefactoringSystem.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('IntegratedRefactoringSystem Edge Cases', () => {
  let testDir: string;
  let refactoringSystem: IntegratedRefactoringSystem;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../../test-temp', `edge-cases-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    const config = {
      maxFileSize: 50, // Very small for testing
      maxFilesPerFolder: 3,
      duplicateSimilarityThreshold: 0.8,
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.*'],
      createBackups: true,
      stopOnError: false
    };
    
    refactoringSystem = new IntegratedRefactoringSystem(testDir, config);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Complex Generic Patterns', () => {
    it('should preserve complex generic types during refactoring', async () => {
      const complexGenericContent = `
// Complex generic utility types that should be preserved
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type ConditionalType<T> = T extends string 
  ? T extends \`prefix-\${infer U}\`
    ? U extends 'special'
      ? { type: 'very-special'; value: U }
      : { type: 'normal'; value: U }
    : { type: 'no-prefix'; value: T }
  : never;

export type RecursiveTree<T> = {
  value: T;
  children: RecursiveTree<T>[];
  parent?: RecursiveTree<T>;
};

export interface ComplexGeneric<
  T extends Record<string, any>,
  U extends keyof T,
  V extends T[U]
> {
  process<K extends keyof T>(
    data: Pick<T, K>,
    selector: U,
    transformer: (value: T[U]) => V
  ): Promise<{ [P in K]: T[P] } & { result: V }>;
}

// Simple utility that can be split
export const simpleUtil = (x: number) => x * 2;
export const anotherUtil = (s: string) => s.toUpperCase();
`;

      await fs.mkdir(path.join(testDir, 'src', 'types'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'types', 'complexTypes.ts'),
        complexGenericContent
      );

      const report = await refactoringSystem.executeRefactoring();

      expect(report.success).toBe(true);
      
      // Verify the complex types file still exists and contains the complex patterns
      const complexTypesExists = await fs.access(
        path.join(testDir, 'src', 'types', 'complexTypes.ts')
      ).then(() => true).catch(() => false);
      
      expect(complexTypesExists).toBe(true);
      
      if (complexTypesExists) {
        const content = await fs.readFile(
          path.join(testDir, 'src', 'types', 'complexTypes.ts'),
          'utf8'
        );
        
        // Complex patterns should be preserved
        expect(content).toContain('DeepPartial');
        expect(content).toContain('ConditionalType');
        expect(content).toContain('RecursiveTree');
        expect(content).toContain('ComplexGeneric');
      }
    }, 30000);

    it('should handle template literal types correctly', async () => {
      const templateLiteralContent = `
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type APIEndpoint<T extends HTTPMethod> = \`\${T} /api/\${string}\`;

export type EventName<T extends string> = \`on\${Capitalize<T>}\`;

export type CSSCustomProperty<T extends string> = \`--\${T}\`;

export type ComplexTemplate<
  T extends string,
  U extends string,
  V extends number
> = \`\${T}-\${U}-\${V}\`;

// This should be splittable
export const processEndpoint = (endpoint: string) => {
  return endpoint.split(' ');
};

export const formatEventName = (name: string) => {
  return \`on\${name.charAt(0).toUpperCase()}\${name.slice(1)}\`;
};
`;

      await fs.mkdir(path.join(testDir, 'src', 'types'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'types', 'templateTypes.ts'),
        templateLiteralContent
      );

      const report = await refactoringSystem.executeRefactoring();

      expect(report.success).toBe(true);
      
      // Template literal types should be preserved
      const originalExists = await fs.access(
        path.join(testDir, 'src', 'types', 'templateTypes.ts')
      ).then(() => true).catch(() => false);
      
      expect(originalExists).toBe(true);
    }, 30000);
  });

  describe('Decorator Patterns', () => {
    it('should preserve decorated classes and methods', async () => {
      const decoratorContent = `
function Component(config: { selector: string; template?: string }) {
  return function<T extends new (...args: any[]) => any>(constructor: T) {
    return class extends constructor {
      selector = config.selector;
      template = config.template;
    };
  };
}

function Injectable(token?: string) {
  return function(target: any) {
    target.injectable = true;
    target.token = token;
  };
}

function Method(description: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = true;
  };
}

@Component({ 
  selector: 'app-complex',
  template: '<div>Complex Component</div>'
})
export class ComplexComponent {
  @Injectable('data-service')
  private dataService: any;

  @Method('Processes complex data')
  processData(data: any[]): any[] {
    return data.filter(item => item.active);
  }

  @Method('Validates input')
  validateInput(input: string): boolean {
    return input.length > 0;
  }
}

// This utility should be splittable
export const formatData = (data: any) => JSON.stringify(data, null, 2);
export const parseData = (json: string) => JSON.parse(json);
`;

      await fs.mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'components', 'decoratedComponent.ts'),
        decoratorContent
      );

      const report = await refactoringSystem.executeRefactoring();

      expect(report.success).toBe(true);
      
      // Decorated class should be preserved in original file
      const originalExists = await fs.access(
        path.join(testDir, 'src', 'components', 'decoratedComponent.ts')
      ).then(() => true).catch(() => false);
      
      expect(originalExists).toBe(true);
      
      if (originalExists) {
        const content = await fs.readFile(
          path.join(testDir, 'src', 'components', 'decoratedComponent.ts'),
          'utf8'
        );
        
        // Decorated elements should be preserved
        expect(content).toContain('@Component');
        expect(content).toContain('@Injectable');
        expect(content).toContain('@Method');
        expect(content).toContain('ComplexComponent');
      }
    }, 30000);
  });

  describe('Namespace and Module Augmentation', () => {
    it('should handle namespace declarations correctly', async () => {
      const namespaceContent = `
export namespace Utils {
  export interface Config {
    debug: boolean;
    apiUrl: string;
  }
  
  export class Logger {
    private config: Config;
    
    constructor(config: Config) {
      this.config = config;
    }
    
    log(message: string): void {
      if (this.config.debug) {
        console.log(\`[\${new Date().toISOString()}] \${message}\`);
      }
    }
    
    error(message: string, error?: Error): void {
      console.error(\`[\${new Date().toISOString()}] ERROR: \${message}\`, error);
    }
  }
  
  export namespace Internal {
    export const SECRET_KEY = 'internal-secret';
    
    export function encrypt(data: string): string {
      return btoa(data + SECRET_KEY);
    }
    
    export function decrypt(encrypted: string): string {
      return atob(encrypted).replace(SECRET_KEY, '');
    }
  }
  
  export const createLogger = (config: Config): Logger => {
    return new Logger(config);
  };
}

declare module 'external-lib' {
  interface ExternalInterface {
    newMethod(param: string): void;
  }
  
  namespace ExternalNamespace {
    interface Config {
      extended: boolean;
    }
  }
}

// Simple utilities that could be split
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};
`;

      await fs.mkdir(path.join(testDir, 'src', 'utils'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'utils', 'namespaceUtils.ts'),
        namespaceContent
      );

      const report = await refactoringSystem.executeRefactoring();

      expect(report.success).toBe(true);
      
      // Namespace should be preserved
      const originalExists = await fs.access(
        path.join(testDir, 'src', 'utils', 'namespaceUtils.ts')
      ).then(() => true).catch(() => false);
      
      expect(originalExists).toBe(true);
      
      if (originalExists) {
        const content = await fs.readFile(
          path.join(testDir, 'src', 'utils', 'namespaceUtils.ts'),
          'utf8'
        );
        
        expect(content).toContain('namespace Utils');
        expect(content).toContain('namespace Internal');
        expect(content).toContain('declare module');
      }
    }, 30000);
  });

  describe('Mixed Complex Patterns', () => {
    it('should handle files with multiple complex patterns', async () => {
      const mixedComplexContent = `
// Conditional type with template literals
export type RoutePattern<T extends string> = T extends \`/\${infer Path}\`
  ? Path extends \`\${infer Segment}/\${infer Rest}\`
    ? { segment: Segment; rest: RoutePattern<\`/\${Rest}\`> }
    : { segment: Path; rest: null }
  : never;

// Recursive type with mapped types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object 
    ? T[P] extends Function 
      ? T[P] 
      : DeepReadonly<T[P]>
    : T[P];
};

// Generic class with decorators
@Injectable()
export class GenericRepository<T extends { id: string }> {
  private items: Map<string, T> = new Map();
  
  @Method('Adds item to repository')
  add(item: T): void {
    this.items.set(item.id, item);
  }
  
  @Method('Finds item by ID')
  findById(id: string): T | undefined {
    return this.items.get(id);
  }
  
  @Method('Gets all items')
  getAll(): T[] {
    return Array.from(this.items.values());
  }
}

// Namespace with complex generics
export namespace TypeUtils {
  export type ExtractArrayType<T> = T extends (infer U)[] ? U : never;
  
  export type FunctionReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
  
  export interface TypeGuard<T> {
    (value: unknown): value is T;
  }
  
  export function createTypeGuard<T>(
    validator: (value: unknown) => boolean
  ): TypeGuard<T> {
    return (value: unknown): value is T => validator(value);
  }
}

// Simple functions that could be extracted
export const add = (a: number, b: number): number => a + b;
export const multiply = (a: number, b: number): number => a * b;
export const divide = (a: number, b: number): number => a / b;
`;

      await fs.mkdir(path.join(testDir, 'src', 'advanced'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'advanced', 'mixedComplex.ts'),
        mixedComplexContent
      );

      const report = await refactoringSystem.executeRefactoring();

      expect(report.success).toBe(true);
      
      // File should still exist with complex patterns preserved
      const originalExists = await fs.access(
        path.join(testDir, 'src', 'advanced', 'mixedComplex.ts')
      ).then(() => true).catch(() => false);
      
      expect(originalExists).toBe(true);
      
      if (originalExists) {
        const content = await fs.readFile(
          path.join(testDir, 'src', 'advanced', 'mixedComplex.ts'),
          'utf8'
        );
        
        // Complex patterns should be preserved
        expect(content).toContain('RoutePattern');
        expect(content).toContain('DeepReadonly');
        expect(content).toContain('@Injectable');
        expect(content).toContain('GenericRepository');
        expect(content).toContain('namespace TypeUtils');
      }
    }, 30000);
  });

  describe('Error Handling with Malformed TypeScript', () => {
    it('should handle syntax errors gracefully', async () => {
      const malformedContent = `
// Incomplete generic
export type Incomplete<T extends 

// Missing closing brace
export interface MissingBrace {
  prop: string

// Invalid conditional type
export type Invalid = T extends string ? 

// Unclosed template literal
export type Template = \`prefix-\${string

// Valid code mixed in
export const validFunction = (x: number) => x * 2;

// Another syntax error
export class MissingMethod {
  method(
`;

      await fs.mkdir(path.join(testDir, 'src', 'broken'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'broken', 'malformed.ts'),
        malformedContent
      );

      // Should not throw an error, should handle gracefully
      const report = await refactoringSystem.executeRefactoring();

      // Should complete even with syntax errors
      expect(report).toBeDefined();
      expect(typeof report.success).toBe('boolean');
      
      // May have errors but should not crash
      if (!report.success) {
        expect(Array.isArray(report.errors)).toBe(true);
        expect(report.errors.length).toBeGreaterThan(0);
      }
    }, 30000);

    it('should handle circular dependencies in types', async () => {
      const circularContent = `
export interface NodeA {
  value: string;
  nodeB: NodeB;
}

export interface NodeB {
  value: number;
  nodeA: NodeA;
}

export type CircularType<T> = {
  value: T;
  next: CircularType<T> | null;
};

// This creates a circular reference
export const createCircular = (): NodeA => {
  const nodeA: NodeA = {} as NodeA;
  const nodeB: NodeB = { value: 42, nodeA };
  nodeA.value = 'test';
  nodeA.nodeB = nodeB;
  return nodeA;
};
`;

      await fs.mkdir(path.join(testDir, 'src', 'circular'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'circular', 'circularTypes.ts'),
        circularContent
      );

      const report = await refactoringSystem.executeRefactoring();

      expect(report.success).toBe(true);
      
      // Circular types should be preserved together
      const originalExists = await fs.access(
        path.join(testDir, 'src', 'circular', 'circularTypes.ts')
      ).then(() => true).catch(() => false);
      
      expect(originalExists).toBe(true);
    }, 30000);
  });

  describe('Performance with Complex Patterns', () => {
    it('should handle large files with complex patterns efficiently', async () => {
      // Create a large file with many complex patterns
      let complexContent = `
// File with many complex TypeScript patterns
`;

      // Add many conditional types
      for (let i = 0; i < 20; i++) {
        complexContent += `
export type ConditionalType${i}<T> = T extends string 
  ? T extends \`prefix${i}-\${infer U}\`
    ? { type: 'match${i}'; value: U }
    : { type: 'no-match${i}'; value: T }
  : never;
`;
      }

      // Add many mapped types
      for (let i = 0; i < 15; i++) {
        complexContent += `
export type MappedType${i}<T> = {
  [K in keyof T as \`\${string & K}_${i}\`]: T[K];
};
`;
      }

      // Add many generic interfaces
      for (let i = 0; i < 25; i++) {
        complexContent += `
export interface GenericInterface${i}<T extends Record<string, any>> {
  process${i}(data: T): Promise<T>;
  validate${i}(input: T): boolean;
}
`;
      }

      await fs.mkdir(path.join(testDir, 'src', 'large'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'large', 'largeComplex.ts'),
        complexContent
      );

      const startTime = Date.now();
      const report = await refactoringSystem.executeRefactoring();
      const executionTime = Date.now() - startTime;

      expect(report.success).toBe(true);
      expect(executionTime).toBeLessThan(60000); // Should complete within 1 minute
      
      // File should still exist (complex patterns preserved)
      const originalExists = await fs.access(
        path.join(testDir, 'src', 'large', 'largeComplex.ts')
      ).then(() => true).catch(() => false);
      
      expect(originalExists).toBe(true);
    }, 90000); // 90 second timeout for large file
  });
});

// Helper function to create decorator functions for testing
function Injectable(token?: string) {
  return function(target: any) {
    target.injectable = true;
    target.token = token;
  };
}

function Method(description: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = true;
  };
}