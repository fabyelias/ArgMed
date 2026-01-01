import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const translateError = (message) => {
  if (!message) return "Ha ocurrido un error desconocido.";
  const msg = message.toLowerCase();
  if (msg.includes("security purposes") || msg.includes("rate limit")) return "Por motivos de seguridad, has realizado demasiados intentos. Espera unos segundos.";
  if (msg.includes("user already registered") || msg.includes("unique constraint") || msg.includes("duplicate key")) return "Este documento/email ya está registrado.";
  if (msg.includes("invalid login credentials")) return "Credenciales incorrectas.";
  return `Error: ${message}`;
};

export const AuthProvider = ({ children }) => {
  // Fix: Ensure all state is initialized properly
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  
  // Session Timeout Refs
  const lastActivity = useRef(Date.now());
  const timeoutId = useRef(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

  const clearAuthData = () => {
    setUser(null);
    setSession(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  // Activity Tracker for Timeout
  const resetActivity = () => {
    lastActivity.current = Date.now();
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetActivity();

    events.forEach(event => window.addEventListener(event, handleActivity));

    const checkInactivity = async () => {
      if (!user) return;
      if (user.role === 'legal_admin') return;

      const now = Date.now();
      if (now - lastActivity.current > INACTIVITY_LIMIT) {
        console.log("Session timed out due to inactivity");
        await logout();
        window.location.href = '/auth';
      }
    };

    timeoutId.current = setInterval(checkInactivity, 60000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timeoutId.current) clearInterval(timeoutId.current);
    };
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const isSessionActive = sessionStorage.getItem('argmed_session_active');
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          
          if (profile?.role !== 'legal_admin' && !isSessionActive) {
            console.log("Browser closed, clearing session for non-legal user");
            await supabase.auth.signOut();
            clearAuthData();
            setLoading(false);
            return;
          }

          sessionStorage.setItem('argmed_session_active', 'true');
          setSession(session);
          await fetchUserProfile(session.user.id, session.user.email);
        } else {
          clearAuthData();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        clearAuthData();
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN') {
        sessionStorage.setItem('argmed_session_active', 'true');
      }

      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId, email) => {
    try {
      const { data: profileData, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (error || !profileData) {
        if (!profileData && session) {
             console.warn("User authenticated but no profile found.");
        }
        return;
      }

      let extendedData = {};
      if (profileData.role === 'doctor') {
        const { data: profData } = await supabase.from('professionals').select('*').eq('id', userId).maybeSingle();
        extendedData = profData || {};
      } else if (profileData.role === 'patient') {
        const { data: userData } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        extendedData = userData || {};
      } else if (profileData.role === 'legal_admin') {
         const { data: legalData } = await supabase.from('legal_team').select('*').eq('id', userId).maybeSingle();
         extendedData = legalData || {};
      }

      // Fix: Preserve the role from profiles table, preventing it from being overridden by extendedData
      setUser({ ...profileData, ...extendedData, email, role: profileData.role });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const login = async (emailOrId, password, expectedRole = null) => {
    try {
      let loginEmail = emailOrId;
      
      const isEmail = emailOrId.includes('@');
      
      if (!isEmail && /^\d+$/.test(emailOrId)) {
          loginEmail = `${emailOrId}@argmed.online`;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      
      if (!profile) {
          await supabase.auth.signOut();
          throw new Error("Esta cuenta ha sido eliminada permanentemente.");
      }

      if (expectedRole && profile.role !== expectedRole) {
        await supabase.auth.signOut();
        throw new Error(`Cuenta no registrada como ${expectedRole}.`);
      }

      if (profile.role === 'doctor') {
        await supabase.rpc('register_current_user_as_doctor');

        const { data: profData } = await supabase.from('professionals').select('verification_status').eq('id', data.user.id).single();
        if (profData?.verification_status === 'approved') {
             await supabase.from('professionals').update({ is_active: true }).eq('id', data.user.id);
        }
      }

      sessionStorage.setItem('argmed_session_active', 'true');
      
      return { success: true, role: profile.role };
    } catch (error) {
      return { success: false, error: translateError(error.message) };
    }
  };

  const register = async (emailOrDni, password, role, additionalData = {}) => {
    try {
      let finalEmail = emailOrDni;
      
      if (role === 'patient') {
         if (!additionalData.dni) {
             return { success: false, error: "El DNI es requerido." };
         }
         if (!/^\d+$/.test(additionalData.dni)) {
             return { success: false, error: "El DNI debe contener solo números." };
         }
         
         finalEmail = `${additionalData.dni}@argmed.online`;
      }

      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password,
        options: { 
            data: { 
                role, 
                full_name: additionalData.fullName,
                dni: additionalData.dni,
                first_name: additionalData.firstName,
                last_name: additionalData.lastName
            } 
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{ 
          id: data.user.id, 
          role, 
          full_name: additionalData.fullName || finalEmail.split('@')[0],
          email: finalEmail,
          terms_accepted_at: additionalData.termsAcceptedAt || null,
          terms_version: '1.0'
        }]);

        if (profileError) {
            if (!profileError.message.includes('duplicate key')) throw profileError;
        }

        if (role === 'doctor') {
          // Fixed: Added profile_id to ensure foreign key constraints are met
          await supabase.from('professionals').insert([{
            id: data.user.id,
            profile_id: data.user.id,
            email: finalEmail,
            professional_type: additionalData.profession || 'General', // NEW: Free text profession field
            specialization: additionalData.profession || 'General', // Keep for backward compatibility
            license_number: '', // Will be filled during onboarding
            is_active: false,
            verification_status: 'pending',
            consultation_fee: additionalData.consultationFee || 0
          }]);
        } else if (role === 'patient') {
          await supabase.from('users').insert([{ 
             id: data.user.id,
             dni: additionalData.dni,
             first_name: additionalData.firstName,
             last_name: additionalData.lastName,
             created_at: new Date().toISOString()
          }]);
        } else if (role === 'legal_admin') {
            await supabase.from('legal_team').insert([{
                id: data.user.id,
                email: finalEmail,
                name: additionalData.fullName,
                role: 'legal_admin'
            }]);
        }

        return { success: true, session: data.session };
      }
      return { success: true, session: null };
    } catch (error) {
      return { success: false, error: translateError(error.message) };
    }
  };

  const logout = async () => {
    try {
      if (user && user.role === 'doctor') {
        await supabase.from('professionals').update({ is_active: false }).eq('id', user.id);
      }
      await supabase.auth.signOut();
      clearAuthData();
    } catch (error) {
      console.error("Logout error:", error);
      clearAuthData();
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: "Not logged in." };
    try {
      const profileUpdates = {};
      const roleUpdates = {};
      const profileKeys = ['full_name', 'photo_url'];
      
      Object.keys(updates).forEach(key => {
        let dbKey = key;
        if (key === 'fullName') dbKey = 'full_name';
        if (key === 'photoURL') dbKey = 'photo_url';
        if (key === 'medicalLicense') dbKey = 'license_number';
        if (key === 'consultationFee') dbKey = 'consultation_fee';
        if (key === 'paymentAlias') dbKey = 'payment_alias';
        if (key === 'isActive') dbKey = 'is_active';

        if (profileKeys.includes(dbKey)) profileUpdates[dbKey] = updates[key];
        else roleUpdates[dbKey] = updates[key];
      });

      if (Object.keys(profileUpdates).length) {
        const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', user.id);
        if (profileError) throw profileError;
      }
      if (Object.keys(roleUpdates).length) {
        const table = user.role === 'doctor' ? 'professionals' : (user.role === 'legal_admin' ? 'legal_team' : 'users');
        const { error: roleError } = await supabase.from(table).update(roleUpdates).eq('id', user.id);
        if (roleError) throw roleError;
      }

      await fetchUserProfile(user.id, user.email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  const deleteAccount = async () => {
    if (!user) return { success: false, error: "No user is logged in." };
    try {
      const userId = user.id;
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.signOut();
      clearAuthData();
      return { success: true };
    } catch (error) {
      console.error("Delete account error:", error);
      return { success: false, error: error.message };
    }
  };
  
  const uploadPhoto = async (file) => {
    if (!user) return { success: false, error: 'User not logged in' };
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Could not get public URL');
      await updateProfile({ photo_url: data.publicUrl });
      return { success: true, url: data.publicUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, uploadPhoto, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};