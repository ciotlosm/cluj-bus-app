/**
 * Tests for transformation pipeline infrastructure
 * 
 * Validates Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect } from 'vitest';
import {
  TransformationPipeline,
  TransformationError,
  createSuccessValidation,
  createFailureValidation,
  createValidationError,
  createValidationWarning,
  isTransformationError,
  isValidationFailure,
  isValidationSuccess,
} from './transformationPipeline';
import type { TransformationStep, TransformationValidationResult } from './transformationPipeline';
import type { TransformationContext } from './presentationLayer';

describe('TransformationPipeline', () => {
  // Mock transformation context
  const mockContext: TransformationContext = {
    favoriteRoutes: [],
    targetStations: [],
    preferences: {
      theme: 'light',
      refreshRate: 30,
      maxVehiclesPerStation: 5,
      showAllVehiclesPerRoute: false,
      sortByPriority: true,
      enableNotifications: false,
      notificationRadius: 500,
      language: 'en',
      units: 'metric',
    },
    timestamp: new Date(),
  };

  describe('basic pipeline operations', () => {
    it('should create an empty pipeline', () => {
      const pipeline = new TransformationPipeline();
      expect(pipeline.stepCount).toBe(0);
      expect(pipeline.getStepNames()).toEqual([]);
    });

    it('should add steps to the pipeline', () => {
      const pipeline = new TransformationPipeline();
      
      const step1: TransformationStep<string, string> = {
        name: 'step1',
        transform: (input) => input.toUpperCase(),
      };

      const step2: TransformationStep<string, number> = {
        name: 'step2',
        transform: (input) => input.length,
      };

      pipeline.addStep(step1).addStep(step2);

      expect(pipeline.stepCount).toBe(2);
      expect(pipeline.getStepNames()).toEqual(['step1', 'step2']);
    });

    it('should clear all steps', () => {
      const pipeline = new TransformationPipeline();
      
      const step: TransformationStep<string, string> = {
        name: 'test',
        transform: (input) => input,
      };

      pipeline.addStep(step);
      expect(pipeline.stepCount).toBe(1);

      pipeline.clear();
      expect(pipeline.stepCount).toBe(0);
      expect(pipeline.getStepNames()).toEqual([]);
    });
  });

  describe('pipeline execution', () => {
    it('should execute a single step', () => {
      const pipeline = new TransformationPipeline();
      
      const step: TransformationStep<string, string> = {
        name: 'uppercase',
        transform: (input) => input.toUpperCase(),
      };

      pipeline.addStep(step);
      
      const result = pipeline.execute('hello', mockContext);
      expect(result).toBe('HELLO');
    });

    it('should execute multiple steps in sequence', () => {
      const pipeline = new TransformationPipeline();
      
      const step1: TransformationStep<string, string> = {
        name: 'uppercase',
        transform: (input) => input.toUpperCase(),
      };

      const step2: TransformationStep<string, string> = {
        name: 'addPrefix',
        transform: (input) => `PREFIX_${input}`,
      };

      const step3: TransformationStep<string, number> = {
        name: 'getLength',
        transform: (input) => input.length,
      };

      pipeline.addStep(step1).addStep(step2).addStep(step3);
      
      const result = pipeline.execute('hello', mockContext);
      expect(result).toBe(12); // "PREFIX_HELLO".length
    });

    it('should handle empty pipeline', () => {
      const pipeline = new TransformationPipeline();
      
      const result = pipeline.execute('test', mockContext);
      expect(result).toBe('test');
    });
  });

  describe('validation', () => {
    it('should validate input before transformation', () => {
      const pipeline = new TransformationPipeline();
      
      const step: TransformationStep<string, string> = {
        name: 'requireNonEmpty',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return createFailureValidation([
              createValidationError('input', 'Input cannot be empty', 'EMPTY_INPUT')
            ]);
          }
          return createSuccessValidation();
        },
        transform: (input) => input.toUpperCase(),
      };

      pipeline.addStep(step);
      
      // Valid input should work
      expect(pipeline.execute('hello', mockContext)).toBe('HELLO');
      
      // Invalid input should throw
      expect(() => pipeline.execute('', mockContext)).toThrow(TransformationError);
      expect(() => pipeline.execute('   ', mockContext)).toThrow(TransformationError);
    });

    it('should include validation errors in TransformationError', () => {
      const pipeline = new TransformationPipeline();
      
      const step: TransformationStep<string, string> = {
        name: 'validate',
        validate: (input) => createFailureValidation([
          createValidationError('field1', 'Error 1', 'ERR1'),
          createValidationError('field2', 'Error 2', 'ERR2'),
        ]),
        transform: (input) => input,
      };

      pipeline.addStep(step);
      
      try {
        pipeline.execute('test', mockContext);
        expect.fail('Should have thrown TransformationError');
      } catch (error) {
        expect(isTransformationError(error)).toBe(true);
        if (isTransformationError(error)) {
          expect(error.step).toBe('validate');
          expect(error.message).toContain('field1: Error 1');
          expect(error.message).toContain('field2: Error 2');
          expect(error.recoverable).toBe(false);
        }
      }
    });
  });

  describe('error handling', () => {
    it('should wrap thrown errors in TransformationError', () => {
      const pipeline = new TransformationPipeline();
      
      const step: TransformationStep<string, string> = {
        name: 'throwError',
        transform: () => {
          throw new Error('Something went wrong');
        },
      };

      pipeline.addStep(step);
      
      try {
        pipeline.execute('test', mockContext);
        expect.fail('Should have thrown TransformationError');
      } catch (error) {
        expect(isTransformationError(error)).toBe(true);
        if (isTransformationError(error)) {
          expect(error.step).toBe('throwError');
          expect(error.message).toBe('Something went wrong');
          expect(error.cause?.message).toBe('Something went wrong');
          expect(error.recoverable).toBe(false);
        }
      }
    });

    it('should preserve TransformationError when re-thrown', () => {
      const pipeline = new TransformationPipeline();
      
      const originalError = new TransformationError(
        'Original error',
        'originalStep',
        { recoverable: true, vehicleId: 'vehicle123' }
      );

      const step: TransformationStep<string, string> = {
        name: 'rethrowError',
        transform: () => {
          throw originalError;
        },
      };

      pipeline.addStep(step);
      
      try {
        pipeline.execute('test', mockContext);
        expect.fail('Should have thrown TransformationError');
      } catch (error) {
        expect(error).toBe(originalError);
        expect(isTransformationError(error)).toBe(true);
        if (isTransformationError(error)) {
          expect(error.step).toBe('originalStep');
          expect(error.vehicleId).toBe('vehicle123');
          expect(error.recoverable).toBe(true);
        }
      }
    });
  });
});

describe('TransformationError', () => {
  it('should create error with basic properties', () => {
    const error = new TransformationError('Test message', 'testStep');
    
    expect(error.name).toBe('TransformationError');
    expect(error.message).toBe('Test message');
    expect(error.step).toBe('testStep');
    expect(error.vehicleId).toBeUndefined();
    expect(error.recoverable).toBe(false);
    expect(error.context).toEqual({});
    expect(error.cause).toBeUndefined();
  });

  it('should create error with all options', () => {
    const cause = new Error('Cause error');
    const context = { key: 'value' };
    
    const error = new TransformationError('Test message', 'testStep', {
      vehicleId: 'vehicle123',
      recoverable: true,
      context,
      cause,
    });
    
    expect(error.vehicleId).toBe('vehicle123');
    expect(error.recoverable).toBe(true);
    expect(error.context).toBe(context);
    expect(error.cause).toBe(cause);
  });

  it('should generate detailed string representation', () => {
    const error = new TransformationError('Test message', 'testStep', {
      vehicleId: 'vehicle123',
      recoverable: true,
      context: { key: 'value' },
      cause: new Error('Cause error'),
    });
    
    const detailed = error.toDetailedString();
    
    expect(detailed).toContain('TransformationError in step "testStep": Test message');
    expect(detailed).toContain('Vehicle ID: vehicle123');
    expect(detailed).toContain('Recoverable: true');
    expect(detailed).toContain('Context: {');
    expect(detailed).toContain('"key": "value"');
    expect(detailed).toContain('Caused by: Cause error');
  });
});

describe('validation helpers', () => {
  it('should create success validation', () => {
    const result = createSuccessValidation();
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(isValidationSuccess(result)).toBe(true);
    expect(isValidationFailure(result)).toBe(false);
  });

  it('should create failure validation', () => {
    const errors = [createValidationError('field', 'message', 'code')];
    const warnings = [createValidationWarning('field', 'warning', 'code')];
    
    const result = createFailureValidation(errors, warnings);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toBe(errors);
    expect(result.warnings).toBe(warnings);
    expect(isValidationSuccess(result)).toBe(false);
    expect(isValidationFailure(result)).toBe(true);
  });

  it('should create validation error', () => {
    const error = createValidationError('testField', 'Test message', 'TEST_CODE', { extra: 'data' });
    
    expect(error.field).toBe('testField');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.severity).toBe('error');
    expect(error.metadata).toEqual({ extra: 'data' });
  });

  it('should create validation warning', () => {
    const warning = createValidationWarning(
      'testField',
      'Test warning',
      'TEST_CODE',
      'Try this instead',
      { extra: 'data' }
    );
    
    expect(warning.field).toBe('testField');
    expect(warning.message).toBe('Test warning');
    expect(warning.code).toBe('TEST_CODE');
    expect(warning.suggestion).toBe('Try this instead');
    expect(warning.metadata).toEqual({ extra: 'data' });
  });
});

describe('type guards', () => {
  it('should identify TransformationError', () => {
    const transformationError = new TransformationError('message', 'step');
    const regularError = new Error('message');
    const notAnError = { message: 'not an error' };
    
    expect(isTransformationError(transformationError)).toBe(true);
    expect(isTransformationError(regularError)).toBe(false);
    expect(isTransformationError(notAnError)).toBe(false);
    expect(isTransformationError(null)).toBe(false);
    expect(isTransformationError(undefined)).toBe(false);
  });

  it('should identify validation results', () => {
    const success = createSuccessValidation();
    const failure = createFailureValidation([createValidationError('field', 'message', 'code')]);
    
    expect(isValidationSuccess(success)).toBe(true);
    expect(isValidationFailure(success)).toBe(false);
    
    expect(isValidationSuccess(failure)).toBe(false);
    expect(isValidationFailure(failure)).toBe(true);
  });
});