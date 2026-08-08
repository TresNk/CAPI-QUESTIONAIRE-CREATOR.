/**
 * Input sanitization utilities for CAPI Builder
 * Prevents injection attacks and ensures data integrity
 */

import { CONSTANTS } from '../utils';

/**
 * Reserved CSPro keywords that cannot be used as variable names
 */
export const RESERVED_WORDS = new Set([
  'ID',
  'CASE_ID',
  'OCCUR',
  'CHECKME',
  'ERRMSG',
  'DATE',
  'TIME',
  'STATUS',
  'VERSION',
  'QUESTIONNAIRE',
  'INTERVIEWER',
  'RESPONDENT',
  'START',
  'END',
  'DURATION',
  'RESULT',
  'OUTCOME',
  'LANGUAGE',
  'MODE',
  'DEVICE',
  'GPS',
  'TIMESTAMP'
]);

/**
 * Sanitize variable names for CSPro compatibility
 * - Removes invalid characters
 * - Enforces length limits
 * - Checks against reserved words
 */
export function sanitizeVariableName(name: string): { valid: boolean; sanitized: string; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, sanitized: '', error: 'Variable name is required' };
  }

  // Remove invalid characters (only allow letters, numbers, underscores)
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();

  // Ensure starts with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // Enforce length limit
  if (sanitized.length > CONSTANTS.VARIABLE_NAME_MAX_LENGTH) {
    sanitized = sanitized.substring(0, CONSTANTS.VARIABLE_NAME_MAX_LENGTH);
  }

  // Check for reserved words
  if (RESERVED_WORDS.has(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: `"${sanitized}" is a reserved word in CSPro and cannot be used as a variable name`
    };
  }

  // Check if empty after sanitization
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Variable name contains only invalid characters' };
  }

  return { valid: true, sanitized };
}

/**
 * Sanitize calculation formulas
 * Only allows safe mathematical operations and variable references
 */
export function sanitizeFormula(formula: string): { valid: boolean; sanitized: string; error?: string } {
  if (!formula || !formula.trim()) {
    return { valid: false, sanitized: '', error: 'Formula is required' };
  }

  const trimmed = formula.trim();

  // Allowed characters: digits, basic operators, parentheses, brackets for variables, spaces, decimal points
  const allowedPattern = /^[\d\+\-\*\/\(\)\[\]\s\.]+$/;
  
  if (!allowedPattern.test(trimmed)) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'Formula contains invalid characters. Only numbers, operators (+,-,*,/), parentheses, and variable references [VAR] are allowed'
    };
  }

  // Check for balanced parentheses
  const parenCount = (trimmed.match(/\(/g) || []).length - (trimmed.match(/\)/g) || []).length;
  if (parenCount !== 0) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'Unbalanced parentheses in formula'
    };
  }

  // Check for balanced brackets (variable references)
  const bracketCount = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
  if (bracketCount !== 0) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'Unbalanced brackets in formula. Variable references should be in format [VARIABLE_NAME]'
    };
  }

  // Check for division by zero literals
  if (/\/\s*0(?:\.|(?!\d))/.test(trimmed)) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'Division by zero detected in formula'
    };
  }

  // Extract and validate variable references
  const varReferences = trimmed.match(/\[([^\]]+)\]/g) || [];
  for (const ref of varReferences) {
    const varName = ref.slice(1, -1); // Remove brackets
    const validation = sanitizeVariableName(varName);
    if (!validation.valid) {
      return {
        valid: false,
        sanitized: trimmed,
        error: `Invalid variable reference ${ref}: ${validation.error}`
      };
    }
    if (RESERVED_WORDS.has(validation.sanitized)) {
      return {
        valid: false,
        sanitized: trimmed,
        error: `Variable reference ${ref} uses a reserved CSPro keyword`
      };
    }
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Escape special characters for safe text display
 * Prevents XSS and ensures proper rendering
 */
export function escapeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize question text for safe storage and display
 */
export function sanitizeQuestionText(text: string): { valid: boolean; sanitized: string; error?: string } {
  if (!text || !text.trim()) {
    return { valid: false, sanitized: '', error: 'Question text is required' };
  }

  const trimmed = text.trim();

  // Limit maximum length
  if (trimmed.length > 5000) {
    return {
      valid: false,
      sanitized: trimmed.substring(0, 5000),
      error: 'Question text exceeds maximum length of 5000 characters'
    };
  }

  // Remove potentially dangerous HTML/script tags
  const sanitized = trimmed.replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ''); // Strip all HTML tags

  return { valid: true, sanitized };
}

/**
 * Sanitize option labels for multiple choice questions
 */
