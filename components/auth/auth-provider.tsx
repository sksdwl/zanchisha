'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: any | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  // 检查登录状态
  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const result = await response.json();
      
      if (result.code === 0 && result.data.isLoggedIn) {
        setIsLoggedIn(true);
        setUser(result.data.user);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 登录
  const login = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login');
      const result = await response.json();
      
      if (result.code === 0 && result.data.oauth_url) {
        // 跳转到 SecondMe 授权页面
        window.location.href = result.data.oauth_url;
      } else {
        throw new Error(result.message || '获取登录链接失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败，请重试');
      setIsLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsLoggedIn(false);
      setUser(null);
      // 刷新页面以清除状态
      window.location.href = '/';
    } catch (error) {
      console.error('登出失败:', error);
      setIsLoading(false);
    }
  };

  // 页面加载时检查登录状态
  useEffect(() => {
    checkSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        user,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
