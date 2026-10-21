import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Users,
  Search,
  Plus,
  Share2,
  Eye,
  BarChart2,
  Copy,
  Trash2,
  Clock,
  MapPin,
  Lock,
  Globe,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Database,
  UploadCloud,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { Form, UserProfile } from '../../types';
import { formService } from '../../services/formService';
import { useToast } from '../../context/ToastContext';
import { isSupabaseConfigured } from '../../lib/supabase';

interface DashboardViewProps {
  forms: Form[];
  currentUser: UserProfile | null;
  onOpenFormBuilder: (formId: string) => void;
  onOpenFormResponder: (formId: string) => void;
  onOpenResponses: (formId: string) => void;
  onOpenNewFormModal: () => void;
  onRefreshForms: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  forms,
  currentUser,
  onOpenFormBuilder,
  onOpenFormResponder,
  onOpenResponses,
  onOpenNewFormModal,
  onRefreshForms
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'published' | 'draft' | 'closed' | 'events'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeedStarterForms = async () => {
    if (!currentUser) return;
    setSeeding(true);
    try {
      const res = await formService.seedStarterFormsToSupabase(currentUser);
      if (res.success) {
        showToast(res.message, 'success');
        onRefreshForms();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync starter forms', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // Stats calculation
  const totalSubmissions = useMemo(() => {
    return forms.reduce((acc, f) => acc + (f.responseCount || 0), 0);
  }, [forms]);

  const activeEventsCount = useMemo(() => {
    return forms.filter(f => f.settings.isEvent && f.status === 'published').length;
  }, [forms]);

  // Filtered forms
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchesSearch =
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'published') return f.status === 'published';
      if (filterType === 'draft') return f.status === 'draft';
      if (filterType === 'closed') return f.status === 'closed';
      if (filterType === 'events') return f.settings.isEvent;

      return true;
    });
  }, [forms, searchQuery, filterType]);

  const handleDuplicate = async (formId: string) => {
    if (!currentUser) return;
    try {
      const duplicated = await formService.duplicateForm(formId, currentUser);
      showToast(`Duplicated as "${duplicated.title}"`, 'success');
      onRefreshForms();
    } catch (err: any) {
      showToast(err?.message || 'Failed to duplicate form', 'error');
    }
  };

  const handleDelete = async (formId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await formService.deleteForm(formId);
      showToast('Form deleted successfully.', 'success');
      onRefreshForms();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete form', 'error');
    }
  };

  const handleCopyShareLink = (formId: string) => {
    const url = `${window.location.origin}?form=${formId}`;
    navigator.clipboard.writeText(url);
    showToast('Shareable form link copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Form & Event Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {currentUser
              ? `Signed in as ${currentUser.fullName} (${currentUser.role})`
              : 'Viewing publicly available published forms'}
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {currentUser.role === 'admin' && isSupabaseConfigured() && (
              <button
                onClick={handleSeedStarterForms}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg shadow-xs transition disabled:opacity-50"
                title="Preserves existing database forms while ensuring default university starter forms exist"
              >
                <UploadCloud className={`w-3.5 h-3.5 text-teal-600 ${seeding ? 'animate-bounce' : ''}`} />
                <span>{seeding ? 'Syncing...' : 'Sync Starter Forms to DB'}</span>
              </button>
            )}

            <button
              onClick={onOpenNewFormModal}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Form</span>
            </button>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Forms</span>
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{forms.length}</p>
          <span className="text-xs text-slate-400 mt-1 block">Active across all categories</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Responses</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalSubmissions}</p>
          <span className="text-xs text-slate-400 mt-1 block">Submissions & registrations</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Events</span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeEventsCount}</p>
          <span className="text-xs text-slate-400 mt-1 block">Open event registrations</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Role Access</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-lg font-bold text-slate-900 capitalize">
            {currentUser?.role || 'Guest'}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            {currentUser?.role === 'admin'
              ? 'Full management privileges'
              : currentUser?.role === 'organizer'
              ? 'Can create & manage own forms'
              : 'Public respondent view'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search forms by title, keyword, or description..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Forms' },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Drafts' },
            { id: 'closed', label: 'Closed' },
            { id: 'events', label: 'Events' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                filterType === tab.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No forms found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery
              ? `No forms match your search query "${searchQuery}". Try clearing the search filter.`
              : 'No forms are currently available under this category.'}
          </p>
          {currentUser && (
            <button
              onClick={onOpenNewFormModal}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition"
            >
              Create your first form
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map(form => {
            const isOwnerOrEditor =
              currentUser?.role === 'admin' ||
              form.createdBy === currentUser?.id ||
              form.collaborators?.some(c => c.userEmail === currentUser?.email || c.userId === currentUser?.id);

            return (
              <div
                key={form.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group"
              >
                {/* Form Card Top Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Status Pill */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          form.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : form.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {form.status}
                      </span>

                      {/* Event Badge */}
                      {form.settings.isEvent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          Event
                        </span>
                      )}

                      {/* Public / Private Pill */}
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        {form.settings.isPublic ? (
                          <Globe className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Lock className="w-3 h-3 text-slate-400" />
                        )}
                      </span>
                    </div>

                    {/* Action Dropdown Toggle */}
                    {isOwnerOrEditor && (
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === form.id ? null : form.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === form.id && (
                          <div
                            className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20 animate-in fade-in"
                            onMouseLeave={() => setActiveMenuId(null)}
                          >
                            <button
                              onClick={() => {
                                handleDuplicate(form.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Duplicate Form</span>
                            </button>
                            <button
                              onClick={() => {
                                handleCopyShareLink(form.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Copy Share Link</span>
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              onClick={() => {
                                handleDelete(form.id, form.title);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Form</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Form Title & Description */}
                  <h3
                    onClick={() => isOwnerOrEditor ? onOpenFormBuilder(form.id) : onOpenFormResponder(form.id)}
                    className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition cursor-pointer line-clamp-1"
                  >
                    {form.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {form.description || 'No description provided.'}
                  </p>

                  {/* Event Metadata (Date, Venue) */}
                  {form.settings.isEvent && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      {form.settings.eventDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{new Date(form.settings.eventDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        </div>
                      )}
                      {form.settings.eventVenue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{form.settings.eventVenue}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer with Response Count & Quick Buttons */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{form.responseCount || 0} responses</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Share Button */}
                    <button
                      onClick={() => handleCopyShareLink(form.id)}
                      title="Copy Public Link"
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* View Respondent Form */}
                    <button
                      onClick={() => onOpenFormResponder(form.id)}
                      title="Open Public Form"
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Analytics / Responses */}
                    {isOwnerOrEditor && (
                      <button
                        onClick={() => onOpenResponses(form.id)}
                        title="View Responses & Analytics"
                        className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Open Builder */}
                    {isOwnerOrEditor && (
                      <button
                        onClick={() => onOpenFormBuilder(form.id)}
                        className="ml-1 px-2.5 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-md transition shadow-xs"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
