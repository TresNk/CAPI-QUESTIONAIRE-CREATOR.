import { GripVertical, Trash2, GitBranch, Edit, PlusCircle } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import type { SurveyQuestion, SurveySection } from '@/react-app/types/survey';

interface QuestionListProps {
  questions: SurveyQuestion[];
  sections?: SurveySection[];
  onRemove: (id: string) => void;
  onSetCondition?: (id: string) => void;
  onEdit?: (question: SurveyQuestion) => void;
  onAddSubQuestion?: (parentId: string) => void;
}

const typeLabels: Record<string, string> = {
  text: 'Text',
  numeric: 'Integer',
  decimal: 'Decimal',
  multiple_choice: 'Single Choice',
  multi_select: 'Multi-Select',
  yes_no: 'Yes/No',
  date: 'Date',
  time: 'Time',
};

const typeColors: Record<string, string> = {
  text: 'bg-blue-900/50 text-blue-300 border-blue-700',
  numeric: 'bg-amber-900/50 text-amber-300 border-amber-700',
  decimal: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  multiple_choice: 'bg-purple-900/50 text-purple-300 border-purple-700',
  multi_select: 'bg-pink-900/50 text-pink-300 border-pink-700',
  yes_no: 'bg-green-900/50 text-green-300 border-green-700',
  date: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  time: 'bg-indigo-900/50 text-indigo-300 border-indigo-700',
};

const operatorSymbols: Record<string, string> = {
  equals: '=',
  not_equals: '≠',
  greater_than: '>',
  less_than: '<',
};

export default function QuestionList({ questions, sections = [], onRemove, onSetCondition, onEdit, onAddSubQuestion }: QuestionListProps) {
  // Helper to get condition description
  const getConditionLabel = (q: SurveyQuestion) => {
    if (!q.condition) return null;
    const refQuestion = questions.find(rq => rq.id === q.condition!.questionId);
    if (!refQuestion) return null;
    const op = operatorSymbols[q.condition.operator] || '=';
    const valueLabel = refQuestion.options?.find(o => o.value === q.condition!.value)?.label || q.condition.value;
    return `${refQuestion.variableName} ${op} ${valueLabel}`;
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">No questions added yet.</p>
        <p className="text-xs mt-1">Add your first question above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q, idx) => (
        <div
          key={q.id}
          className="group flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-500 pt-0.5">
            <GripVertical className="w-4 h-4 opacity-50" />
            <span className="text-xs font-mono w-5">{idx + 1}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-teal-400 text-sm font-mono">{q.variableName}</code>
              <Badge variant="outline" className={`text-[10px] ${typeColors[q.type]}`}>
                {typeLabels[q.type]}
              </Badge>
              {(q.condition || q.customSkipLogic) && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] bg-orange-900/50 text-orange-300 border-orange-700 cursor-pointer hover:bg-orange-900/70"
                  onClick={() => onSetCondition?.(q.id)}
                >
                  <GitBranch className="w-2.5 h-2.5 mr-1" /> 
                  {q.customSkipLogic ? 'Custom Logic' : (getConditionLabel(q) || 'Conditional')}
                </Badge>
              )}
              {q.validation?.required && (
                <Badge variant="outline" className="text-[10px] bg-red-900/50 text-red-300 border-red-700">
                  Required
                </Badge>
              )}
              {q.sectionId && sections && sections.find(s => s.id === q.sectionId) && (
                <Badge variant="outline" className="text-[10px] bg-amber-900/50 text-amber-300 border-amber-700">
                  {sections.find(s => s.id === q.sectionId)?.name}
                </Badge>
              )}
              {q.isGridQuestion && (
                <Badge variant="outline" className="text-[10px] bg-purple-900/50 text-purple-300 border-purple-700">
                  Grid (+{q.subQuestions?.length || 0} sub)
                </Badge>
              )}
              {q.parentQuestionId && (
                <Badge variant="outline" className="text-[10px] bg-indigo-900/50 text-indigo-300 border-indigo-700 ml-2">
                  Sub-question
                </Badge>
              )}
            </div>
            <p className="text-slate-300 text-sm truncate">{q.questionText}</p>
            {q.options && q.options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {q.options.map((opt) => (
                  <span key={opt.value} className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">
                    {opt.value}={opt.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onSetCondition && idx > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onSetCondition(q.id)}
                className="h-7 w-7 text-slate-400 hover:text-orange-400 hover:bg-orange-900/20"
                title="Add condition"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </Button>
            )}
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(q)}
                className="h-7 w-7 text-slate-400 hover:text-teal-400 hover:bg-teal-900/20"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
            )}
            {q.isGridQuestion && onAddSubQuestion && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onAddSubQuestion(q.id)}
                className="h-7 w-7 text-slate-400 hover:text-purple-400 hover:bg-purple-900/20"
                title="Add sub-question"
              >
                <PlusCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRemove(q.id)}
              className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
