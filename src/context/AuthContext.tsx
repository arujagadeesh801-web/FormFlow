import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_PROFILES } from '../lib/mockData';
import { generateUUID } from '../utils/uuid';

export const DESIGNATED_ADMIN_EMAIL = 'arujagadeesh801@gmail.com';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isSupabaseLive: boolean;
  isRealSession: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password?: string, fullName?: string, role?: UserRole) => Promise<{ needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchDemoUser: (user: UserProfile | null) => void;
  availableDemoUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Alex Rivera (Organizer) for demo testing unless an active user was saved
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('formflow_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_PROFILES[1];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isRealSession, setIsRealSession] = useState<boolean>(false);
  const isSupabaseLive = isSupabaseConfigured();

  const fetchSupabaseProfile = useCallback(async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        // Default new or un-synced user to organizer
        const fallbackUser: UserProfile = {
          id: userId,
          email,
          fullName: email.split('@')[0],
          role: 'organizer'
        };
        setUser(fallbackUser);
        setIsRealSession(true);
        localStorage.setItem('formflow_active_user', JSON.stringify(fallbackUser));
      } else {
        const liveUser: UserProfile = {
          id: data.id,
          email: data.email,
          fullName: data.full_name || data.email,
          role: data.role,
          avatarUrl: data.avatar_url
        };
        setUser(liveUser);
        setIsRealSession(true);
        localStorage.setItem('formflow_active_user', JSON.stringify(liveUser));
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (isSupabaseLive && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchSupabaseProfile(session.user.id, session.user.email || '');
      }
    }
  }, [isSupabaseLive, fetchSupabaseProfile]);

  useEffect(() => {
    let mounted = true;
    if (isSupabaseLive && supabase) {
      // Safety timeout to ensure loading never hangs on slow networks
      const safetyTimer = setTimeout(() => {
        if (mounted) setLoading(false);
      }, 3000);

      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        clearTimeout(safetyTimer);
        if (session?.user) {
          fetchSupabaseProfile(session.user.id, session.user.email || '');
        } else {
          setIsRealSession(false);
          setLoading(false);
        }
      }).catch((err) => {
        if (!mounted) return;
        clearTimeout(safetyTimer);
        console.warn('Session check warning:', err);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (session?.user) {
          fetchSupabaseProfile(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          setIsRealSession(false);
          setUser(null);
          localStorage.removeItem('formflow_active_user');
          setLoading(false);
        } else {
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        clearTimeout(safetyTimer);
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [isSupabaseLive, fetchSupabaseProfile]);

  const signIn = async (email: string, password = 'password123') => {
    if (isSupabaseLive && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data?.user) {
        await fetchSupabaseProfile(data.user.id, data.user.email || email);
      }
      return;
    }

    // Local mode
    const matched = INITIAL_PROFILES.find(p => p.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) {
      setUser(matched);
      setIsRealSession(false);
      localStorage.setItem('formflow_active_user', JSON.stringify(matched));
    } else {
      const isDesignated = email.trim().toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase();
      const newUser: UserProfile = {
        id: generateUUID(),
        email: email.trim(),
        fullName: email.split('@')[0],
        role: isDesignated ? 'admin' : 'organizer'
      };
      setUser(newUser);
      setIsRealSession(false);
      localStorage.setItem('formflow_active_user', JSON.stringify(newUser));
    }
  };

  const signUp = async (
    email: string,
    password = 'password123',
    fullName = 'Organizer',
    _requestedRole: UserRole = 'organizer'
  ): Promise<{ needsConfirmation?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseLive && supabase) {
      // Role is NEVER passed by client - backend PostgreSQL trigger strictly controls assignment.
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });
      if (error) throw error;

      const needsConfirmation = !data.session;
      if (data.user && data.session) {
        await fetchSupabaseProfile(data.user.id, data.user.email || cleanEmail);
      }

      return { needsConfirmation };
    }

    // Local mode
    const isDesignated = cleanEmail === DESIGNATED_ADMIN_EMAIL.toLowerCase();
    const newUser: UserProfile = {
      id: generateUUID(),
      email: cleanEmail,
      fullName: fullName.trim() || cleanEmail.split('@')[0],
      role: isDesignated ? 'admin' : 'organizer'
    };
    setUser(newUser);
    setIsRealSession(false);
    localStorage.setItem('formflow_active_user', JSON.stringify(newUser));
    return { needsConfirmation: false };
  };

  const signOut = async () => {
    if (isSupabaseLive && supabase) {
      await supabase.auth.signOut();
    }
    setIsRealSession(false);
    setUser(null);
    localStorage.removeItem('formflow_active_user');
  };

  const switchDemoUser = (demoUser: UserProfile | null) => {
    setIsRealSession(false);
    setUser(demoUser);
    if (demoUser) {
      localStorage.setItem('formflow_active_user', JSON.stringify(demoUser));
    } else {
      localStorage.removeItem('formflow_active_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseLive,
        isRealSession,
        signIn,
        signUp,
        signOut,
        refreshUser,
        switchDemoUser,
        availableDemoUsers: INITIAL_PROFILES
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
