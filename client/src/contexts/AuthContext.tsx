import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('careflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('careflow_token');
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('careflow_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data.user);
          localStorage.setItem('careflow_user', JSON.stringify(res.data.user));
        } catch {
          localStorage.removeItem('careflow_token');
          localStorage.removeItem('careflow_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login({ email, password });
    setUser(res.data.user);
    setToken(res.data.token);
    localStorage.setItem('careflow_token', res.data.token);
    localStorage.setItem('careflow_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const register = async (data: any): Promise<User> => {
    const res = await authApi.register(data);
    setUser(res.data.user);
    setToken(res.data.token);
    localStorage.setItem('careflow_token', res.data.token);
    localStorage.setItem('careflow_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('careflow_token');
    localStorage.removeItem('careflow_user');
  };

  const switchDemoRole = async (role: UserRole): Promise<User> => {
    if (role === 'ADMIN') {
      return await login('admin@careflow.com', 'admin123');
    } else if (role === 'DOCTOR') {
      return await login('dr.sharma@careflow.com', 'doctor123');
    } else {
      return await login('aarav.mehta@example.com', 'patient123');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        switchDemoRole,
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
