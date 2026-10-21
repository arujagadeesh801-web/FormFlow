import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Users,
  ShieldCheck,
  LogOut,
  LogIn,
  Database,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth, DESIGNATED_ADMIN_EMAIL } from '../../context/AuthContext';
import { UserProfile } from '../../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, formId?: string) => void;
  onOpenNewFormModal: () => void;
  onOpenAuthModal: () => void;
  onOpenConfigGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenNewFormModal,
  onOpenAuthModal,
  onOpenConfigGuide
}) => {
  const {
    user,
    signOut,
    isSupabaseLive,
    isRealSession,
    refreshUser,
    switchDemoUser,
    availableDemoUsers
  } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm group-hover:bg-teal-700 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  FormFlow
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                    Pro
                  </span>
                </span>
                <p className="text-xs text-slate-500 hidden sm:block">Forms & Event Registrations</p>
              </div>
            </button>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  currentView === 'dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </button>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Backend Status indicator */}
            <button
              onClick={onOpenConfigGuide}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                isSupabaseLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to view Supabase connection setup & schema guide"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isSupabaseLive ? 'Supabase Live' : 'Local Mode (Zero-Config)'}
              </span>
              <HelpCircle className="w-3 h-3 text-slate-400" />
            </button>

            {/* Create Form Action */}
            {user && (
              <button
                onClick={onOpenNewFormModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Form</span>
              </button>
            )}

            {/* User Profile / Persona Switcher */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-semibold text-xs border border-teal-300">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                      {user.fullName}
                    </p>
                    <span className="text-[10px] text-teal-700 uppercase font-bold">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {showUserMenu && user && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.fullName}</p>
                      {isRealSession && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Live Auth
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                          Role: {user.role}
                        </span>
                      </div>
                      {isRealSession && (
                        <button
                          onClick={handleRefreshProfile}
                          disabled={refreshing}
                          className="text-[10px] text-slate-400 hover:text-teal-700 flex items-center gap-0.5 transition"
                          title="Refresh role from Supabase database"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                      )}
                    </div>

                    {user.email.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase() && (
                      <div className="mt-1.5 px-2 py-1 bg-teal-50 border border-teal-200 rounded text-[10px] text-teal-800 font-medium">
                        ⭐ Designated Primary Administrator
                      </div>
                    )}
                  </div>

                  {/* Switch Role / Persona for quick testing */}
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                      Switch Role Persona (Test RBAC)
                    </p>
                    <div className="space-y-1">
                      {availableDemoUsers.map(demoUser => (
                        <button
                          key={demoUser.id}
                          onClick={() => {
                            switchDemoUser(demoUser);
                            setShowUserMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition ${
                            user.id === demoUser.id
                              ? 'bg-teal-50 text-teal-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate">{demoUser.fullName}</span>
                            <span className="text-[10px] text-slate-400">({demoUser.role})</span>
                          </div>
                          {user.id === demoUser.id && (
                            <CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          switchDemoUser(null);
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-slate-600 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>Respondent / Anonymous Student</span>
                      </button>
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="pt-1 px-1">
                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
