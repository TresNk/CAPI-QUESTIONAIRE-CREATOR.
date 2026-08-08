import { useState, useEffect, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Label } from '@/react-app/components/ui/label';
import { Textarea } from '@/react-app/components/ui/textarea';
import { Checkbox } from '@/react-app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/react-app/components/ui/select';
import type { QuestionType, QuestionOption, SurveyQuestion, SurveySection, ValidationRules } from '@/react-app/types/survey';
import { validateQuestion, formatVariableName, CONSTANTS } from '@/react-app/lib/utils';

interface QuestionFormProps {
  onAddQuestion: (question: SurveyQuestion) => void;
  onEditQuestion?: (question: SurveyQuestion) => void;
  questions?: SurveyQuestion[];
  sections?: SurveySection[];
  editingQuestion?: SurveyQuestion | null;
}

export default function QuestionForm({ onAddQuestion, onEditQuestion, questions = [], sections = [], editingQuestion = null }: QuestionFormProps) {
  const isEditing = !!editingQuestion;
  const [variableName, setVariableName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [type, setType] = useState<QuestionType>('text');
  const [options, setOptions] = useState<QuestionOption[]>([]);
  const [length, setLength] = useState(2);
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [customSkipLogic, setCustomSkipLogic] = useState('');
  const [validation, setValidation] = useState<ValidationRules>({});
  const [sectionId, setSectionId] = useState<string>('');
  const [parentQuestionId, setParentQuestionId] = useState<string>('');
  const [isGridQuestion, setIsGridQuestion] = useState(false);

  // Populate form when editing - only run when editingQuestion changes and is defined
  useEffect(() => {
    if (editingQuestion && typeof editingQuestion === 'object') {
      setVariableName(editingQuestion.variableName || '');
      setQuestionText(editingQuestion.questionText || '');
      setType(editingQuestion.type || 'text');
      setOptions(editingQuestion.options || []);
      setLength(editingQuestion.length || 2);
      setDecimalPlaces(editingQuestion.decimalPlaces || 2);
      setCustomSkipLogic(editingQuestion.customSkipLogic || '');
      setValidation(editingQuestion.validation || {});
      setSectionId(editingQuestion.sectionId || '');
      setParentQuestionId(editingQuestion.parentQuestionId || '');
      setIsGridQuestion(editingQuestion.isGridQuestion || false);
    }
  }, [editingQuestion]);

  const needsOptions = type === 'multiple_choice' || type === 'multi_select';
  const isNumericType = type === 'numeric' || type === 'decimal';

  const addOption = () => {
    setOptions([...options, { value: options.length + 1, label: '' }]);
  };

  const updateOption = (index: number, label: string) => {
    const updated = [...options];
    updated[index].label = label;
    setOptions(updated);
  };

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated.map((opt, i) => ({ ...opt, value: i + 1 })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variableName.trim() || !questionText.trim()) return;

    const question: SurveyQuestion = {
      id: isEditing ? editingQuestion.id : crypto.randomUUID(),
      variableName: variableName.toUpperCase().replace(/\s+/g, '_'),
      questionText,
      type,
      length,
      ...(type === 'decimal' ? { decimalPlaces } : {}),
      ...(needsOptions && options.length > 0 ? { options } : {}),
      ...(type === 'yes_no' ? { options: [{ value: 1, label: 'Yes' }, { value: 2, label: 'No' }] } : {}),
      ...(Object.keys(validation).length > 0 ? { validation } : {}),
      ...(customSkipLogic.trim() ? { customSkipLogic: customSkipLogic.trim() } : {}),
      ...(sectionId ? { sectionId } : {}),
      ...(parentQuestionId ? { parentQuestionId } : {}),
      ...(isGridQuestion ? { isGridQuestion: true, subQuestions: editingQuestion?.subQuestions || [] } : {}),
    };

    if (isEditing && onEditQuestion) {
      onEditQuestion(question);
    } else {
      onAddQuestion(question);
    }
    resetForm();
  };

  const resetForm = () => {
    setVariableName('');
    setQuestionText('');
    setType('text');
    setOptions([]);
    setLength(2);
    setDecimalPlaces(2);
    setCustomSkipLogic('');
    setValidation({});
    setSectionId('');
    setParentQuestionId('');
    setIsGridQuestion(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="varName" className="text-teal-300">Variable Name</Label>
        <Input
          id="varName"
          value={variableName}
          onChange={(e) => setVariableName(e.target.value)}
          placeholder="e.g., AGE, GENDER"
          className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="questionText" className="text-teal-300">Question Text</Label>
        <Textarea
          id="questionText"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter the question as it will appear to interviewers"
          className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500/20 min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-teal-300">Question Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger className="bg-slate-800/50 border-slate-600 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="text">Open-Ended (Text)</SelectItem>
              <SelectItem value="numeric">Numeric (Integer)</SelectItem>
              <SelectItem value="decimal">Decimal Number</SelectItem>
              <SelectItem value="multiple_choice">Single Choice</SelectItem>
              <SelectItem value="multi_select">Multi-Select</SelectItem>
              <SelectItem value="yes_no">Yes/No</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="time">Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="length" className="text-teal-300">Field Length</Label>
          <Input
            id="length"
            type="number"
            min={1}
            max={100}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Section Selection */}
      {sections && sections.length > 0 && (
        <div className="space-y-2">
          <Label className="text-amber-300">Section (Optional)</Label>
          <Select value={sectionId || ''} onValueChange={(v) => setSectionId(v)}>
            <SelectTrigger className="bg-slate-800/50 border-slate-600 text-slate-100">
              <SelectValue placeholder="No section" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="">No section</SelectItem>
              {sections.map(section => (
                <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Parent Question Selection - for sub-questions */}
      {questions && questions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-indigo-300">Parent Question (Optional)</Label>
          <Select value={parentQuestionId || ''} onValueChange={(v) => setParentQuestionId(v)}>
            <SelectTrigger className="bg-slate-800/50 border-slate-600 text-slate-100">
              <SelectValue placeholder="Not a sub-question" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="">Not a sub-question</SelectItem>
              {questions.filter(q => q && !q.parentQuestionId && !q.isGridQuestion).map(q => (
                <SelectItem key={q.id} value={q.id}>{q.variableName} - {(q.questionText || '').substring(0, 20)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">Select a question to make this a sub-question of it</p>
        </div>
      )}

      {/* Grid/Sub-question Option */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
        <Checkbox
          id="isGrid"
          checked={isGridQuestion}
          onCheckedChange={(checked) => setIsGridQuestion(!!checked)}
          className="border-slate-600 data-[state=checked]:bg-purple-600"
        />
        <Label htmlFor="isGrid" className="text-purple-300 text-sm cursor-pointer">
          This is a grid question (will have sub-questions)
        </Label>
      </div>

      {type === 'decimal' && (
        <div className="space-y-2">
          <Label htmlFor="decimals" className="text-teal-300">Decimal Places</Label>
          <Input
            id="decimals"
            type="number"
            min={1}
            max={10}
            value={decimalPlaces}
            onChange={(e) => setDecimalPlaces(Number(e.target.value))}
            className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-teal-500"
          />
        </div>
      )}

      {/* Validation Options */}
      <div className="space-y-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
        <Label className="text-amber-300 text-xs uppercase tracking-wide">Validation</Label>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="required"
            checked={validation.required || false}
            onCheckedChange={(checked) => setValidation({ ...validation, required: !!checked })}
            className="border-slate-600 data-[state=checked]:bg-teal-600"
          />
          <Label htmlFor="required" className="text-slate-300 text-sm cursor-pointer">Required field</Label>
        </div>

        {isNumericType && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Min Value</Label>
              <Input
                type="number"
                placeholder="No min"
                value={validation.minValue ?? ''}
                onChange={(e) => setValidation({ ...validation, minValue: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-900/50 border-slate-600 text-slate-100 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Max Value</Label>
              <Input
                type="number"
                placeholder="No max"
                value={validation.maxValue ?? ''}
                onChange={(e) => setValidation({ ...validation, maxValue: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-900/50 border-slate-600 text-slate-100 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {type === 'text' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Min Length</Label>
              <Input
                type="number"
                min={0}
                placeholder="No min"
                value={validation.minLength ?? ''}
                onChange={(e) => setValidation({ ...validation, minLength: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-900/50 border-slate-600 text-slate-100 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Max Length</Label>
              <Input
                type="number"
                min={0}
                placeholder="No max"
                value={validation.maxLength ?? ''}
                onChange={(e) => setValidation({ ...validation, maxLength: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-900/50 border-slate-600 text-slate-100 h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Custom Skip Logic */}
      <div className="space-y-2">
        <Label htmlFor="skipLogic" className="text-orange-300">Custom Skip Logic (Optional)</Label>
        <Textarea
          id="skipLogic"
          value={customSkipLogic}
          onChange={(e) => setCustomSkipLogic(e.target.value)}
          placeholder="e.g., AGE < 18 | GENDER = 2&#10;Leave blank to use the visual condition builder"
          className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20 min-h-[60px] font-mono text-sm"
        />
        <p className="text-xs text-slate-500">Enter a CSPro expression. Question will be skipped if condition is FALSE.</p>
      </div>

      {needsOptions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-teal-300">Response Options</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addOption}
              className="border-teal-600 text-teal-400 hover:bg-teal-900/30"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Option
            </Button>
          </div>
          {type === 'multi_select' && (
            <p className="text-xs text-slate-500">Users can select multiple options.</p>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-slate-400 w-8 text-sm">{opt.value}.</span>
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${opt.value}`}
                  className="flex-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeOption(idx)}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium"
        disabled={!variableName.trim() || !questionText.trim()}
      >
        {isEditing ? (
          <>Update Question</>
        ) : (
          <><Plus className="w-4 h-4 mr-2" /> Add Question</>
        )}
      </Button>
    </form>
  );
}
