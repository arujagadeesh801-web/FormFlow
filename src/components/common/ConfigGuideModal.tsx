import React, { useState } from 'react';
import { X, Copy, Check, Database, Shield, Terminal, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { isSupabaseConfigured, checkSupabaseConnection } from '../../lib/supabase';

interface ConfigGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigGuideModal: React.FC<ConfigGuideModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const isConfigured = isSupabaseConfigured();

  if (!isOpen) return null;

  const envSample = `VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supabase & Database Configuration</h2>
              <p className="text-xs text-slate-500">Dual-Mode: Zero-Config Local fallback or Live PostgreSQL Cloud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm text-slate-700">
          {/* Status banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <Shield className="w-5 h-5 mt-0.5 text-current shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-xs uppercase tracking-wider">
                {isConfigured ? 'Supabase Configuration Detected' : 'Local High-Performance Mode Active'}
              </p>
              <p className="text-xs mt-1 leading-relaxed">
                {isConfigured
                  ? 'FormFlow detected Supabase environment variables in .env and initializes the client for PostgreSQL with Row Level Security (RLS).'
                  : 'FormFlow is currently running with full local reactivity. You can create forms, collect responses, simulate event registrations, and test RBAC permissions without waiting for cloud credentials.'}
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

          {/* Steps to connect */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-2">How to Connect your Supabase Project</h3>
            <ol className="space-y-3 text-xs leading-relaxed text-slate-600 list-decimal list-inside">
              <li>
                Create a project at{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-600 font-medium underline inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>
                Open the <strong>SQL Editor</strong> in Supabase dashboard and execute the migration script in:
                <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">
                  supabase/schema.sql
                </code>
              </li>
              <li>
                Copy your <strong>Project URL</strong> and <strong>Anon Public / Publishable Key</strong> from <strong>Project Settings &gt; API</strong>.
                <div className="mt-1 text-slate-500 italic">
                  Note: Never use the service_role secret key in frontend applications.
                </div>
              </li>
              <li>
                Paste them into your <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">.env</code> file in the project root:
              </li>
            </ol>
          </div>

          {/* Code snippet */}
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

          {/* Android ARM64 Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Terminal className="w-4 h-4 text-teal-600" />
              <span>Android ARM64 PRoot Compatibility Note</span>
            </div>
            <p>
              Direct frontend-to-Supabase communication avoids running heavy background PostgreSQL and ORM engines on the mobile device, keeping memory usage minimal and responsive.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
};