export function sanitizeOptionLabel(label: string): { valid: boolean; sanitized: string; error?: string } {
  if (!label || !label.trim()) {
    return { valid: false, sanitized: '', error: 'Option label is required' };
  }

  const trimmed = label.trim();

  // Limit length
  if (trimmed.length > 500) {
    return {
      valid: false,
      sanitized: trimmed.substring(0, 500),
      error: 'Option label exceeds maximum length of 500 characters'
    };
  }

  // Strip HTML tags
  const sanitized = trimmed.replace(/<[^>]*>/g, '');

  return { valid: true, sanitized };
}

/**
 * Validate and sanitize numeric values
 */
export function sanitizeNumericValue(
  value: string | number,
  options?: { min?: number; max?: number; decimalPlaces?: number }
): { valid: boolean; sanitized: number; error?: string } {
  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, sanitized: 0, error: 'Value must be a valid number' };
  }

  let result = num;

  if (options?.min !== undefined && num < options.min) {
    return {
      valid: false,
      sanitized: num,
      error: `Value must be at least ${options.min}`
    };
  }

  if (options?.max !== undefined && num > options.max) {
    return {
      valid: false,
      sanitized: num,
      error: `Value must be at most ${options.max}`
    };
  }

  if (options?.decimalPlaces !== undefined) {
    const multiplier = Math.pow(10, options.decimalPlaces);
    result = Math.round(result * multiplier) / multiplier;
  }

  return { valid: true, sanitized: result };
}

/**
 * Validate date format for CSPro (YYYYMMDD)
 */
export function sanitizeDate(dateString: string): { valid: boolean; sanitized: string; error?: string } {
  if (!dateString) {
    return { valid: false, sanitized: '', error: 'Date is required' };
  }

  // Accept YYYY-MM-DD, YYYY/MM/DD, or YYYYMMDD formats
  const match = dateString.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);
  
  if (!match) {
    return {
      valid: false,
      sanitized: '',
      error: 'Date must be in YYYY-MM-DD format'
    };
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // Validate date components
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return {
      valid: false,
      sanitized: '',
      error: 'Invalid date'
    };
  }

  // Return in CSPro format (YYYYMMDD)
  const sanitized = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;

  return { valid: true, sanitized };
}

/**
 * Validate time format for CSPro (HHMM)
 */
export function sanitizeTime(timeString: string): { valid: boolean; sanitized: string; error?: string } {
  if (!timeString) {
    return { valid: false, sanitized: '', error: 'Time is required' };
  }

  // Accept HH:MM, HH:MM:SS, or HHMM formats
  const match = timeString.match(/^(\d{1,2}):?(\d{2})(?::?(\d{2}))?$/);
  
  if (!match) {
    return {
      valid: false,
      sanitized: '',
      error: 'Time must be in HH:MM format'
    };
  }

  const [, hour, minute] = match;
  const h = Number(hour);
  const m = Number(minute);

  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return {
      valid: false,
      sanitized: '',
      error: 'Invalid time: hours must be 0-23, minutes must be 0-59'
    };
  }

  // Return in CSPro format (HHMM)
  const sanitized = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;

  return { valid: true, sanitized };
}

/**
 * Comprehensive input sanitizer based on context
 */
export type InputContext = 
  | 'variable'
  | 'formula'
  | 'questionText'
  | 'optionLabel'
  | 'numeric'
  | 'date'
  | 'time'
  | 'sectionName'
  | 'codeListName';

export interface SanitizationOptions {
  min?: number;
  max?: number;
  decimalPlaces?: number;
  required?: boolean;
}

export function sanitizeInput(
  input: string | number,
  context: InputContext,
  options?: SanitizationOptions
): { valid: boolean; sanitized: string | number; error?: string } {
  // Handle required check
  if (options?.required && (input === null || input === undefined || input === '')) {
    return { valid: false, sanitized: input, error: 'This field is required' };
  }

  switch (context) {
    case 'variable':
      return sanitizeVariableName(String(input));
    
    case 'formula':
      return sanitizeFormula(String(input));
    
    case 'questionText':
      return sanitizeQuestionText(String(input));
    
    case 'optionLabel':
      return sanitizeOptionLabel(String(input));
    
    case 'numeric':
      return sanitizeNumericValue(Number(input), options);
    
    case 'date':
      return sanitizeDate(String(input));
    
    case 'time':
      return sanitizeTime(String(input));
    
    case 'sectionName':
    case 'codeListName': {
      const trimmed = String(input).trim();
      if (!trimmed) {
        return { valid: false, sanitized: '', error: 'Name is required' };
      }
      if (trimmed.length > 200) {
        return {
          valid: false,
          sanitized: trimmed.substring(0, 200),
          error: 'Name exceeds maximum length of 200 characters'
        };
      }
      return { valid: true, sanitized: trimmed };
    }
    
    default:
      return { valid: true, sanitized: input };
  }
}
