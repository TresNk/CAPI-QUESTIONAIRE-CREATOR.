export type QuestionType =
  | 'text'
  | 'numeric'
  | 'decimal'
  | 'multiple_choice'
  | 'multi_select'
  | 'yes_no'
  | 'date'
  | 'time';

export interface QuestionOption {
  value: number;
  label: string;
}

export interface ValidationRules {
  required?: boolean;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
}

export interface Condition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
  value: string | number;
  customLogic?: string;
}

export interface SurveySection {
  id: string;
  name: string;
  description?: string;
}

export interface SurveyQuestion {
  id: string;
  variableName: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  condition?: Condition;
  customSkipLogic?: string;
  length?: number;
  decimalPlaces?: number;
  validation?: ValidationRules;
  // New fields for sections and sub-questions
  sectionId?: string;        // Which section this question belongs to
  parentQuestionId?: string; // If set, this is a sub-question
  isGridQuestion?: boolean; // If true, shows as grid/table with sub-questions
  subQuestions?: SurveyQuestion[]; // Nested sub-questions
}
