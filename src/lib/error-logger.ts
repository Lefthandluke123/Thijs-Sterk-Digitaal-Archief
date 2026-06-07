/**
 * Centralized error logging utility
 * Ensures all errors are logged to console.error for debugging
 */

export function logError(context: string, error: unknown, details?: any) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${context}]`, errorMessage, { stack, details });
  
  // Return a safe fallback value based on context
  return undefined;
}

export function logErrorAndReturn<T>(context: string, error: unknown, fallback: T, details?: any): T {
  logError(context, error, details);
  return fallback;
}