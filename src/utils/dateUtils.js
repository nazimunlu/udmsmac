/**
 * Safely converts a date to ISO string format (YYYY-MM-DD)
 * @param {Date|string} date - The date to convert
 * @param {string} fallback - Fallback date string if conversion fails
 * @returns {string} Date in YYYY-MM-DD format
 */
export const safeToISOString = (date, fallback = '2024-01-01') => {
    try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString().split('T')[0];
        } else {
            console.warn('Invalid date provided to safeToISOString:', date);
            return fallback;
        }
    } catch (error) {
        console.warn('Error converting date to ISO string:', error, 'Date:', date);
        return fallback;
    }
};

/**
 * Safely converts a date to ISO string format with time (YYYY-MM-DDTHH:mm:ss.sssZ)
 * @param {Date|string} date - The date to convert
 * @param {string} fallback - Fallback date string if conversion fails
 * @returns {string} Date in ISO string format
 */
export const safeToISOStringFull = (date, fallback = null) => {
    try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString();
        } else {
            console.warn('Invalid date provided to safeToISOStringFull:', date);
            return fallback || new Date().toISOString();
        }
    } catch (error) {
        console.warn('Error converting date to full ISO string:', error, 'Date:', date);
        return fallback || new Date().toISOString();
    }
};

/**
 * Gets current date in YYYY-MM-DD format safely
 * @returns {string} Current date in YYYY-MM-DD format
 */
export const getCurrentDateString = () => {
    return safeToISOString(new Date());
};

/**
 * Validates if a date is valid
 * @param {Date|string} date - The date to validate
 * @returns {boolean} True if date is valid
 */
export const isValidDate = (date) => {
    try {
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
    } catch (error) {
        return false;
    }
}; 