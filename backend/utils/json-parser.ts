/**
 * JSON Parser Utility
 * Provides robust JSON parsing for Python script outputs
 */
 
import { logger } from './logger.js';
 
/**
 * Parse JSON from Python script output, handling extra whitespace and multi-line output
 *
 * @param output - The raw output from Python script (stdout)
 * @param context - Context for logging (e.g., 'NDVI calculation')
 * @returns Parsed JSON object
 * @throws Error if JSON parsing fails
 */
export function parseJsonOutput<T>(output: string, context: string = 'Python script'): T {
  if (!output || typeof output !== 'string') {
    throw new Error(`Empty or invalid output from ${context}`);
  }
 
  // Trim whitespace and newlines
  const trimmed = output.trim();
 
  if (trimmed.length === 0) {
    throw new Error(`Empty output from ${context}`);
  }
 
  try {
    // Try to parse the entire output first (handles multi-line JSON with indent)
    return JSON.parse(trimmed) as T;
  } catch (firstError) {
    // If that fails, try to find JSON object in the output
    // Look for lines that start with { and end with }
    const lines = trimmed.split('\n');
 
    // Try to find a complete JSON object
    let jsonStart = -1;
    let jsonEnd = -1;
    let braceCount = 0;
 
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
 
      if (line.startsWith('{')) {
        if (jsonStart === -1) {
          jsonStart = i;
        }
        braceCount += (line.match(/{/g) || []).length;
      }
 
      if (line.includes('}')) {
        braceCount -= (line.match(/}/g) || []).length;
 
        if (jsonStart !== -1 && braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }
 
    // If we found a complete JSON object, try to parse it
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonLines = lines.slice(jsonStart, jsonEnd + 1);
      const jsonText = jsonLines.join('\n');
 
      try {
        return JSON.parse(jsonText) as T;
      } catch (secondError) {
        logger.error('Failed to parse extracted JSON', {
          context,
          jsonText: jsonText.substring(0, 500),
          error: secondError instanceof Error ? secondError.message : String(secondError),
        });
      }
    }
 
    // If all parsing attempts failed, throw error with details
    logger.error('Failed to parse JSON output', {
      context,
      output: trimmed.substring(0, 500),
      firstError: firstError instanceof Error ? firstError.message : String(firstError),
    });
 
    throw new Error(
      `Failed to parse JSON output from ${context}. ` +
      `Output may contain non-JSON content or be malformed. ` +
      `First 200 chars: ${trimmed.substring(0, 200)}`
    );
  }
}
 
/**
 * Validate that parsed result has expected structure
 *
 * @param result - The parsed result object
 * @param requiredFields - Array of required field names
 * @param context - Context for error messages
 * @throws Error if validation fails
 */
export function validateJsonStructure(
  result: Record<string, unknown>,
  requiredFields: string[],
  context: string = 'Result'
): void {
  if (!result || typeof result !== 'object') {
    throw new Error(`${context} is not a valid object`);
  }
 
  const missingFields = requiredFields.filter(field => !(field in result));
 
  if (missingFields.length > 0) {
    throw new Error(
      `${context} missing required fields: ${missingFields.join(', ')}`
    );
  }
}
