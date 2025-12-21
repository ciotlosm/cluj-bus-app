// Shared types for the validation library

export interface ValidationResult<T> {
  isValid: boolean;
  data: T | null;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CoordinateBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export interface SafeDefaultsConfig {
  useEmptyArrays?: boolean;
  useZeroCoordinates?: boolean;
  logWarnings?: boolean;
}