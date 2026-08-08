import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SurveyQuestion, ValidationRules, QuestionType } from '@/react-app/types/survey';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Constants for magic numbers and configuration values
 */
export const CONSTANTS = {
  // Field length defaults
  DEFAULT_FIELD_LENGTH: 2,
  MAX_FIELD_LENGTH: 100,
  DEFAULT_TEXT_LENGTH: 50,
  
  // Decimal places
  DEFAULT_DECIMAL_PLACES: 2,
  MAX_DECIMAL_PLACES: 10,
  
  // Date/Time formats
  DATE_LENGTH: 8, // YYYYMMDD
  TIME_LENGTH: 4, // HHMM
  
  // Grid/question layout
  GRID_BOX_HEIGHT_BASE: 5,
  GRID_SUBQUESTION_HEIGHT: 3,
  QUESTION_BOX_HEIGHT: 7,
  BOX_WIDTH: 80,
  
  // Variable name
  VARIABLE_NAME_MAX_LENGTH: 50,
  
  // UI
  COPY_FEEDBACK_DURATION: 2000,
} as const;

/**
 * Get type information for CSPro code generation
 */
export function getTypeInfo(question: SurveyQuestion): { 
  dataType: string; 
  length: number; 
  decimals?: number 
} {
  switch (question.type) {
    case 'text':
      return { dataType: 'A', length: question.length || CONSTANTS.DEFAULT_TEXT_LENGTH };
    case 'numeric':
      return { dataType: 'N', length: question.length || CONSTANTS.DEFAULT_FIELD_LENGTH };
    case 'decimal':
      return { 
        dataType: 'N', 
        length: question.length || 8, 
        decimals: question.decimalPlaces || CONSTANTS.DEFAULT_DECIMAL_PLACES 
      };
    case 'date':
      return { dataType: 'N', length: CONSTANTS.DATE_LENGTH };
    case 'time':
      return { dataType: 'N', length: CONSTANTS.TIME_LENGTH };
    case 'multiple_choice':
    case 'multi_select':
    case 'yes_no':
      return { dataType: 'N', length: question.length || CONSTANTS.DEFAULT_FIELD_LENGTH };
    default:
      return { dataType: 'A', length: question.length || CONSTANTS.DEFAULT_FIELD_LENGTH };
  }
}

/**
 * Validate a survey question
 */
export function validateQuestion(
  variableName: string,
  questionText: string,
  type: QuestionType,
  options?: Array<{ label: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!variableName.trim()) {
    errors.push('Variable name is required');
  } else if (variableName.length > CONSTANTS.VARIABLE_NAME_MAX_LENGTH) {
    errors.push(`Variable name must be ${CONSTANTS.VARIABLE_NAME_MAX_LENGTH} characters or less`);
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
    errors.push('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
  }

  if (!questionText.trim()) {
    errors.push('Question text is required');
  }

  // Validate options for multiple choice/multi-select questions
  if ((type === 'multiple_choice' || type === 'multi_select') && options) {
    if (options.length === 0) {
      errors.push('At least one option is required for this question type');
    }
    
    const emptyLabels = options.filter(opt => !opt.label.trim());
    if (emptyLabels.length > 0) {
      errors.push('All options must have a label');
    }
    
    // Check for duplicate labels
    const labels = options.map(opt => opt.label.toLowerCase().trim());
    const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
    if (duplicates.length > 0) {
      errors.push('Option labels must be unique');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format variable name (uppercase, replace spaces with underscores)
 */
export function formatVariableName(name: string): string {
  return name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a question has validation rules
 */
export function hasValidation(question: SurveyQuestion): boolean {
  if (!question.validation) return false;
  return Object.keys(question.validation).length > 0;
}

/**
 * Get inverted comparison operator for skip logic
 */
export function getInvertedOperator(operator: string): string {
  const invertedOpMap: Record<string, string> = {
    equals: '<>',
    not_equals: '=',
    greater_than: '<=',
    less_than: '>=',
  };
  return invertedOpMap[operator] || '<>';
}

/**
 * Get direct comparison operator for FDF skip logic
 */
export function getDirectOperator(operator: string): string {
  const opMap: Record<string, string> = {
    equals: '=',
    not_equals: '<>',
    greater_than: '>',
    less_than: '<',
  };
  return opMap[operator] || '<>';
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert text to Windows line endings (CRLF)
 */
export function toCRLF(text: string): string {
  return text.replace(/\r?\n/g, '\r\n');
}
