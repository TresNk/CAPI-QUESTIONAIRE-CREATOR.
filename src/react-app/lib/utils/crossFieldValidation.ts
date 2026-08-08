import type { SurveyQuestion, SurveySection } from '../../types/survey';

export interface QuestionnaireData {
  id: string;
  name: string;
  description: string;
  version: string;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  codeLists: any[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Validates cross-field dependencies within a questionnaire
 * Ensures logical consistency between related questions
 */
export interface ValidationError {
  questionId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateCrossFieldDependencies(
  questionnaire: QuestionnaireData
): ValidationError[] {
  const errors: ValidationError[] = [];
  const questionMap = new Map<string, SurveyQuestion>();

  // Build question map for quick lookup
  function indexQuestions(sections: SurveySection[]) {
    sections.forEach((section: any) => {
      const sectionQuestions = section.questions || [];
      sectionQuestions.forEach((q: SurveyQuestion) => {
        questionMap.set(q.id, q);
        if (q.subQuestions && q.subQuestions.length > 0) {
          indexQuestions([{ id: `sub-${q.id}`, name: '', questions: q.subQuestions } as SurveySection]);
        }
      });
    });
  }

  indexQuestions(questionnaire.sections);

  // Validate each question
  questionnaire.sections.forEach((section: any) => {
    const sectionQuestions = section.questions || [];
    sectionQuestions.forEach((question: SurveyQuestion) => {
      // Check variable name uniqueness
      const duplicateVar = Array.from(questionMap.values()).find(
        q => q.variableName === question.variableName && q.id !== question.id
      );
      if (duplicateVar) {
        errors.push({
          questionId: question.id,
          field: 'variableName',
          message: `Duplicate variable name "${question.variableName}" (also used in question ${duplicateVar.id})`,
          severity: 'error'
        });
      }

      // Validate skip logic targets exist
      if (question.skipLogic) {
        question.skipLogic.conditions.forEach((condition: any) => {
          if (!questionMap.has(condition.targetQuestionId)) {
            errors.push({
              questionId: question.id,
              field: 'skipLogic',
              message: `Skip logic references non-existent question: ${condition.targetQuestionId}`,
              severity: 'error'
            });
          }
        });
      }

      // Validate validation rules
      if (question.validation) {
        const { minValue, maxValue, minLength, maxLength, requiredIf } = question.validation;

        // Numeric range validation
        if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
          errors.push({
            questionId: question.id,
            field: 'validation',
            message: `Minimum value (${minValue}) cannot be greater than maximum value (${maxValue})`,
            severity: 'error'
          });
        }

        // String length validation
        if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
          errors.push({
            questionId: question.id,
            field: 'validation',
            message: `Minimum length (${minLength}) cannot be greater than maximum length (${maxLength})`,
            severity: 'error'
          });
        }

        // Cross-field validation: requiredIf
        if (requiredIf) {
          const targetQuestion = questionMap.get(requiredIf.questionId);
          if (!targetQuestion) {
            errors.push({
              questionId: question.id,
              field: 'validation',
              message: `Required-if condition references non-existent question: ${requiredIf.questionId}`,
              severity: 'error'
            });
          } else {
            // Check if the value matches the target question's type
            const targetType = targetQuestion.type;
            if (targetType === 'numeric' || targetType === 'decimal') {
              if (typeof requiredIf.value === 'string' && isNaN(Number(requiredIf.value))) {
                errors.push({
                  questionId: question.id,
                  field: 'validation',
                  message: `Required-if value "${requiredIf.value}" doesn't match numeric type of question ${requiredIf.questionId}`,
                  severity: 'warning'
                });
              }
            }
          }
        }

        // Date range validation
        if (question.type === 'date' && question.validation?.dateRange) {
          const { minDate, maxDate } = question.validation.dateRange;
          if (minDate && maxDate && new Date(minDate) > new Date(maxDate)) {
            errors.push({
              questionId: question.id,
              field: 'validation',
              message: 'Minimum date cannot be after maximum date',
              severity: 'error'
            });
          }
        }
      }

      // Validate code list references
      if (question.codeListId) {
        const codeListExists = questionnaire.codeLists?.some(
          (cl: any) => cl.id === question.codeListId
        );
        if (!codeListExists) {
          errors.push({
            questionId: question.id,
            field: 'codeListId',
            message: `References non-existent code list: ${question.codeListId}`,
            severity: 'error'
          });
        }
      }

      // Validate calculated fields
      if (question.isCalculated && question.calculationFormula) {
        // Basic formula validation - check for referenced variables
        const formula = question.calculationFormula;
        const varReferences = formula.match(/\[([^\]]+)\]/g) || [];
        
        if (varReferences.length > 0) {
          varReferences.forEach((ref: string) => {
            const varName = ref.slice(1, -1); // Remove brackets
            const referencedQuestion = Array.from(questionMap.values()).find(
              q => q.variableName === varName
            );
            if (!referencedQuestion) {
              errors.push({
                questionId: question.id,
                field: 'calculationFormula',
                message: `Formula references non-existent variable: ${varName}`,
                severity: 'error'
              });
            }
          });
        }
      }
    });
  });

  return errors;
}

/**
 * Validates a single question against cross-field rules
 */
export function validateQuestionCrossField(
  question: SurveyQuestion,
  allQuestions: SurveyQuestion[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for circular dependencies in calculations
  if (question.isCalculated && question.calculationFormula) {
    const visited = new Set<string>();
    const hasCircularDependency = (q: SurveyQuestion): boolean => {
      if (visited.has(q.id)) return true;
      visited.add(q.id);

      if (q.calculationFormula) {
        const varReferences = q.calculationFormula.match(/\[([^\]]+)\]/g) || [];
        for (const ref of varReferences) {
          const varName = ref.slice(1, -1);
          const referencedQ = allQuestions.find(qq => qq.variableName === varName);
          if (referencedQ && referencedQ.isCalculated) {
            if (hasCircularDependency(referencedQ)) return true;
          }
        }
      }

      visited.delete(q.id);
      return false;
    };

    if (hasCircularDependency(question)) {
      errors.push({
        questionId: question.id,
        field: 'calculationFormula',
        message: 'Circular dependency detected in calculation formula',
        severity: 'error'
      });
    }
  }

  return errors;
}
