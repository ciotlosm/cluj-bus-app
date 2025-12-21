import type { 
  ValidationResult, 
  ValidationError
} from './types';
import { logger } from '../../../utils/shared/logger';

/**
 * Unified input validation class that consolidates validation logic
 * across all hooks to eliminate duplication.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class InputValidator {
  /**
   * Validates any input against a provided validator function
   */
  static validate<T>(
    input: unknown,
    validator: (value: unknown) => boolean,
    fieldName: string,
    errorMessage?: string
  ): ValidationResult<T> {
    const errors: ValidationError[] = [];
    
    try {
      const isValid = validator(input);
      
      if (!isValid) {
        errors.push({
          field: fieldName,
          message: errorMessage || `Invalid ${fieldName}`,
          code: 'VALIDATION_FAILED'
        });
        
        return {
          isValid: false,
          data: null,
          errors
        };
      }
      
      return {
        isValid: true,
        data: input as T,
        errors: []
      };
    } catch (error) {
      errors.push({
        field: fieldName,
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR'
      });
      
      return {
        isValid: false,
        data: null,
        errors
      };
    }
  }

  /**
   * Validates that input is a non-empty string
   */
  static validateString(
    input: unknown, 
    fieldName: string,
    minLength: number = 1
  ): ValidationResult<string> {
    return this.validate<string>(
      input,
      (value) => {
        return typeof value === 'string' && 
               value.trim().length >= minLength;
      },
      fieldName,
      `${fieldName} must be a string with at least ${minLength} characters`
    );
  }

  /**
   * Validates that input is a valid number within optional bounds
   */
  static validateNumber(
    input: unknown,
    fieldName: string,
    min?: number,
    max?: number
  ): ValidationResult<number> {
    return this.validate<number>(
      input,
      (value) => {
        if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
          return false;
        }
        
        if (min !== undefined && value < min) return false;
        if (max !== undefined && value > max) return false;
        
        return true;
      },
      fieldName,
      `${fieldName} must be a valid number${min !== undefined ? ` >= ${min}` : ''}${max !== undefined ? ` <= ${max}` : ''}`
    );
  }

  /**
   * Validates that input is a valid boolean
   */
  static validateBoolean(
    input: unknown,
    fieldName: string
  ): ValidationResult<boolean> {
    return this.validate<boolean>(
      input,
      (value) => typeof value === 'boolean',
      fieldName,
      `${fieldName} must be a boolean`
    );
  }

  /**
   * Validates that input is a valid Date object
   */
  static validateDate(
    input: unknown,
    fieldName: string
  ): ValidationResult<Date> {
    return this.validate<Date>(
      input,
      (value) => {
        return value instanceof Date && !isNaN(value.getTime());
      },
      fieldName,
      `${fieldName} must be a valid Date object`
    );
  }

  /**
   * Validates that input is an object with required properties
   */
  static validateObject<T = Record<string, unknown>>(
    input: unknown,
    fieldName: string,
    requiredProperties: string[] = []
  ): ValidationResult<T> {
    return this.validate<T>(
      input,
      (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return false;
        }
        
        const obj = value as Record<string, unknown>;
        return requiredProperties.every(prop => prop in obj);
      },
      fieldName,
      `${fieldName} must be an object${requiredProperties.length > 0 ? ` with properties: ${requiredProperties.join(', ')}` : ''}`
    );
  }

  /**
   * Validates multiple fields and returns combined result
   */
  static validateMultiple<T = Record<string, unknown>>(
    validations: Array<() => ValidationResult<unknown>>
  ): ValidationResult<T> {
    const allErrors: ValidationError[] = [];
    const results: unknown[] = [];
    
    for (const validation of validations) {
      const result = validation();
      if (!result.isValid) {
        allErrors.push(...result.errors);
      } else {
        results.push(result.data);
      }
    }
    
    if (allErrors.length > 0) {
      return {
        isValid: false,
        data: null,
        errors: allErrors
      };
    }
    
    return {
      isValid: true,
      data: results as unknown as T,
      errors: []
    };
  }

  /**
   * Logs validation errors with context
   */
  static logValidationErrors(
    errors: ValidationError[],
    context: string,
    input?: unknown
  ): void {
    if (errors.length > 0) {
      logger.warn(`Validation failed in ${context}`, {
        errors: errors.map(e => ({
          field: e.field,
          message: e.message,
          code: e.code
        })),
        inputType: typeof input,
        inputConstructor: input?.constructor?.name
      });
    }
  }

  /**
   * Creates a validation result for successful validation
   */
  static success<T>(data: T): ValidationResult<T> {
    return {
      isValid: true,
      data,
      errors: []
    };
  }

  /**
   * Creates a validation result for failed validation
   */
  static failure<T>(
    fieldName: string,
    message: string,
    code: string = 'VALIDATION_FAILED'
  ): ValidationResult<T> {
    return {
      isValid: false,
      data: null,
      errors: [{
        field: fieldName,
        message,
        code
      }]
    };
  }
}