import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { FormBuilderView } from './components/builder/FormBuilderView';
import { FormResponderView } from './components/responder/FormResponderView';
import { ResponsesView } from './components/responses/ResponsesView';
import { AuthModal } from './components/auth/AuthModal';
import { NewFormModal } from './components/dashboard/NewFormModal';
import { ConfigGuideModal } from './components/common/ConfigGuideModal';
import { Form } from './types';
import { formService } from './services/formService';

type ViewMode = 'dashboard' | 'builder' | 'responder' | 'responses';

const FormFlowApp: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<Form | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNewFormModalOpen, setIsNewFormModalOpen] = useState(false);
  const [isConfigGuideOpen, setIsConfigGuideOpen] = useState(false);

  // Check URL query parameters (e.g. ?form=xxx for direct share links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const formParam = params.get('form');
    if (formParam) {
      setSelectedFormId(formParam);
      setCurrentView('responder');
    }
  }, []);

  // Fetch forms whenever user or currentView changes
  useEffect(() => {
    let isMounted = true;
    const fetchForms = async () => {
      setLoading(true);
      try {
        const data = await formService.getForms(user);
        if (isMounted) setForms(data);
      } catch (err) {
        console.error('Failed to load forms:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchForms();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await formService.getForms(user);
      setForms(data);
    } catch (err) {
      console.error('Failed to load forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (view: string, formId?: string) => {
    if (formId) setSelectedFormId(formId);
    setCurrentView(view as ViewMode);
    if (view === 'dashboard') {
      // Clear URL query param if returning to dashboard
      window.history.replaceState({}, '', window.location.pathname);
      loadForms();
    }
  };

  const handleOpenBuilder = async (formId: string) => {
    setSelectedFormId(formId);
    const found = await formService.getFormById(formId);
    if (found) {
      setActiveForm(found);
      setCurrentView('builder');
    }
  };

  const handleOpenResponder = (formId: string) => {
    setSelectedFormId(formId);
    setCurrentView('responder');
  };

  const handleOpenResponses = (formId: string) => {
    setSelectedFormId(formId);
    setCurrentView('responses');
  };

  const handleFormCreated = (created: Form) => {
    setActiveForm(created);
    setSelectedFormId(created.id);
    setCurrentView('builder');
    loadForms();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Inter',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenNewFormModal={() => setIsNewFormModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenConfigGuide={() => setIsConfigGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && currentView === 'dashboard' ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading forms and registrations...</p>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <DashboardView
                forms={forms}
                currentUser={user}
                onOpenFormBuilder={handleOpenBuilder}
                onOpenFormResponder={handleOpenResponder}
                onOpenResponses={handleOpenResponses}
                onOpenNewFormModal={() => setIsNewFormModalOpen(true)}
                onRefreshForms={loadForms}
              />
            )}

            {currentView === 'builder' && activeForm && (
              <FormBuilderView
                form={activeForm}
                onBack={() => handleNavigate('dashboard')}
                onPreview={handleOpenResponder}
                onViewResponses={handleOpenResponses}
                onUpdated={updated => {
                  setActiveForm(updated);
                  loadForms();
                }}
              />
            )}

            {currentView === 'responder' && selectedFormId && (
              <FormResponderView
                formId={selectedFormId}
                onBack={() => handleNavigate('dashboard')}
              />
            )}

            {currentView === 'responses' && selectedFormId && (
              <ResponsesView
                formId={selectedFormId}
                onBack={() => handleNavigate('dashboard')}
                onOpenForm={handleOpenResponder}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 FormFlow Pro. Enterprise Forms & Event Management.</p>
          <p className="flex items-center gap-2">
            <span>React + TypeScript + Vite</span>
            <span>•</span>
            <span>Supabase Cloud / Local Store</span>
          </p>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <NewFormModal
        isOpen={isNewFormModalOpen}
        onClose={() => setIsNewFormModalOpen(false)}
        onFormCreated={handleFormCreated}
      />

      <ConfigGuideModal
        isOpen={isConfigGuideOpen}
        onClose={() => setIsConfigGuideOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <FormFlowApp />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
