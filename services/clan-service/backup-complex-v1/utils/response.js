/**
 * Response formatting utilities
 * Standardizes API response formats
 */

/**
 * Format a successful response
 * @param {any} data - The response data
 * @param {string} message - Success message
 * @returns {object} Formatted success response
 */
const formatSuccessResponse = (data, message = 'Success') => {
    return {
        success: true,
        message,
        data
    };
};

/**
 * Format an error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {object} Formatted error response
 */
const formatErrorResponse = (message, code = 'ERROR') => {
    return {
        success: false,
        message,
        code
    };
};

/**
 * Format a validation error response
 * @param {object} errors - Validation errors
 * @returns {object} Formatted validation error response
 */
const formatValidationErrorResponse = (errors) => {
    return {
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors
    };
};

module.exports = {
    formatSuccessResponse,
    formatErrorResponse,
    formatValidationErrorResponse
};
