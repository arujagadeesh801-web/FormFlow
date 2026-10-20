import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
  UserCheck,
  XCircle,
  BarChart3
} from 'lucide-react';
import { Form, FormResponse, RegistrationStatus, Question } from '../../types';
import { formService } from '../../services/formService';
import { exportResponsesToCsv } from '../../utils/exportCsv';
import { useToast } from '../../context/ToastContext';

interface ResponsesViewProps {
  formId: string;
  onBack: () => void;
  onOpenForm: (formId: string) => void;
}

export const ResponsesView: React.FC<ResponsesViewProps> = ({
  formId,
  onBack,
  onOpenForm
}) => {
  const { showToast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'individual' | 'attendance'>('summary');
  const [individualIndex, setIndividualIndex] = useState(0);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | RegistrationStatus>('all');

  useEffect(() => {
    loadData();
  }, [formId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [formData, respData] = await Promise.all([
        formService.getFormById(formId),
        formService.getFormResponses(formId)
      ]);
      setForm(formData);
      setResponses(respData);
      if (formData?.settings.isEvent) {
        // default to attendance or summary
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load responses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (responseId: string, newStatus: RegistrationStatus) => {
    try {
      await formService.updateAttendance(formId, responseId, newStatus);
      showToast(`Updated participant status to ${newStatus}`, 'success');
      // Refresh responses
      const updated = await formService.getFormResponses(formId);
      setResponses(updated);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update attendance', 'error');
    }
  };

  const handleExportCsv = () => {
    if (!form) return;
    exportResponsesToCsv(form, form.questions || [], responses);
    showToast('Exported CSV successfully!', 'success');
  };

  // Filtered participants for attendance table
  const filteredAttendance = useMemo(() => {
    return responses.filter(r => {
      const matchesSearch =
        (r.participantName || '').toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        (r.respondentEmail || '').toLowerCase().includes(attendanceSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (attendanceFilter !== 'all' && (r.registrationStatus || 'registered') !== attendanceFilter) {
        return false;
      }
      return true;
    });
  }, [responses, attendanceSearch, attendanceFilter]);

  // Attendance stats
  const attendanceStats = useMemo(() => {
    const total = responses.length;
    const attended = responses.filter(r => r.registrationStatus === 'attended').length;
    const confirmed = responses.filter(r => r.registrationStatus === 'confirmed').length;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, attended, confirmed, rate };
  }, [responses]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading response analytics...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto my-12">
        <h3 className="text-base font-bold text-slate-900">Form Not Found</h3>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentIndividualResponse = responses[individualIndex];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 truncate max-w-md">{form.title}</h1>
            <p className="text-xs text-slate-500">
              {responses.length} total response{responses.length === 1 ? '' : 's'} recorded
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenForm(form.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <Eye className="w-3.5 h-3.5 text-teal-600" />
            <span>Open Form</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={responses.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'summary'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Summary Analytics
        </button>

        <button
          onClick={() => setActiveTab('individual')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'individual'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Individual ({responses.length})
        </button>

        {form.settings.isEvent && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Event Attendance</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {responses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Waiting for responses</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No one has submitted a response yet. Share your form link with participants to collect answers.
          </p>
          <button
            onClick={() => onOpenForm(form.id)}
            className="px-4 py-2 bg-teal-600 text-white font-semibold text-xs rounded-lg transition"
          >
            Submit a test response
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: SUMMARY ANALYTICS */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              {/* Event Attendance Quick Card (if event) */}
              {form.settings.isEvent && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Registered</span>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">{attendanceStats.total}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Confirmed</span>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">{attendanceStats.confirmed}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Attended</span>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">{attendanceStats.attended}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Turnout Rate</span>
                    <p className="text-xl font-bold text-teal-600 mt-0.5">{attendanceStats.rate}%</p>
                  </div>
                </div>
              )}

              {/* Questions Breakdown */}
              {(form.questions || []).map((q, idx) => {
                // Calculate answer distribution
                const answerValues = responses
                  .map(r => r.answers[q.id])
                  .filter(v => v !== undefined && v !== null && v !== '');

                const countMap: Record<string, number> = {};
                let numericSum = 0;
                let numericCount = 0;

                answerValues.forEach(val => {
                  if (Array.isArray(val)) {
                    val.forEach(item => {
                      countMap[item] = (countMap[item] || 0) + 1;
                    });
                  } else {
                    const str = String(val);
                    countMap[str] = (countMap[str] || 0) + 1;
                    if (q.type === 'linear_scale') {
                      const n = Number(val);
                      if (!isNaN(n)) {
                        numericSum += n;
                        numericCount++;
                      }
                    }
                  }
                });

                const averageScale = numericCount > 0 ? (numericSum / numericCount).toFixed(1) : null;

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {idx + 1}. {q.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {answerValues.length} response{answerValues.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
                        {q.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Chart / Visual for Choice & Dropdown questions */}
                    {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && (
                      <div className="space-y-2.5 pt-2">
                        {(q.options || []).map((opt, optIdx) => {
                          const count = countMap[opt] || 0;
                          const total = answerValues.length || 1;
                          const percentage = Math.round((count / total) * 100);

                          return (
                            <div key={optIdx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-slate-700">
                                <span className="font-medium truncate max-w-sm">{opt}</span>
                                <span className="font-semibold text-slate-500 ml-2">
                                  {count} ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-teal-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Linear Scale Breakdown */}
                    {q.type === 'linear_scale' && (
                      <div className="space-y-3 pt-2">
                        {averageScale && (
                          <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg text-teal-900">
                            <span className="text-xs font-semibold">Average rating:</span>
                            <span className="text-base font-bold">{averageScale} / {q.scaleMax ?? 5}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center">
                          {Array.from(
                            { length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 },
                            (_, i) => (q.scaleMin ?? 1) + i
                          ).map(num => {
                            const count = countMap[String(num)] || 0;
                            return (
                              <div key={num} className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="block text-xs font-bold text-slate-800">{num}</span>
                                <span className="text-[10px] text-teal-700 font-semibold">{count} votes</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Text Responses List */}
                    {['short_answer', 'paragraph', 'date'].includes(q.type) && (
                      <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                        {answerValues.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No answers submitted.</p>
                        ) : (
                          answerValues.map((val, valIdx) => (
                            <div
                              key={valIdx}
                              className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-100"
                            >
                              {String(val)}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: INDIVIDUAL RESPONSES */}
          {activeTab === 'individual' && currentIndividualResponse && (
            <div className="space-y-4">
              {/* Stepper bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    disabled={individualIndex === 0}
                    onClick={() => setIndividualIndex(prev => prev - 1)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-semibold text-slate-800">
                    Response {individualIndex + 1} of {responses.length}
                  </span>
                  <button
                    disabled={individualIndex === responses.length - 1}
                    onClick={() => setIndividualIndex(prev => prev + 1)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <span>Submitted {new Date(currentIndividualResponse.submittedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Individual Respondent Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentIndividualResponse.participantName || 'Anonymous Respondent'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentIndividualResponse.respondentEmail || 'No email associated'}
                    </p>
                  </div>

                  {form.settings.isEvent && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        currentIndividualResponse.registrationStatus === 'attended'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-teal-50 text-teal-800 border-teal-300'
                      }`}
                    >
                      {currentIndividualResponse.registrationStatus}
                    </span>
                  )}
                </div>

                {/* Answers List */}
                <div className="space-y-4 pt-2">
                  {(form.questions || []).map((q, qIdx) => {
                    const ans = currentIndividualResponse.answers[q.id];
                    let displayAns = 'No answer provided';
                    if (ans !== undefined && ans !== null && ans !== '') {
                      displayAns = Array.isArray(ans) ? ans.join(', ') : String(ans);
                    }

                    return (
                      <div key={q.id} className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700">
                          {qIdx + 1}. {q.title}
                        </p>
                        <p className="text-xs text-slate-900 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          {displayAns}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVENT ATTENDANCE & CHECK-IN (Event mode) */}
          {activeTab === 'attendance' && form.settings.isEvent && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={attendanceSearch}
                    onChange={e => setAttendanceSearch(e.target.value)}
                    placeholder="Search by participant name or email..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {(['all', 'registered', 'confirmed', 'attended', 'cancelled'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setAttendanceFilter(st)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                        attendanceFilter === st
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Participant</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Registered At</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                            No participants match the search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {p.participantName || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                              {p.respondentEmail || 'Anonymous'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {new Date(p.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  p.registrationStatus === 'attended'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : p.registrationStatus === 'confirmed'
                                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                                    : p.registrationStatus === 'cancelled'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {p.registrationStatus === 'attended' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {p.registrationStatus || 'registered'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1">
                              {p.registrationStatus !== 'attended' ? (
                                <button
                                  onClick={() => handleStatusChange(p.id, 'attended')}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-xs"
                                >
                                  Check In
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(p.id, 'confirmed')}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                                >
                                  Undo Check-in
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
