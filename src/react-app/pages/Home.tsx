import { useState, useEffect } from 'react';
import { FileCode2, List, Plus, FolderOpen } from 'lucide-react';
import QuestionForm from '@/react-app/components/QuestionForm';
import QuestionList from '@/react-app/components/QuestionList';
import CodePreview from '@/react-app/components/CodePreview';
import ConditionDialog from '@/react-app/components/ConditionDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/react-app/components/ui/tabs';
import type { SurveyQuestion, SurveySection, Condition } from '@/react-app/types/survey';

export default function Home() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [activeTab, setActiveTab] = useState('add');
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingQuestionForForm, setEditingQuestionForForm] = useState<SurveyQuestion | null>(null);

  // Load IBM Plex Mono for code display
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const addQuestion = (question: SurveyQuestion) => {
    setQuestions([...questions, question]);
    setActiveTab('list');
  };

  const removeQuestion = (id: string) => {
    // Also remove any conditions that reference this question
    setQuestions(questions
      .filter(q => q.id !== id)
      .map(q => q.condition?.questionId === id ? { ...q, condition: undefined } : q)
    );
  };

  const openConditionDialog = (questionId: string) => {
    setEditingConditionId(questionId);
    setConditionDialogOpen(true);
  };

  const saveCondition = (questionId: string, condition: Condition | undefined) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, condition } : q
    ));
  };

  // Get questions that appear before the one being edited (for condition references)
  const getAvailableConditionQuestions = () => {
    if (!editingConditionId) return [];
    const idx = questions.findIndex(q => q.id === editingConditionId);
    return questions.slice(0, idx);
  };

  const editingQuestion = questions.find(q => q.id === editingConditionId) || null;

  // Section management
  const addSection = (name: string) => {
    if (!name.trim()) return;
    const newSection: SurveySection = {
      id: crypto.randomUUID(),
      name: name.trim()
    };
    setSections([...sections, newSection]);
    setNewSectionName('');
    setSectionDialogOpen(false);
  };

  const removeSection = (id: string) => {
    // Remove section and unassign questions from it
    setSections(sections.filter(s => s.id !== id));
    setQuestions(questions.map(q =>
      q.sectionId === id ? { ...q, sectionId: undefined } : q
    ));
  };

  const addSubQuestion = (parentId: string, subQuestion: SurveyQuestion) => {
    setQuestions(questions.map(q => {
      if (q.id === parentId) {
        return {
          ...q,
          isGridQuestion: true,
          subQuestions: [...(q.subQuestions || []), { ...subQuestion, parentQuestionId: parentId }]
        };
      }
      return q;
    }));
  };

  const handleEditQuestion = (question: SurveyQuestion) => {
    setEditingQuestionForForm(question);
    setActiveTab('add');
  };

  const handleUpdateQuestion = (updatedQuestion: SurveyQuestion) => {
    setQuestions(questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
    setEditingQuestionForForm(null);
  };

  const handleAddSubQuestion = (parentId: string) => {
    // Switch to add tab with parent question pre-selected
    setEditingQuestionForForm(null);
    setActiveTab('add');
  };

  return (
    <div className="bg-slate-900 min-h-screen overflow-y-auto">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <FileCode2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">CAPI Builder</h1>
              <p className="text-xs text-slate-400">CSPro Code Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {sections.length > 0 && (
              <span className="px-2 py-1 rounded bg-slate-800 text-amber-400 font-mono text-xs">
                {sections.length} section{sections.length !== 1 ? 's' : ''}
              </span>
            )}
            <span className="px-2 py-1 rounded bg-slate-800 text-teal-400 font-mono text-xs">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Question Builder */}
          <div className="flex flex-col bg-slate-800/30 rounded-xl border border-slate-700/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b border-slate-700/50 bg-transparent p-0">
                <TabsTrigger
                  value="sections"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 px-4 py-3"
                >
                  <FolderOpen className="w-4 h-4 mr-2" /> Sections ({sections.length})
                </TabsTrigger>
                <TabsTrigger
                  value="add"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 px-4 py-3"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Question
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 px-4 py-3"
                >
                  <List className="w-4 h-4 mr-2" /> Questions ({questions.length})
                </TabsTrigger>
              </TabsList>
              
              <div className="p-4">
                <TabsContent value="sections" className="m-0">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="New section name..."
                        className="flex-1 bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && addSection(newSectionName)}
                      />
                      <button
                        onClick={() => addSection(newSectionName)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium"
                      >
                        Add
                      </button>
                    </div>
                    
                    {sections.length === 0 ? (
                      <p className="text-slate-500 text-sm">No sections yet. Add sections to organize your questionnaire into parts (e.g., Household, Individual, Education).</p>
                    ) : (
                      <div className="space-y-2">
                        {sections.map(section => (
                          <div key={section.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            <span className="text-slate-200 font-medium">{section.name}</span>
                            <button
                              onClick={() => removeSection(section.id)}
                              className="text-slate-400 hover:text-red-400 px-2 py-1 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="add" className="m-0 h-full">
                  <QuestionForm
                    onAddQuestion={addQuestion}
                    onEditQuestion={handleUpdateQuestion}
                    questions={questions}
                    sections={sections}
                    editingQuestion={editingQuestionForForm}
                  />
                </TabsContent>
                <TabsContent value="list" className="m-0 h-full">
                  <QuestionList
                    questions={questions}
                    sections={sections}
                    onRemove={removeQuestion}
                    onSetCondition={openConditionDialog}
                    onEdit={handleEditQuestion}
                    onAddSubQuestion={handleAddSubQuestion}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Panel - Code Preview */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 flex flex-col">
            <CodePreview questions={questions} sections={sections} />
          </div>
        </div>
      </main>

      {/* Decorative grid background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45, 212, 191, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45, 212, 191, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Condition Dialog */}
      <ConditionDialog
        open={conditionDialogOpen}
        onOpenChange={setConditionDialogOpen}
        question={editingQuestion}
        availableQuestions={getAvailableConditionQuestions()}
        onSave={saveCondition}
      />
    </div>
  );
}
