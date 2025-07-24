/**
 * Utility functions to convert between snake_case (database) and camelCase (JavaScript)
 */

/**
 * Convert a snake_case string to camelCase
 * @param {string} str - The snake_case string
 * @returns {string} - The camelCase string
 */
export const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * Convert a camelCase string to snake_case
 * @param {string} str - The camelCase string
 * @returns {string} - The snake_case string
 */
export const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Convert all keys in an object from snake_case to camelCase
 * @param {Object} obj - The object with snake_case keys
 * @returns {Object} - The object with camelCase keys
 */
export const convertKeysToCamelCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  if (typeof obj !== 'object') return obj;

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    converted[camelKey] = convertKeysToCamelCase(value);
  }
  return converted;
};

/**
 * Convert all keys in an object from camelCase to snake_case
 * @param {Object} obj - The object with camelCase keys
 * @returns {Object} - The object with snake_case keys
 */
export const convertKeysToSnakeCase = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToSnakeCase);
  if (typeof obj !== 'object') return obj;

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] = convertKeysToSnakeCase(value);
  }
  return converted;
};

/**
 * Sanitize a string for use as a file name in Supabase Storage
 * Removes or replaces special characters that are not allowed in storage keys
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string safe for storage
 */
export const sanitizeFileName = (str) => {
  if (!str) return '';
  
  return str
    // Convert to lowercase
    .toLowerCase()
    // Replace Turkish characters with their ASCII equivalents
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    // Replace spaces and other problematic characters with underscores
    .replace(/[^a-z0-9.-]/g, '_')
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading and trailing underscores
    .replace(/^_+|_+$/g, '')
    // Limit length to avoid overly long file names (more restrictive)
    .substring(0, 50);
}; 