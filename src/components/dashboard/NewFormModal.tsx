import React, { useState } from 'react';
import { X, Calendar, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formService } from '../../services/formService';
import { Form } from '../../types';

interface NewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFormCreated: (form: Form) => void;
}

export const NewFormModal: React.FC<NewFormModalProps> = ({
  isOpen,
  onClose,
  onFormCreated
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEvent, setIsEvent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in or select an organizer persona first.', 'error');
      return;
    }

    setLoading(true);
    try {
      const created = await formService.createForm(
        {
          title: title.trim() || (isEvent ? 'Untitled Event Registration' : 'Untitled Form'),
          description: description.trim(),
          status: 'draft',
          settings: {
            isPublic: true,
            requiresLogin: false,
            allowMultipleResponses: false,
            isEvent: isEvent,
            eventDate: isEvent ? new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16) : null,
            eventVenue: isEvent ? 'Main Campus Hall' : '',
            eventCapacity: isEvent ? 100 : null
          },
          questions: isEvent
            ? [
                {
                  id: 'q-' + Math.random().toString(36).substring(2, 7),
                  formId: '',
                  title: 'Full Name',
                  type: 'short_answer',
                  required: true,
                  orderIndex: 0,
                  options: []
                },
                {
                  id: 'q-' + Math.random().toString(36).substring(2, 7),
                  formId: '',
                  title: 'Email Address',
                  type: 'short_answer',
                  required: true,
                  orderIndex: 1,
                  options: []
                },
                {
                  id: 'q-' + Math.random().toString(36).substring(2, 7),
                  formId: '',
                  title: 'Attendance Mode',
                  type: 'multiple_choice',
                  required: true,
                  orderIndex: 2,
                  options: ['In-Person', 'Online / Virtual']
                }
              ]
            : [
                {
                  id: 'q-' + Math.random().toString(36).substring(2, 7),
                  formId: '',
                  title: 'Untitled Question',
                  type: 'short_answer',
                  required: false,
                  orderIndex: 0,
                  options: []
                }
              ]
        },
        user
      );

      showToast('Form created successfully!', 'success');
      onFormCreated(created);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create form', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create New Form</h2>
              <p className="text-xs text-slate-500">Choose between a general form or an event registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode Selector Cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsEvent(false)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col items-start gap-2 ${
                !isEvent
                  ? 'border-teal-600 bg-teal-50/40 text-teal-950 ring-1 ring-teal-600'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <FileText className={`w-5 h-5 ${!isEvent ? 'text-teal-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs font-bold">Standard Form</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Surveys, quizzes, applications, and general feedback
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsEvent(true)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col items-start gap-2 ${
                isEvent
                  ? 'border-teal-600 bg-teal-50/40 text-teal-950 ring-1 ring-teal-600'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <Calendar className={`w-5 h-5 ${isEvent ? 'text-teal-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs font-bold">Event Registration</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Workshops, hackathons, seminars with attendance check-in
                </p>
              </div>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEvent ? 'Event Title' : 'Form Title'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isEvent ? 'e.g. Annual Tech Symposium 2026' : 'e.g. Student Experience Survey'}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide a brief explanation or instructions for respondents..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create & Open Builder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
