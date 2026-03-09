import { useState, useEffect } from 'react';
import { GitBranch, X } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Label } from '@/react-app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/react-app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/react-app/components/ui/select';
import type { SurveyQuestion, Condition } from '@/react-app/types/survey';

interface ConditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: SurveyQuestion | null;
  availableQuestions: SurveyQuestion[];
  onSave: (questionId: string, condition: Condition | undefined) => void;
}

const operatorLabels: Record<string, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  greater_than: 'is greater than',
  less_than: 'is less than',
};

export default function ConditionDialog({
  open,
  onOpenChange,
  question,
  availableQuestions,
  onSave,
}: ConditionDialogProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [operator, setOperator] = useState<Condition['operator']>('equals');
  const [value, setValue] = useState<string>('');

  // Reset form when question changes
  useEffect(() => {
    if (question?.condition) {
      setSelectedQuestionId(question.condition.questionId);
      setOperator(question.condition.operator);
      setValue(String(question.condition.value));
    } else {
      setSelectedQuestionId('');
      setOperator('equals');
      setValue('');
    }
  }, [question]);

  const selectedQuestion = availableQuestions.find(q => q.id === selectedQuestionId);

  const handleSave = () => {
    if (!question) return;
    
    if (!selectedQuestionId || !value.trim()) {
      onSave(question.id, undefined);
    } else {
      const condition: Condition = {
        questionId: selectedQuestionId,
        operator,
        // Option values are always numeric; also convert for numeric/decimal questions
        value: (selectedQuestion?.options && selectedQuestion.options.length > 0) ||
               selectedQuestion?.type === 'numeric' ||
               selectedQuestion?.type === 'decimal'
          ? Number(value)
          : value,
      };
      onSave(question.id, condition);
    }
    onOpenChange(false);
  };

  const handleRemove = () => {
    if (!question) return;
    onSave(question.id, undefined);
    onOpenChange(false);
  };

  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <GitBranch className="w-5 h-5 text-orange-400" />
            Skip Logic for {question.variableName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-400">
            Show this question only when a previous answer meets the condition below.
          </p>

          <div className="space-y-2">
            <Label className="text-teal-300">If answer to...</Label>
            <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="Select a question" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {availableQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.variableName} - {q.questionText.slice(0, 30)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedQuestionId && (
            <>
              <div className="space-y-2">
                <Label className="text-teal-300">Condition</Label>
                <Select 
                  value={operator} 
                  onValueChange={(v) => setOperator(v as Condition['operator'])}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="equals">{operatorLabels.equals}</SelectItem>
                    <SelectItem value="not_equals">{operatorLabels.not_equals}</SelectItem>
                    {selectedQuestion?.type === 'numeric' && (
                      <>
                        <SelectItem value="greater_than">{operatorLabels.greater_than}</SelectItem>
                        <SelectItem value="less_than">{operatorLabels.less_than}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-teal-300">Value</Label>
                {selectedQuestion?.options && selectedQuestion.options.length > 0 ? (
                  <Select value={value} onValueChange={setValue}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Select a value" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {selectedQuestion.options.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.value} - {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={selectedQuestion?.type === 'numeric' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter the value to compare"
                    className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                  />
                )}
              </div>
            </>
          )}

          {/* Preview */}
          {selectedQuestionId && selectedQuestion && value && (
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Preview:</p>
              <p className="text-sm text-orange-300">
                Show <code className="text-teal-400">{question.variableName}</code> only if{' '}
                <code className="text-teal-400">{selectedQuestion.variableName}</code>{' '}
                {operatorLabels[operator]}{' '}
                <code className="text-amber-400">
                  {selectedQuestion.options?.find(o => String(o.value) === value)?.label || value}
                </code>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {question.condition && (
            <Button
              variant="ghost"
              onClick={handleRemove}
              className="text-red-400 hover:bg-red-900/20 hover:text-red-300 mr-auto"
            >
              <X className="w-4 h-4 mr-1" /> Remove Condition
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-500 text-white"
            disabled={!!selectedQuestionId && !value.trim()}
          >
            Save Condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
