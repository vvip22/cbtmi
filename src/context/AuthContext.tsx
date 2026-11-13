/**
 * Auth Context - MIS NW KORLEKO CBT
 * Autentikasi tunggal terpadu untuk Proktor, Pengawas, dan Peserta Ujian
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types/cbt';
import { dbService } from '../services/dbStore';

interface AuthContextType {
  currentUser: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (identifier: string, passwordInput: string) => { success: boolean; message: string };
  logout: () => void;
  refreshCurrentUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'misnwkorleko_auth_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCurrentUser = () => {
    const storedId = localStorage.getItem(CURRENT_USER_KEY);
    if (storedId) {
      const user = dbService.getUserById(storedId);
      if (user) {
        setCurrentUser(user);
        return;
      }
    }
    setCurrentUser(null);
  };

  useEffect(() => {
    refreshCurrentUser();
    setIsLoading(false);
  }, []);

  const login = (identifier: string, passwordInput: string): { success: boolean; message: string } => {
    const res = dbService.authenticate(identifier, passwordInput);
    if (res.user) {
      setCurrentUser(res.user);
      localStorage.setItem(CURRENT_USER_KEY, res.user.id);
      return { success: true, message: res.message || 'Login berhasil.' };
    }
    return { success: false, message: res.message || 'Kredensial tidak valid.' };
  };

  const logout = () => {
    if (currentUser) {
      dbService.logoutUser(currentUser.id);
    }
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        Memuat Sistem CBT MIS NW Korleko...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        login,
        logout,
        refreshCurrentUser
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
