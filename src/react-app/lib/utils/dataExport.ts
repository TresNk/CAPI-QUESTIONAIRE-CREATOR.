/**
 * Data Export/Import utilities for CAPI Builder
 * Supports JSON and CSV formats for questionnaire data
 */

import type { SurveyQuestion, SurveySection, QuestionOption } from '@/react-app/types/survey';
import { toCRLF } from '../utils';

export interface QuestionnaireExport {
  id: string;
  name: string;
  description: string;
  version: string;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  codeLists: any[];
  createdAt: string;
  updatedAt: string;
  exportedAt: string;
  formatVersion: string;
}

export const EXPORT_FORMAT_VERSION = '1.0.0';

/**
 * Export questionnaire to JSON format
 */
export function exportToJSON(questionnaire: QuestionnaireExport): string {
  const exportData = {
    ...questionnaire,
    exportedAt: new Date().toISOString(),
    formatVersion: EXPORT_FORMAT_VERSION,
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import questionnaire from JSON format
 * Validates structure and returns parsed data or error
 */
export function importFromJSON(jsonString: string): { 
  success: boolean; 
  data?: QuestionnaireExport; 
  error?: string 
} {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON format' };
    }
    
    const requiredFields = ['id', 'name', 'questions'];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        return { success: false, error: `Missing required field: ${field}` };
      }
    }
    
    // Validate format version compatibility
    if (parsed.formatVersion && parsed.formatVersion !== EXPORT_FORMAT_VERSION) {
      const [major] = parsed.formatVersion.split('.');
      const [currentMajor] = EXPORT_FORMAT_VERSION.split('.');
      
      if (major !== currentMajor) {
        return { 
          success: false, 
          error: `Incompatible format version: ${parsed.formatVersion}. Expected ${EXPORT_FORMAT_VERSION}` 
        };
      }
    }
    
    // Validate questions array
    if (!Array.isArray(parsed.questions)) {
      return { success: false, error: 'Questions must be an array' };
    }
    
    // Validate sections if present
    if (parsed.sections && !Array.isArray(parsed.sections)) {
      return { success: false, error: 'Sections must be an array' };
    }
    
    return { success: true, data: parsed as QuestionnaireExport };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to parse JSON' 
    };
  }
}

/**
 * Convert questionnaire to CSV format (questions only)
 * Useful for review and translation workflows
 */
export function exportToCSV(questionnaire: QuestionnaireExport): string {
  const headers = [
    'Section',
    'Question ID',
    'Variable Name',
    'Question Text',
    'Type',
    'Options',
    'Validation',
    'Skip Logic'
  ];
  
  const rows = [headers.join(',')];
  
  for (const question of questionnaire.questions) {
    const section = questionnaire.sections.find(s => s.id === question.sectionId);
    const sectionName = section?.name || 'Unassigned';
    
    // Format options as semicolon-separated key:value pairs
    const optionsStr = question.options 
      ? question.options.map(opt => `${opt.value}:${opt.label}`).join('; ')
      : '';
    
    // Format validation rules
    const validationStr = question.validation 
      ? Object.entries(question.validation)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('; ')
      : '';
    
    // Format skip logic
    const skipLogicStr = question.skipLogic?.conditions
      ? question.skipLogic.conditions
          .map(c => `${c.targetQuestionId}:${c.operator}:${c.value}`)
          .join('; ')
      : '';
    
    // Escape commas and quotes in text fields
    const escapeCsvField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };
    
    const row = [
      escapeCsvField(sectionName),
      escapeCsvField(question.id),
      escapeCsvField(question.variableName),
      escapeCsvField(question.questionText),
      escapeCsvField(question.type),
      escapeCsvField(optionsStr),
      escapeCsvField(validationStr),
      escapeCsvField(skipLogicStr)
    ];
    
    rows.push(row.join(','));
  }
  
  return toCRLF(rows.join('\n'));
}

/**
 * Parse CSV back to questionnaire format
 * Note: This is a simplified importer - some complex structures may not be fully restored
 */
export function importFromCSV(csvString: string): { 
  success: boolean; 
  questions: Partial<SurveyQuestion>[]; 
  error?: string 
} {
  try {
    const lines = csvString.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, questions: [], error: 'CSV must have header and at least one data row' };
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ['Variable Name', 'Question Text', 'Type'];
    
    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        return { success: false, questions: [], error: `Missing required column: ${header}` };
      }
    }
    
    const questions: Partial<SurveyQuestion>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        continue; // Skip malformed rows
      }
      
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      
      // Parse options from semicolon-separated format
      let options: QuestionOption[] | undefined;
      if (row['Options']) {
        options = row['Options'].split(';').map(opt => {
          const [value, ...labelParts] = opt.split(':');
          return {
            value: Number(value.trim()) || 0,
            label: labelParts.join(':').trim()
          };
        }).filter(opt => !isNaN(opt.value) && opt.label);
      }
      
      // Map CSV columns to question properties
      const question: Partial<SurveyQuestion> = {
        variableName: row['Variable Name']?.trim() || '',
        questionText: row['Question Text']?.trim() || '',
        type: row['Type'] as any || 'text',
        options: options?.length ? options : undefined,
        id: row['Question ID'] || crypto.randomUUID()
      };
      
      questions.push(question);
    }
    
    return { success: true, questions };
  } catch (error) {
    return { 
      success: false, 
      questions: [], 
      error: error instanceof Error ? error.message : 'Failed to parse CSV' 
    };
  }
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Download file to user's device
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Trigger file upload dialog and read contents
 */
export function readFileAsText(accept: string = '.json,.csv'): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    
    input.click();
  });
}

/**
 * Create a complete export package with metadata
 */
export function createExportPackage(
  questionnaire: Omit<QuestionnaireExport, 'exportedAt' | 'formatVersion'>
): QuestionnaireExport {
  return {
    ...questionnaire,
    exportedAt: new Date().toISOString(),
    formatVersion: EXPORT_FORMAT_VERSION,
  };
}

/**
 * Validate imported questionnaire data structure
 */
export function validateImportedData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Import data must be an object');
    return { valid: false, errors };
  }
  
  // Check required top-level fields
  const requiredFields = ['id', 'name', 'questions'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate questions
  if (Array.isArray(data.questions)) {
    data.questions.forEach((q: any, index: number) => {
      if (!q.variableName) {
        errors.push(`Question ${index + 1}: Missing variable name`);
      }
      if (!q.questionText) {
        errors.push(`Question ${index + 1}: Missing question text`);
      }
      if (!q.type) {
        errors.push(`Question ${index + 1}: Missing question type`);
      }
    });
  } else {
    errors.push('Questions must be an array');
  }
  
  return { valid: errors.length === 0, errors };
}
