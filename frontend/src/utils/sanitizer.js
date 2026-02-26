import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Unsanitized HTML string
 * @returns {string} - Sanitized HTML string
 */
export const sanitizeHtml = (dirty) => {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

/**
 * Sanitize user input text (no HTML tags allowed)
 * @param {string} input - Unsanitized text input
 * @returns {string} - Sanitized plain text
 */
export const sanitizeText = (input) => {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

/**
 * Sanitize feedback/comments with basic formatting
 * Allows only safe inline elements
 * @param {string} input - Unsanitized feedback text
 * @returns {string} - Sanitized feedback
 */
export const sanitizeFeedback = (input) => {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  });
};

/**
 * Validate and sanitize task title
 * @param {string} title - Task title
 * @returns {string} - Validated and sanitized title
 */
export const sanitizeTaskTitle = (title) => {
  if (!title || typeof title !== 'string') return '';
  const sanitized = DOMPurify.sanitize(title, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // Limit length to 255 characters
  return sanitized.substring(0, 255).trim();
};

/**
 * Validate and sanitize task description
 * @param {string} description - Task description
 * @returns {string} - Validated and sanitized description
 */
export const sanitizeTaskDescription = (description) => {
  if (!description || typeof description !== 'string') return '';
  const sanitized = DOMPurify.sanitize(description, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  });
  // Limit length to 2000 characters
  return sanitized.substring(0, 2000).trim();
};

/**
 * Validate and sanitize contribution/activity text
 * @param {string} text - Activity text
 * @returns {string} - Validated and sanitized text
 */
export const sanitizeContribution = (text) => {
  if (!text || typeof text !== 'string') return '';
  const sanitized = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
  // Limit length to 5000 characters
  return sanitized.substring(0, 5000).trim();
};

/**
 * Validate required field
 * @param {string} value - Field value
 * @param {string} fieldName - Field name for error message
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateRequired = (value, fieldName) => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  return { isValid: true, error: '' };
};

/**
 * Validate date format
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateDate = (dateString) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { isValid: false, error: 'Invalid date format. Use YYYY-MM-DD.' };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date value.' };
  }
  
  return { isValid: true, error: '' };
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format.' };
  }
  return { isValid: true, error: '' };
};
