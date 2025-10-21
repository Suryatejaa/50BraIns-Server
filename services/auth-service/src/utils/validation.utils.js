/**
 * Enhanced validation utilities with better error handling
 */

const { ValidationError } = require('./errors.utils');

// Email validation
const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
};

// Password validation - more secure requirements
const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Name validation
const validateName = (name) => {
    if (typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 50 && /^[a-zA-Z\s'-]+$/.test(trimmed);
};

// UUID validation
const validateUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// roles validation
const validateroles = (roles) => {
    const validroles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    return validroles.includes(roles);
};

// Phone number validation (basic)
const validatePhone = (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
};

// URL validation
const validateURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Date validation
const validateDate = (date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
};

// Pagination validation
const validatePagination = (page, limit) => {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return {
        page: isNaN(pageNum) || pageNum < 1 ? 1 : pageNum,
        limit: isNaN(limitNum) || limitNum < 1 || limitNum > 100 ? 20 : limitNum
    };
};

// Main validation function
const validateInput = (data, rules, options = {}) => {
    const errors = [];
    const sanitized = {};

    for (const field in rules) {
        const value = data[field];
        const rule = rules[field];

        // Check required fields
        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({
                field,
                message: `${field} is required`
            });
            continue;
        }

        // Skip validation if field is not present and not required
        if (value === undefined || value === null) {
            continue;
        }

        let sanitizedValue = value;

        // String trimming
        if (typeof value === 'string') {
            sanitizedValue = value.trim();
        }

        // Type-specific validations
        if (rule.type === 'email') {
            if (!validateEmail(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be a valid email address`
                });
                continue;
            }
            sanitizedValue = sanitizedValue.toLowerCase();
        }

        if (rule.type === 'password') {
            if (!validatePassword(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be at least 8 characters with uppercase, lowercase, number, and special character`
                });
                continue;
            }
        }

        if (rule.type === 'name') {
            if (!validateName(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes`
                });
                continue;
            }
        }

        if (rule.type === 'uuid') {
            if (!validateUUID(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be a valid UUID`
                });
                continue;
            }
        }

        if (rule.type === 'roles') {
            if (!validateroles(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be one of: USER, ADMIN, SUPER_ADMIN`
                });
                continue;
            }
        }

        if (rule.type === 'phone') {
            if (!validatePhone(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be a valid phone number`
                });
                continue;
            }
        }

        if (rule.type === 'url') {
            if (!validateURL(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be a valid URL`
                });
                continue;
            }
        }

        if (rule.type === 'date') {
            if (!validateDate(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} must be a valid date`
                });
                continue;
            }
        }

        if (rule.type === 'boolean') {
            if (typeof sanitizedValue !== 'boolean') {
                // Try to convert string to boolean
                if (sanitizedValue === 'true' || sanitizedValue === '1') {
                    sanitizedValue = true;
                } else if (sanitizedValue === 'false' || sanitizedValue === '0') {
                    sanitizedValue = false;
                } else {
                    errors.push({
                        field,
                        message: `${field} must be a boolean value`
                    });
                    continue;
                }
            }
        }

        // Length validations
        if (rule.minLength && sanitizedValue.toString().length < rule.minLength) {
            errors.push({
                field,
                message: `${field} must be at least ${rule.minLength} characters`
            });
        }

        if (rule.maxLength && sanitizedValue.toString().length > rule.maxLength) {
            errors.push({
                field,
                message: `${field} must be no more than ${rule.maxLength} characters`
            });
        }

        // Value validations
        if (rule.min !== undefined && Number(sanitizedValue) < rule.min) {
            errors.push({
                field,
                message: `${field} must be at least ${rule.min}`
            });
        }

        if (rule.max !== undefined && Number(sanitizedValue) > rule.max) {
            errors.push({
                field,
                message: `${field} must be no more than ${rule.max}`
            });
        }

        // Enum validation
        if (rule.enum && !rule.enum.includes(sanitizedValue)) {
            errors.push({
                field,
                message: `${field} must be one of: ${rule.enum.join(', ')}`
            });
        }

        // Custom validation
        if (rule.custom && typeof rule.custom === 'function') {
            const customResult = rule.custom(sanitizedValue, data);
            if (customResult !== true) {
                errors.push({
                    field,
                    message: customResult || `${field} is invalid`
                });
            }
        }

        sanitized[field] = sanitizedValue;
    }

    const result = {
        isValid: errors.length === 0,
        errors,
        data: sanitized
    };

    // Throw error if validation fails and throwOnError is true
    if (!result.isValid && options.throwOnError) {
        const errorMessage = errors.map(e => e.message).join(', ');
        const error = new ValidationError(errorMessage);
        error.details = errors;
        throw error;
    }

    return result;
};

// Validation schemas for common operations
const schemas = {
    register: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'password' },
        firstName: { required: true, type: 'name' },
        lastName: { required: true, type: 'name' },
        roles: { required: false, type: 'roles' }
    },

    login: {
        email: { required: true, type: 'email' },
        password: { required: true, minLength: 1 }
    },

    updateProfile: {
        firstName: { required: false, type: 'name' },
        lastName: { required: false, type: 'name' }
    },

    changePassword: {
        currentPassword: { required: true, minLength: 1 },
        newPassword: { required: true, type: 'password' }
    },

    resetPassword: {
        token: { required: true, minLength: 1 },
        newPassword: { required: true, type: 'password' }
    },

    createUser: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'password' },
        firstName: { required: true, type: 'name' },
        lastName: { required: true, type: 'name' },
        roles: { required: false, type: 'roles' }
    },

    updateUser: {
        firstName: { required: false, type: 'name' },
        lastName: { required: false, type: 'name' },
        roles: { required: false, type: 'roles' },
        isActive: { required: false, type: 'boolean' },
        emailVerified: { required: false, type: 'boolean' }
    },

    pagination: {
        page: { required: false, type: 'number', min: 1 },
        limit: { required: false, type: 'number', min: 1, max: 100 }
    }
};

module.exports = {
    validateEmail,
    validatePassword,
    validateName,
    validateUUID,
    validateroles,
    validatePhone,
    validateURL,
    validateDate,
    validatePagination,
    validateInput,
    schemas
};
