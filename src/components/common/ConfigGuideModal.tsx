import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Database,
  Shield,
  Terminal,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  FileCode,
  UserCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { isSupabaseConfigured, checkSupabaseConnection, supabase } from '../../lib/supabase';
import { DESIGNATED_ADMIN_EMAIL } from '../../context/AuthContext';

interface ConfigGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigGuideModal: React.FC<ConfigGuideModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'admin_guide' | 'migration_sql'>('overview');
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPromoteSql, setCopiedPromoteSql] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Admin status check state
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminStatusResult, setAdminStatusResult] = useState<{
    exists: boolean;
    role?: string;
    message: string;
  } | null>(null);

  const isConfigured = isSupabaseConfigured();

  if (!isOpen) return null;

  const envSample = `VITE_SUPABASE_URL=https://sxqioipucpsvvnbgpdpc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rHVRxwvS7ri7H9yW2fDyeg_yFitfqad`;

  const promoteSqlSnippet = `-- Execute in Supabase SQL Editor to promote verified arujagadeesh801@gmail.com:
SELECT public.promote_designated_admin('arujagadeesh801@gmail.com');`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await checkSupabaseConnection();
      setTestResult(res);
      if (res.ok) {
        showToast('Connected to Supabase PostgreSQL!', 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleCheckAdminStatus = async () => {
    if (!isConfigured || !supabase) {
      setAdminStatusResult({
        exists: false,
        message: 'Supabase is not configured yet. Set credentials in .env.'
      });
      return;
    }

    setCheckingAdmin(true);
    setAdminStatusResult(null);

    try {
      // Query profiles for arujagadeesh801@gmail.com
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('email', DESIGNATED_ADMIN_EMAIL.toLowerCase())
        .maybeSingle();

      if (error) {
        setAdminStatusResult({
          exists: false,
          message: `Query error (RLS active): Sign in as ${DESIGNATED_ADMIN_EMAIL} to view your live profile status.`
        });
      } else if (!data) {
        setAdminStatusResult({
          exists: false,
          message: `Account for ${DESIGNATED_ADMIN_EMAIL} has not registered yet. Click "Sign Up" in the navbar to register.`
        });
      } else {
        setAdminStatusResult({
          exists: true,
          role: data.role,
          message: `Profile exists with role: "${data.role.toUpperCase()}". ${
            data.role === 'admin'
              ? 'Admin status is active!'
              : 'Role is Organizer. Verify email or run promote SQL function to complete activation.'
          }`
        });
      }
    } catch (e: any) {
      setAdminStatusResult({
        exists: false,
        message: e?.message || 'Status check failed.'
      });
    } finally {
      setCheckingAdmin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supabase & RBAC Security Guide</h2>
              <p className="text-xs text-slate-500">PostgreSQL Cloud with Admin/Organizer RBAC & RLS Policies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/60 px-6 gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Connection & Status
          </button>
          <button
            onClick={() => setActiveTab('admin_guide')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'admin_guide'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Admin Verification Setup
          </button>
          <button
            onClick={() => setActiveTab('migration_sql')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'migration_sql'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            RLS SQL Migration
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-slate-700">
          {activeTab === 'overview' && (
            <>
              {/* Status banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <Shield className="w-5 h-5 mt-0.5 text-current shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-xs uppercase tracking-wider">
                    {isConfigured ? 'Supabase Cloud Configured' : 'Local High-Performance Mode Active'}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed">
                    {isConfigured
                      ? 'FormFlow is configured with live Supabase credentials. Forms, questions, responses, and registrations connect with PostgreSQL Row Level Security (RLS).'
                      : 'FormFlow is running in local reactive mode. Zero setup required to build forms and test RBAC.'}
                  </p>

                  {/* Test Connection Button */}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-3 py-1.5 bg-white text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                      <span>{testing ? 'Testing connection...' : 'Test Database Connection'}</span>
                    </button>
                  </div>

                  {testResult && (
                    <div className={`mt-2.5 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      testResult.ok
                        ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}>
                      {testResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Environment config */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Supabase Credentials (.env)</h3>
                <div className="relative rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                    <span>.env</span>
                    <button
                      onClick={() => copyToClipboard(envSample, setCopiedEnv)}
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedEnv ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="text-teal-300">{envSample}</pre>
                </div>
              </div>
            </>
          )}

          {activeTab === 'admin_guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-teal-950">
                  <KeyRound className="w-4 h-4 text-teal-700" />
                  <span>Designated Administrator: {DESIGNATED_ADMIN_EMAIL}</span>
                </div>
                <p className="leading-relaxed">
                  To prevent unauthorized privilege escalation, the <strong>Admin</strong> role can only be granted through a trusted database/server-side process after the email is verified in Supabase Auth.
                </p>
              </div>

              {/* Status Checker */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800">Admin Account Status Check</span>
                  <button
                    onClick={handleCheckAdminStatus}
                    disabled={checkingAdmin}
                    className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1 transition"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>{checkingAdmin ? 'Checking...' : 'Check Status'}</span>
                  </button>
                </div>

                {adminStatusResult && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                    adminStatusResult.exists && adminStatusResult.role === 'admin'
                      ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}>
                    {adminStatusResult.exists && adminStatusResult.role === 'admin' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span>{adminStatusResult.message}</span>
                  </div>
                )}
              </div>

              {/* Manual Setup Requirements */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Required Manual Supabase Setup
                </h4>
                <ol className="space-y-2.5 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
                  <li>
                    <strong>Email Confirmation Setting:</strong> In Supabase Dashboard &gt; <strong>Authentication</strong> &gt; <strong>Providers</strong> &gt; <strong>Email</strong>:
                    <ul className="list-disc list-inside ml-4 mt-1 text-slate-500 space-y-1">
                      <li>If <em>"Confirm email"</em> is <strong>ON</strong>: Registering creates the account with status pending confirmation. Clicking the email link immediately triggers the database promotion to <code>admin</code>.</li>
                      <li>If <em>"Confirm email"</em> is <strong>OFF</strong>: Account is verified immediately upon signup, and the trigger elevates role to <code>admin</code> at creation.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Execute Migration Script:</strong> Open Supabase SQL Editor and execute:
                    <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">
                      supabase/migrations/002_secure_admin_and_rls.sql
                    </code>
                  </li>
                  <li>
                    <strong>Server-side promotion helper:</strong> If the account was created before the trigger or needs explicit verification:
                  </li>
                </ol>

                <div className="relative rounded-xl bg-slate-900 text-slate-100 p-3.5 font-mono text-xs overflow-x-auto mt-2">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-slate-400 text-[11px]">
                    <span>Supabase SQL Editor</span>
                    <button
                      onClick={() => copyToClipboard(promoteSqlSnippet, setCopiedPromoteSql)}
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      {copiedPromoteSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPromoteSql ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="text-teal-300">{promoteSqlSnippet}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'migration_sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">PostgreSQL RLS & RBAC Migration</h4>
                  <p className="text-xs text-slate-500">
                    Located on disk at <code className="font-mono text-teal-700">supabase/migrations/002_secure_admin_and_rls.sql</code>
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800">What this migration does safely:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li><strong>Non-destructive:</strong> Does not drop tables or delete existing forms, responses, or profiles.</li>
                  <li><strong>Hardened functions:</strong> Configures <code>SECURITY DEFINER SET search_path = public</code>.</li>
                  <li><strong>Verification trigger:</strong> Automatically promotes <code>arujagadeesh801@gmail.com</code> when email is confirmed.</li>
                  <li><strong>Role protection:</strong> Blocks client-side privilege escalation on profiles.</li>
                  <li><strong>Airtight RLS:</strong> Organizers manage only their forms; Admins oversee university-wide forms.</li>
                </ul>
              </div>

              <div className="rounded-xl bg-slate-900 text-slate-200 p-3 text-xs font-mono">
                <p className="text-slate-400 text-[11px] mb-1">To apply in Supabase:</p>
                <p className="text-emerald-400">1. Go to Supabase Dashboard &gt; SQL Editor</p>
                <p className="text-emerald-400">2. Paste 002_secure_admin_and_rls.sql</p>
                <p className="text-emerald-400">3. Click "Run" (idempotent, safe to rerun anytime)</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            FormFlow Pro • Enterprise RBAC & Supabase Cloud
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
