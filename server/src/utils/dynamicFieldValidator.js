import ApiError from './ApiError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9\s\-()]{5,25}$/;

/**
 * Validates and sanitizes customer-submitted dynamic field values against product-defined fields.
 *
 * @param {Array} customFields - The array of custom field definitions on the product.
 * @param {Object} customerInputs - The raw input object submitted by the customer.
 * @param {Object} options - Configuration options (e.g. strict).
 * @returns {{ valid: boolean, errors: Record<string, string>, sanitizedInputs: Record<string, any>, fieldSnapshots: Array<{ key: string, label: string, type: string, value: any }> }}
 */
export const validateDynamicCustomerInputs = (customFields = [], customerInputs = {}, { strict = true } = {}) => {
  const errors = {};
  const sanitizedInputs = {};
  const fieldSnapshots = [];
  const raw = customerInputs && typeof customerInputs === 'object' ? customerInputs : {};

  for (const field of customFields) {
    const key = field.name || field.key;
    if (!key) continue;

    const label = field.label || key;
    const type = field.type || 'text';
    const required = Boolean(field.required);
    const options = Array.isArray(field.options) ? field.options : [];
    const validation = field.validation || {};
    const rawVal = raw[key];

    // Handle empty/missing value
    const isEmpty = rawVal === undefined || rawVal === null || String(rawVal).trim() === '';

    if (required && isEmpty) {
      errors[key] = `${label} is required`;
      continue;
    }

    if (isEmpty) {
      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        sanitizedInputs[key] = field.defaultValue;
        fieldSnapshots.push({ key, label, type, value: field.defaultValue });
      }
      continue;
    }

    let parsedVal = rawVal;

    switch (type) {
      case 'number': {
        const num = Number(rawVal);
        if (Number.isNaN(num)) {
          errors[key] = `${label} must be a valid number`;
          break;
        }
        if (validation.min !== undefined && num < validation.min) {
          errors[key] = `${label} cannot be less than ${validation.min}`;
          break;
        }
        if (validation.max !== undefined && num > validation.max) {
          errors[key] = `${label} cannot be greater than ${validation.max}`;
          break;
        }
        parsedVal = num;
        break;
      }

      case 'email': {
        const str = String(rawVal).trim().toLowerCase();
        if (!EMAIL_REGEX.test(str)) {
          errors[key] = `${label} must be a valid email address`;
          break;
        }
        parsedVal = str;
        break;
      }

      case 'phone': {
        const str = String(rawVal).trim();
        if (!PHONE_REGEX.test(str)) {
          errors[key] = `${label} must be a valid phone number`;
          break;
        }
        parsedVal = str;
        break;
      }

      case 'select':
      case 'radio': {
        const str = String(rawVal).trim();
        if (options.length > 0 && !options.includes(str)) {
          errors[key] = `Please select a valid option for ${label}`;
          break;
        }
        parsedVal = str;
        break;
      }

      case 'toggle':
      case 'checkbox': {
        if (Array.isArray(rawVal)) {
          parsedVal = rawVal.map((v) => String(v).trim());
        } else if (typeof rawVal === 'boolean') {
          parsedVal = rawVal;
        } else {
          parsedVal = Boolean(rawVal);
        }
        break;
      }

      case 'textarea':
      case 'text':
      default: {
        const str = String(rawVal).trim();
        if (validation.minLength !== undefined && str.length < validation.minLength) {
          errors[key] = validation.customErrorMessage || `${label} must be at least ${validation.minLength} characters`;
          break;
        }
        if (validation.maxLength !== undefined && str.length > validation.maxLength) {
          errors[key] = validation.customErrorMessage || `${label} cannot exceed ${validation.maxLength} characters`;
          break;
        }
        if (validation.regex) {
          try {
            const regex = new RegExp(validation.regex);
            if (!regex.test(str)) {
              errors[key] = validation.customErrorMessage || `${label} format is invalid`;
              break;
            }
          } catch {
            // ignore invalid regex definition
          }
        }
        parsedVal = str;
        break;
      }
    }

    if (!errors[key]) {
      sanitizedInputs[key] = parsedVal;
      fieldSnapshots.push({ key, label, type, value: parsedVal });
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  if (strict && hasErrors) {
    const firstErrorMessage = Object.values(errors)[0];
    throw new ApiError(422, firstErrorMessage);
  }

  return {
    valid: !hasErrors,
    errors,
    sanitizedInputs,
    fieldSnapshots,
  };
};
