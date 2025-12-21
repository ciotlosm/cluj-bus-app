/**
 * Transformation Pipeline Infrastructure
 * 
 * This module provides the core infrastructure for the vehicle data transformation pipeline.
 * It implements a composable, type-safe pipeline architecture for transforming raw API data
 * into UI-ready formats.
 * 
 * Validates Requirements: 2.1, 2.2, 2.3
 * 
 * @module transformationPipeline
 */

import type { TransformationContext } from './presentationLayer';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
  metadata?: Record<string, any>;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
  metadata?: Record<string, any>;
}

/**
 * Result of transformation validation operation
 */
export interface TransformationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Custom error type for transformation pipeline failures
 * 
 * Extends the standard Error class with additional context about the transformation
 * step that failed, the vehicle being processed, and whether the error is recoverable.
 */
export class TransformationError extends Error {
  /**
   * Name of the transformation step where the error occurred
   */
  readonly step: string;

  /**
   * ID of the vehicle being processed when the error occurred (if applicable)
   */
  readonly vehicleId?: string;

  /**
   * Whether the error is recoverable and processing can continue
   */
  readonly recoverable: boolean;

  /**
   * Additional context about the error
   */
  readonly context: Record<string, any>;

  /**
   * Original error that caused this transformation error (if any)
   */
  readonly cause?: Error;

  constructor(
    message: string,
    step: string,
    options: {
      vehicleId?: string;
      recoverable?: boolean;
      context?: Record<string, any>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'TransformationError';
    this.step = step;
    this.vehicleId = options.vehicleId;
    this.recoverable = options.recoverable ?? false;
    this.context = options.context ?? {};
    this.cause = options.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TransformationError);
    }
  }

  /**
   * Creates a formatted error message with all context
   */
  toDetailedString(): string {
    const parts = [
      `TransformationError in step "${this.step}": ${this.message}`,
    ];

    if (this.vehicleId) {
      parts.push(`Vehicle ID: ${this.vehicleId}`);
    }

    parts.push(`Recoverable: ${this.recoverable}`);

    if (Object.keys(this.context).length > 0) {
      parts.push(`Context: ${JSON.stringify(this.context, null, 2)}`);
    }

    if (this.cause) {
      parts.push(`Caused by: ${this.cause.message}`);
    }

    return parts.join('\n');
  }
}

// ============================================================================
// TRANSFORMATION STEP INTERFACE
// ============================================================================

/**
 * Represents a single step in the transformation pipeline
 * 
 * Each step is responsible for transforming input data of type TInput
 * into output data of type TOutput. Steps can optionally validate their
 * input before processing.
 * 
 * @template TInput - The type of data this step accepts as input
 * @template TOutput - The type of data this step produces as output
 */
export interface TransformationStep<TInput, TOutput> {
  /**
   * Unique name identifying this transformation step
   * Used for error reporting and debugging
   */
  name: string;

  /**
   * Transforms input data into output data
   * 
   * @param input - The data to transform
   * @param context - Contextual information needed for transformation
   * @returns The transformed data
   * @throws {TransformationError} If transformation fails
   */
  transform(input: TInput, context: TransformationContext): TOutput;

  /**
   * Optional validation function to check input before transformation
   * 
   * @param input - The data to validate
   * @returns Validation result indicating whether input is valid
   */
  validate?(input: TInput): TransformationValidationResult;
}

// ============================================================================
// TRANSFORMATION PIPELINE CLASS
// ============================================================================

/**
 * Composable transformation pipeline for processing vehicle data
 * 
 * The pipeline executes a series of transformation steps in sequence,
 * passing the output of each step as input to the next. It provides
 * error handling, validation, and context propagation.
 * 
 * Example usage:
 * ```typescript
 * const pipeline = new TransformationPipeline()
 *   .addStep(normalizeApiDataStep)
 *   .addStep(enrichWithScheduleStep)
 *   .addStep(generateDisplayDataStep);
 * 
 * const result = pipeline.execute(rawApiData, context);
 * ```
 */
