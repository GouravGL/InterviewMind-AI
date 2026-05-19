"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("im_access_token");
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error("Failed to load user:", error);
          localStorage.removeItem("im_access_token");
          localStorage.removeItem("im_refresh_token");
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (data: any) => {
    const res = await authApi.login(data);
    localStorage.setItem("im_access_token", res.access_token);
    localStorage.setItem("im_refresh_token", res.refresh_token);
    const userData = await authApi.getMe();
    setUser(userData);
    router.push("/dashboard");
  };

  const register = async (data: any) => {
    const res = await authApi.register(data);
    localStorage.setItem("im_access_token", res.access_token);
    localStorage.setItem("im_refresh_token", res.refresh_token);
    const userData = await authApi.getMe();
    setUser(userData);
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error("Logout failed API", e);
    }
    localStorage.removeItem("im_access_token");
    localStorage.removeItem("im_refresh_token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
