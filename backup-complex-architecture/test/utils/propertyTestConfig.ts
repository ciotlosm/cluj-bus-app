import * as fc from 'fast-check';

/**
 * Standard configuration for property-based tests
 */
export const propertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 100, // Minimum iterations per property as specified in design
  timeout: 5000, // 5 second timeout per property
  verbose: true, // Detailed failure reporting
  seed: undefined, // Use random seed for each run
  path: undefined, // No specific path
  logger: undefined, // Use default logger
  interruptAfterTimeLimit: 5000, // Interrupt after 5 seconds
  markInterruptAsFailure: false, // Don't mark timeout as failure
  skipAllAfterTimeLimit: 10000, // Skip all tests after 10 seconds
  ignoreEqualValues: false, // Don't ignore equal values
  reporter: undefined, // Use default reporter
  asyncReporter: undefined, // Use default async reporter
  examples: [], // No predefined examples
  endOnFailure: false, // Continue testing after failure
  skipEqualValues: false // Don't skip equal values
};

/**
 * Fast configuration for quick tests during development
 */
export const fastPropertyTestConfig: fc.Parameters<unknown> = {
  ...propertyTestConfig,
  numRuns: 10, // Fewer runs for faster feedback
  timeout: 1000 // Shorter timeout
};

/**
 * Thorough configuration for comprehensive testing
 */
export const thoroughPropertyTestConfig: fc.Parameters<unknown> = {
  ...propertyTestConfig,
  numRuns: 1000, // More runs for thorough testing
  timeout: 30000 // Longer timeout for complex properties
};

/**
 * Configuration for testing with shrinking enabled
 */
export const shrinkingPropertyTestConfig: fc.Parameters<unknown> = {
  ...propertyTestConfig,
  endOnFailure: true, // Stop on first failure to enable shrinking
  verbose: true // Enable verbose output for shrinking
};

/**
 * Helper function to run property tests with standard configuration
 */
export const runPropertyTest = <T>(
  property: fc.IProperty<T>,
  config: fc.Parameters<T> = propertyTestConfig as fc.Parameters<T>
) => {
  return fc.assert(property, config);
};

/**
 * Helper function to create a property test with standard configuration
 */
export const createPropertyTest = <T extends readonly unknown[]>(
  arbitraries: fc.Arbitrary<T[number]>[],
  predicate: (...args: T) => boolean | void,
  config: fc.Parameters<T> = propertyTestConfig as fc.Parameters<T>
) => {
  // Use fc.tuple to properly handle the arbitraries array
  const tupleArbitrary = fc.tuple(...arbitraries);
  const property = fc.property(tupleArbitrary, (args: T) => predicate(...args));
  return () => fc.assert(property, config);
};

/**
 * Timeout configuration for async property tests
 */
export const asyncPropertyTestConfig = {
  ...propertyTestConfig,
  timeout: 10000, // Longer timeout for async operations
  asyncReporter: (runDetails: fc.RunDetails<unknown>) => {
    if (runDetails.failed) {
      console.error('Property test failed:', runDetails.counterexample);
    }
  }
};