"use client";

import * as React from "react";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  name?: string;
  clinicName?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const MOCK_USER: AuthUser = {
  id: "00000000-0000-4000-a000-000000000002",
  email: "owner@demo.clinicalcloud.dev",
  role: "OWNER",
  organizationId: "00000000-0000-4000-a000-000000000001",
  name: "Admin Demo",
  clinicName: "Clínica Dental Demo",
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "clinical_cloud_auth_state";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored !== null) {
          return stored === "true";
        }
      } catch {
        // Fallback to default state
      }
    }
    return true;
  });

  const [user, setUser] = React.useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored !== null) {
          return stored === "true" ? MOCK_USER : null;
        }
      } catch {
        // Fallback to default state
      }
    }
    return MOCK_USER;
  });

  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const login = React.useCallback(async (email?: string, _password?: string) => {
    setIsLoading(true);
    // Simulate lightweight auth delay for smooth UX feedback
    await new Promise((resolve) => setTimeout(resolve, 350));

    const authenticatedUser: AuthUser = {
      ...MOCK_USER,
      email: email && email.trim() !== "" ? email.trim() : MOCK_USER.email,
    };

    setUser(authenticatedUser);
    setIsAuthenticated(true);
    setIsLoading(false);

    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  const logout = React.useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 200));

    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);

    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, "false");
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resetPassword = React.useCallback(async (_email: string) => {
    setIsLoading(true);
    // Placeholder simulation
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsLoading(false);
  }, []);

  const value = React.useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      resetPassword,
    }),
    [user, isAuthenticated, isLoading, login, logout, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthContext };
