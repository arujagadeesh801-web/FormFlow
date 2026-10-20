import React from 'react';
import {
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  AlignLeft,
  CheckSquare,
  CircleDot,
  ListFilter,
  Calendar,
  Sliders,
  Type
} from 'lucide-react';
import { Question, QuestionType } from '../../types';

interface QuestionEditorProps {
  question: Question;
  index: number;
  totalQuestions: number;
  onUpdate: (updates: Partial<Question>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'short_answer', label: 'Short answer', icon: <Type className="w-4 h-4 text-teal-600" /> },
  { type: 'paragraph', label: 'Paragraph', icon: <AlignLeft className="w-4 h-4 text-teal-600" /> },
  { type: 'multiple_choice', label: 'Multiple choice', icon: <CircleDot className="w-4 h-4 text-teal-600" /> },
  { type: 'checkboxes', label: 'Checkboxes', icon: <CheckSquare className="w-4 h-4 text-teal-600" /> },
  { type: 'dropdown', label: 'Dropdown', icon: <ListFilter className="w-4 h-4 text-teal-600" /> },
  { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4 text-teal-600" /> },
  { type: 'linear_scale', label: 'Linear scale', icon: <Sliders className="w-4 h-4 text-teal-600" /> }
];

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  totalQuestions,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  const handleTypeChange = (newType: QuestionType) => {
    let options = question.options;
    if (['multiple_choice', 'checkboxes', 'dropdown'].includes(newType) && (!options || options.length === 0)) {
      options = ['Option 1', 'Option 2'];
    }
    onUpdate({
      type: newType,
      options,
      scaleMin: newType === 'linear_scale' ? (question.scaleMin || 1) : undefined,
      scaleMax: newType === 'linear_scale' ? (question.scaleMax || 5) : undefined,
      scaleMinLabel: newType === 'linear_scale' ? (question.scaleMinLabel || 'Poor') : undefined,
      scaleMaxLabel: newType === 'linear_scale' ? (question.scaleMaxLabel || 'Excellent') : undefined
    });
  };

  const handleAddOption = () => {
    const nextOption = `Option ${(question.options?.length || 0) + 1}`;
    onUpdate({ options: [...(question.options || []), nextOption] });
  };

  const handleUpdateOption = (optIndex: number, text: string) => {
    const updated = [...(question.options || [])];
    updated[optIndex] = text;
    onUpdate({ options: updated });
  };

  const handleRemoveOption = (optIndex: number) => {
    const updated = (question.options || []).filter((_, i) => i !== optIndex);
    onUpdate({ options: updated });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all p-5 space-y-4 relative group">
      {/* Question Header: Title & Type Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 w-full">
          <input
            type="text"
            value={question.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Question title"
            className="w-full text-sm font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-teal-600 focus:outline-none pb-1 transition"
          />
        </div>

        {/* Type Selector Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            value={question.type}
            onChange={e => handleTypeChange(e.target.value as QuestionType)}
            className="w-full sm:w-48 text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description / Helper Text */}
      <div>
        <input
          type="text"
          value={question.description || ''}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="Optional description or instructions for the respondent..."
          className="w-full text-xs text-slate-500 border-b border-dashed border-slate-200 hover:border-slate-300 focus:border-teal-600 focus:outline-none pb-1 transition"
        />
      </div>

      {/* Question Type Specific Body */}
      <div className="pt-2">
        {/* 1. Short answer */}
        {question.type === 'short_answer' && (
          <div className="w-full sm:w-2/3 border-b border-dotted border-slate-300 py-1.5 text-xs text-slate-400">
            Short-answer text field
          </div>
        )}

        {/* 2. Paragraph */}
        {question.type === 'paragraph' && (
          <div className="w-full border-b border-dotted border-slate-300 py-3 text-xs text-slate-400">
            Long-answer paragraph text field
          </div>
        )}

        {/* 3. Multiple Choice & 4. Checkboxes & 5. Dropdown */}
        {['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type) && (
          <div className="space-y-2">
            {(question.options || []).map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-2.5">
                {question.type === 'multiple_choice' && (
                  <CircleDot className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                {question.type === 'checkboxes' && (
                  <CheckSquare className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                {question.type === 'dropdown' && (
                  <span className="text-xs text-slate-400 font-mono w-4 shrink-0 text-center">
                    {optIdx + 1}.
                  </span>
                )}

                <input
                  type="text"
                  value={opt}
                  onChange={e => handleUpdateOption(optIdx, e.target.value)}
                  placeholder={`Option ${optIdx + 1}`}
                  className="flex-1 text-xs text-slate-800 border-b border-slate-200 hover:border-slate-300 focus:border-teal-600 focus:outline-none py-1"
                />

                {(question.options || []).length > 1 && (
                  <button
                    onClick={() => handleRemoveOption(optIdx)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleAddOption}
              className="mt-2 text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add option</span>
            </button>
          </div>
        )}

        {/* 6. Date */}
        {question.type === 'date' && (
          <div className="flex items-center gap-2 text-xs text-slate-400 border border-slate-200 rounded-lg p-2 max-w-xs bg-slate-50">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Month, day, year picker</span>
          </div>
        )}

        {/* 7. Linear Scale */}
        {question.type === 'linear_scale' && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 text-xs text-slate-700">
              <span className="font-semibold">Scale range:</span>
              <select
                value={question.scaleMin ?? 1}
                onChange={e => onUpdate({ scaleMin: Number(e.target.value) })}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
              <span>to</span>
              <select
                value={question.scaleMax ?? 5}
                onChange={e => onUpdate({ scaleMax: Number(e.target.value) })}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={7}>7</option>
                <option value={10}>10</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Min Label ({question.scaleMin ?? 1})
                </label>
                <input
                  type="text"
                  value={question.scaleMinLabel || ''}
                  onChange={e => onUpdate({ scaleMinLabel: e.target.value })}
                  placeholder="e.g. Not at all likely / Poor"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Max Label ({question.scaleMax ?? 5})
                </label>
                <input
                  type="text"
                  value={question.scaleMaxLabel || ''}
                  onChange={e => onUpdate({ scaleMaxLabel: e.target.value })}
                  placeholder="e.g. Extremely likely / Excellent"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Reorder, Duplicate, Delete, Required Toggle */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <button
            disabled={index === 0}
            onClick={onMoveUp}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 transition"
            title="Move Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            disabled={index === totalQuestions - 1}
            onClick={onMoveDown}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 transition"
            title="Move Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onDuplicate}
            className="p-1.5 text-slate-400 hover:text-teal-600 rounded hover:bg-slate-50 transition"
            title="Duplicate Question"
          >
            <Copy className="w-4 h-4" />
          </button>

          {totalQuestions > 1 && (
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
              title="Delete Question"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="h-4 w-px bg-slate-200" />

          {/* Required switch */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-600">Required</span>
            <input
              type="checkbox"
              checked={question.required}
              onChange={e => onUpdate({ required: e.target.checked })}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
