import React, { useState } from 'react';
import { X, UserPlus, Users, Trash2, Shield, Mail } from 'lucide-react';
import { Form, CollaboratorRole } from '../../types';
import { formService } from '../../services/formService';
import { useToast } from '../../context/ToastContext';

interface CollaboratorModalProps {
  form: Form;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedForm: Form) => void;
}

export const CollaboratorModal: React.FC<CollaboratorModalProps> = ({
  form,
  isOpen,
  onClose,
  onUpdated
}) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('editor');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await formService.addCollaborator(form.id, email.trim(), role);
      showToast(`Added ${email} as collaborator (${role})`, 'success');
      setEmail('');
      const refreshed = await formService.getFormById(form.id);
      if (refreshed) onUpdated(refreshed);
    } catch (err: any) {
      showToast(err?.message || 'Failed to add collaborator', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (collabId: string, collabEmail: string) => {
    try {
      await formService.removeCollaborator(form.id, collabId);
      showToast(`Removed ${collabEmail}`, 'info');
      const refreshed = await formService.getFormById(form.id);
      if (refreshed) onUpdated(refreshed);
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove collaborator', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manage Form Collaborators</h2>
              <p className="text-xs text-slate-500">Allow other organizers to edit or view this form</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Add form */}
          <form onSubmit={handleAdd} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Invite Organizer by Email</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="organizer@college.edu"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <select
                value={role}
                onChange={e => setRole(e.target.value as CollaboratorRole)}
                className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Current Collaborators List */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Active Collaborators
            </h3>

            {/* Form Creator Row */}
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs mb-2">
              <div>
                <span className="font-semibold text-slate-900 block">
                  {form.creatorProfile?.fullName || 'Form Creator'}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {form.creatorProfile?.email || 'Owner'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold text-[10px] uppercase">
                Owner
              </span>
            </div>

            {/* List */}
            {(!form.collaborators || form.collaborators.length === 0) ? (
              <p className="text-xs text-slate-400 italic text-center py-3">
                No external collaborators invited yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {form.collaborators.map(c => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{c.userEmail}</p>
                      <span className="text-[10px] text-teal-700 font-semibold uppercase">
                        Role: {c.role}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemove(c.id, c.userEmail)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Remove Collaborator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
