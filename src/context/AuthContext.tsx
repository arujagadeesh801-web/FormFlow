import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_PROFILES } from '../lib/mockData';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isSupabaseLive: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password?: string, fullName?: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoUser: (user: UserProfile | null) => void;
  availableDemoUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Alex Rivera (Organizer) for a great immediate experience
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
  const isSupabaseLive = isSupabaseConfigured();

  useEffect(() => {
    let mounted = true;
    if (isSupabaseLive && supabase) {
      // Safety timeout to ensure loading never hangs on slow networks
      const safetyTimer = setTimeout(() => {
        if (mounted) setLoading(false);
      }, 2500);

      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        clearTimeout(safetyTimer);
        if (session?.user) {
          fetchSupabaseProfile(session.user.id, session.user.email || '');
        } else {
          setLoading(false);
        }
      }).catch((err) => {
        if (!mounted) return;
        clearTimeout(safetyTimer);
        console.warn('Session check warning:', err);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          fetchSupabaseProfile(session.user.id, session.user.email || '');
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
  }, [isSupabaseLive]);

  const fetchSupabaseProfile = async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        const fallbackUser: UserProfile = {
          id: userId,
          email,
          fullName: email.split('@')[0],
          role: 'organizer'
        };
        setUser(fallbackUser);
      } else {
        setUser({
          id: data.id,
          email: data.email,
          fullName: data.full_name || data.email,
          role: data.role,
          avatarUrl: data.avatar_url
        });
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password = 'password123') => {
    if (isSupabaseLive && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return;
    }

    // Local mode
    const matched = INITIAL_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setUser(matched);
      localStorage.setItem('formflow_active_user', JSON.stringify(matched));
    } else {
      const newUser: UserProfile = {
        id: 'user-' + Math.random().toString(36).substring(2, 7),
        email,
        fullName: email.split('@')[0],
        role: 'organizer'
      };
      setUser(newUser);
      localStorage.setItem('formflow_active_user', JSON.stringify(newUser));
    }
  };

  const signUp = async (
    email: string,
    password = 'password123',
    fullName = 'Organizer',
    role: UserRole = 'organizer'
  ) => {
    if (isSupabaseLive && supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role
          }
        }
      });
      if (error) throw error;
      return;
    }

    // Local mode
    const newUser: UserProfile = {
      id: 'user-' + Math.random().toString(36).substring(2, 7),
      email,
      fullName: fullName || email.split('@')[0],
      role
    };
    setUser(newUser);
    localStorage.setItem('formflow_active_user', JSON.stringify(newUser));
  };

  const signOut = async () => {
    if (isSupabaseLive && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('formflow_active_user');
  };

  const switchDemoUser = (demoUser: UserProfile | null) => {
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
        signIn,
        signUp,
        signOut,
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