export class TransformationPipeline {
  private steps: TransformationStep<any, any>[] = [];

  /**
   * Adds a transformation step to the pipeline
   * 
   * Steps are executed in the order they are added.
   * 
   * @param step - The transformation step to add
   * @returns This pipeline instance for method chaining
   */
  addStep<TInput, TOutput>(step: TransformationStep<TInput, TOutput>): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Executes the transformation pipeline
   * 
   * Processes the input through all registered steps in sequence.
   * If a step has a validate method, it will be called before transformation.
   * If validation fails, a TransformationError is thrown.
   * 
   * @param input - The initial input data
   * @param context - Contextual information for transformations
   * @returns The final transformed output
   * @throws {TransformationError} If any step fails or validation fails
   */
  execute<TInput, TOutput>(input: TInput, context: TransformationContext): TOutput {
    let currentData: any = input;

    for (const step of this.steps) {
      try {
        // Validate input if validation function is provided
        if (step.validate) {
          const validationResult = step.validate(currentData);
          if (!validationResult.isValid) {
            const errorMessages = validationResult.errors
              .map(e => `${e.field}: ${e.message}`)
              .join(', ');
            
            throw new TransformationError(
              `Validation failed: ${errorMessages}`,
              step.name,
              {
                recoverable: false,
                context: {
                  errors: validationResult.errors,
                  warnings: validationResult.warnings,
                },
              }
            );
          }
        }

        // Execute transformation
        currentData = step.transform(currentData, context);
      } catch (error) {
        // If it's already a TransformationError, re-throw it
        if (error instanceof TransformationError) {
          throw error;
        }

        // Otherwise, wrap it in a TransformationError
        throw new TransformationError(
          error instanceof Error ? error.message : 'Unknown error during transformation',
          step.name,
          {
            recoverable: false,
            cause: error instanceof Error ? error : undefined,
            context: {
              inputType: typeof currentData,
              hasInput: currentData !== null && currentData !== undefined,
            },
          }
        );
      }
    }

    return currentData as TOutput;
  }

  /**
   * Returns the number of steps in the pipeline
   */
  get stepCount(): number {
    return this.steps.length;
  }

  /**
   * Returns the names of all steps in the pipeline
   */
  getStepNames(): string[] {
    return this.steps.map(step => step.name);
  }

  /**
   * Clears all steps from the pipeline
   */
  clear(): void {
    this.steps = [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a validation result indicating success
 */
export function createSuccessValidation(): TransformationValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}

/**
 * Creates a validation result indicating failure
 */
export function createFailureValidation(
  errors: ValidationError[],
  warnings: ValidationWarning[] = []
): TransformationValidationResult {
  return {
    isValid: false,
    errors,
    warnings,
  };
}

/**
 * Creates a validation error
 */
export function createValidationError(
  field: string,
  message: string,
  code: string,
  metadata?: Record<string, any>
): ValidationError {
  return {
    field,
    message,
    code,
    severity: 'error',
    metadata,
  };
}

/**
 * Creates a validation warning
 */
export function createValidationWarning(
  field: string,
  message: string,
  code: string,
  suggestion?: string,
  metadata?: Record<string, any>
): ValidationWarning {
  return {
    field,
    message,
    code,
    suggestion,
    metadata,
  };
}

/**
 * Type guard to check if an error is a TransformationError
 */
export function isTransformationError(error: unknown): error is TransformationError {
  return error instanceof TransformationError;
}

/**
 * Type guard to check if a validation result indicates failure
 */
export function isValidationFailure(result: TransformationValidationResult): boolean {
  return !result.isValid;
}

/**
 * Type guard to check if a validation result indicates success
 */
export function isValidationSuccess(result: TransformationValidationResult): boolean {
  return result.isValid;
}
