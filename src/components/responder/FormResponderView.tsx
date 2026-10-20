import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Users,
  Send,
  RotateCcw
} from 'lucide-react';
import { Form, Question } from '../../types';
import { formService } from '../../services/formService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { validateFormSubmission, isValidEmail } from '../../utils/validation';

interface FormResponderViewProps {
  formId: string;
  onBack: () => void;
}

export const FormResponderView: React.FC<FormResponderViewProps> = ({
  formId,
  onBack
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForm();
  }, [formId]);

  useEffect(() => {
    if (user) {
      if (!participantName) setParticipantName(user.fullName);
      if (!participantEmail) setParticipantEmail(user.email);
    }
  }, [user]);

  const loadForm = async () => {
    setLoading(true);
    try {
      const data = await formService.getFormById(formId);
      setForm(data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load form', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTextAnswer = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    if (errors[qId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  const handleCheckboxAnswer = (qId: string, option: string, checked: boolean) => {
    const current: string[] = Array.isArray(answers[qId]) ? answers[qId] : [];
    let updated: string[];
    if (checked) {
      updated = [...current, option];
    } else {
      updated = current.filter(item => item !== option);
    }
    setAnswers(prev => ({ ...prev, [qId]: updated }));
    if (errors[qId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const newErrors: Record<string, string> = {};

    // Validate participant info if event mode
    if (form.settings.isEvent) {
      if (!participantName.trim()) {
        newErrors['participant_name'] = 'Full name is required for event registration.';
      }
      if (!participantEmail.trim() || !isValidEmail(participantEmail)) {
        newErrors['participant_email'] = 'A valid email address is required for confirmation.';
      }
    }

    // Validate question answers
    const validation = validateFormSubmission(form.questions || [], answers);
    if (!validation.isValid) {
      validation.errors.forEach(err => {
        newErrors[err.questionId] = err.message;
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the highlighted errors before submitting.', 'error');
      // Scroll to first error
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await formService.submitResponse(
        form.id,
        answers,
        {
          name: participantName.trim(),
          email: participantEmail.trim()
        },
        user
      );

      if (result.success) {
        setSubmitted(true);
        showToast('Response recorded successfully!', 'success');
      } else {
        showToast(result.error || 'Submission failed.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error submitting response.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setErrors({});
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Form Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          This form may have been removed or the link is incorrect.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Check deadline / status
  const isExpired = form.settings.deadline && new Date() > new Date(form.settings.deadline);
  const isClosed = form.status === 'closed' || isExpired;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-[11px] font-medium text-slate-400">
          Powered by <strong className="text-slate-700">FormFlow</strong>
        </span>
      </div>

      {/* Closed Banner if applicable */}
      {isClosed && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Form Closed</p>
            <p className="mt-0.5">
              {isExpired
                ? 'The registration deadline has passed. This form is no longer accepting submissions.'
                : 'The organizers have closed submissions for this form.'}
            </p>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION SCREEN */}
      {submitted ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center space-y-4 animate-in fade-in zoom-in-95 border-t-8 border-t-teal-600">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {form.settings.isEvent ? 'Registration Confirmed!' : 'Response Recorded'}
          </h2>

          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Thank you for completing <strong>{form.title}</strong>. Your submission has been securely stored in the system.
          </p>

          {form.settings.isEvent && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-left text-xs max-w-sm mx-auto space-y-1.5 text-teal-950">
              <p className="font-bold text-teal-900">Event Details:</p>
              {form.settings.eventDate && (
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>{new Date(form.settings.eventDate).toLocaleString()}</span>
                </p>
              )}
              {form.settings.eventVenue && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>{form.settings.eventVenue}</span>
                </p>
              )}
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-3">
            {form.settings.allowMultipleResponses && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
              >
                Submit another response
              </button>
            )}
            <button
              onClick={onBack}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
            >
              Back to Forms
            </button>
          </div>
        </div>
      ) : (
        /* FORM RESPONDER VIEW */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 border-t-8 border-t-teal-600 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {form.title}
            </h1>

            {form.description && (
              <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {form.description}
              </p>
            )}

            {/* Event Specific Banner */}
            {form.settings.isEvent && (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {form.settings.eventDate && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>{new Date(form.settings.eventDate).toLocaleString()}</span>
                  </div>
                )}
                {form.settings.eventVenue && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>{form.settings.eventVenue}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 text-[11px] text-rose-500 font-medium">
              * Indicates required question
            </div>
          </div>

          {/* Event Participant Contact Fields */}
          {form.settings.isEvent && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Participant Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={participantName}
                    onChange={e => setParticipantName(e.target.value)}
                    placeholder="Your legal or preferred name"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  {errors['participant_name'] && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors['participant_name']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={participantEmail}
                    onChange={e => setParticipantEmail(e.target.value)}
                    placeholder="your.email@college.edu"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  {errors['participant_email'] && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors['participant_email']}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Questions Renderers */}
          {(form.questions || []).map((q, idx) => {
            const hasError = Boolean(errors[q.id]);

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border p-6 shadow-sm transition space-y-3 ${
                  hasError ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-start gap-1">
                    <span>{idx + 1}. {q.title}</span>
                    {q.required && <span className="text-rose-500">*</span>}
                  </h3>
                  {q.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{q.description}</p>
                  )}
                </div>

                {/* 1. Short answer */}
                {q.type === 'short_answer' && (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    placeholder="Your answer"
                    className="w-full sm:w-2/3 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                )}

                {/* 2. Paragraph */}
                {q.type === 'paragraph' && (
                  <textarea
                    rows={3}
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    placeholder="Your answer"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                  />
                )}

                {/* 3. Multiple Choice */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={e => handleTextAnswer(q.id, e.target.value)}
                          className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 4. Checkboxes */}
                {q.type === 'checkboxes' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => {
                      const selected = Array.isArray(answers[q.id]) && answers[q.id].includes(opt);
                      return (
                        <label
                          key={optIdx}
                          className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={e => handleCheckboxAnswer(q.id, opt, e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 5. Dropdown */}
                {q.type === 'dropdown' && (
                  <select
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    className="w-full sm:w-2/3 px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">Choose an option...</option>
                    {(q.options || []).map((opt, optIdx) => (
                      <option key={optIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* 6. Date */}
                {q.type === 'date' && (
                  <input
                    type="date"
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    className="px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                )}

                {/* 7. Linear Scale */}
                {q.type === 'linear_scale' && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                      <span>{q.scaleMinLabel || String(q.scaleMin ?? 1)}</span>
                      <span>{q.scaleMaxLabel || String(q.scaleMax ?? 5)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 sm:gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {Array.from(
                        { length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 },
                        (_, i) => (q.scaleMin ?? 1) + i
                      ).map(num => (
                        <label
                          key={num}
                          className="flex flex-col items-center gap-1.5 cursor-pointer flex-1"
                        >
                          <span className="text-xs font-semibold text-slate-700">{num}</span>
                          <input
                            type="radio"
                            name={`scale-${q.id}`}
                            value={num}
                            checked={Number(answers[q.id]) === num}
                            onChange={() => handleTextAnswer(q.id, String(num))}
                            className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {hasError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500 pt-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors[q.id]}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting || Boolean(isClosed)}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Response'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear form</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
