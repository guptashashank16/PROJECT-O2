import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserProfile {
  username: string;
  email: string;
  role: 'ADMIN' | 'RESEARCHER' | 'CLINICIAN' | 'VIEWER';
  full_name: string;
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, profile: UserProfile) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('qcare_jwt_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('qcare_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default guest profile
    return {
      username: 'guest',
      email: 'guest@qcare.local',
      role: 'VIEWER',
      full_name: 'Guest Viewer',
      permissions: ['dataset:view', 'model:view', 'explainability:view', 'evidence:view'],
    };
  });

  const login = (newToken: string, profile: UserProfile) => {
    setToken(newToken);
    setUser(profile);
    localStorage.setItem('qcare_jwt_token', newToken);
    localStorage.setItem('qcare_user_profile', JSON.stringify(profile));
  };

  const logout = () => {
    setToken(null);
    setUser({
      username: 'guest',
      email: 'guest@qcare.local',
      role: 'VIEWER',
      full_name: 'Guest Viewer',
      permissions: ['dataset:view', 'model:view', 'explainability:view', 'evidence:view'],
    });
    localStorage.removeItem('qcare_jwt_token');
    localStorage.removeItem('qcare_user_profile');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
