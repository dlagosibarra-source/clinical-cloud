"use client";

import * as React from "react";
import { Amplify } from "aws-amplify";
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
  autoSignIn,
} from "aws-amplify/auth";
import { amplifyConfig, configureAmplifyClient } from "./amplify-config";
import { createOrganizationAction } from "@/modules/organizations/actions/organization.actions";

// ─── Configure Amplify (client-side, with dynamic origin & cookie storage) ──
configureAmplifyClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  name?: string;
  clinicName?: string;
  cognitoSub: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    adminName: string;
    clinicName: string;
  }) => Promise<{ needsConfirmation: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function isCognitoConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID &&
    !!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
  );
}

/**
 * Map Cognito error codes to user-friendly Spanish messages.
 */
export function getCognitoErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      if (
        error.message.includes("Cognito no está configurado") ||
        error.message.includes("Paso de autenticación adicional") ||
        error.message.includes("no ha sido verificada")
      ) {
        return error.message;
      }
    }
    if ("name" in error) {
      const name = (error as { name: string }).name;
      switch (name) {
        case "UserAlreadyAuthenticatedException":
          return "Ya tienes una sesión activa.";
        case "NotAuthorizedException":
          return "Correo electrónico o contraseña incorrectos.";
        case "UserNotFoundException":
          return "No se encontró una cuenta con este correo electrónico.";
        case "UserNotConfirmedException":
          return "Tu cuenta no ha sido verificada. Revisa tu correo para el código de confirmación.";
        case "UsernameExistsException":
          return "Ya existe una cuenta con este correo electrónico.";
        case "InvalidPasswordException":
          return "La contraseña no cumple con los requisitos de seguridad.";
        case "CodeMismatchException":
          return "El código de verificación es incorrecto.";
        case "ExpiredCodeException":
          return "El código de verificación ha expirado. Solicita uno nuevo.";
        case "LimitExceededException":
          return "Demasiados intentos. Espera unos minutos antes de intentar nuevamente.";
        case "InvalidParameterException":
          return "Uno o más campos son inválidos. Verifica la información ingresada.";
        case "NetworkError":
        case "FetchError":
          return "Error de conexión con el servidor. Verifica tu conectividad a la red local.";
        default:
          break;
      }
    }
    if ("message" in error && typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
  }
  return "Ocurrió un error inesperado al procesar la sesión. Intenta nuevamente.";
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const isAuthenticated = user !== null;

  // ─── Check for existing session on mount ────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!isCognitoConfigured()) {
        setIsLoading(false);
        return;
      }

      try {
        configureAmplifyClient();
        const cognitoUser = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        if (!cancelled) {
          setUser({
            id: cognitoUser.userId,
            cognitoSub: cognitoUser.userId,
            email: attributes.email ?? "",
            name: attributes.given_name ?? attributes.name ?? "",
            role: attributes["custom:role"] ?? "OWNER",
            organizationId: attributes["custom:organization_id"] ?? "",
            clinicName: attributes["custom:clinic_name"] ?? "",
          });
        }
      } catch {
        // No active session — user is not authenticated
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Login ──────────────────────────────────────────────────────────────
  const login = React.useCallback(async (email: string, password: string) => {
    if (!isCognitoConfigured()) {
      setIsLoading(false);
      throw new Error("Cognito no está configurado. Revisa las variables de entorno.");
    }

    setIsLoading(true);
    try {
      configureAmplifyClient();

      const { isSignedIn, nextStep } = await amplifySignIn({
        username: email,
        password,
      });

      if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
        throw Object.assign(
          new Error("Tu cuenta no ha sido verificada. Revisa tu correo para el código de confirmación."),
          { name: "UserNotConfirmedException" }
        );
      }

      if (isSignedIn) {
        const cognitoUser = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        setUser({
          id: cognitoUser.userId,
          cognitoSub: cognitoUser.userId,
          email: attributes.email ?? email,
          name: attributes.given_name ?? attributes.name ?? "",
          role: attributes["custom:role"] ?? "OWNER",
          organizationId: attributes["custom:organization_id"] ?? "",
          clinicName: attributes["custom:clinic_name"] ?? "",
        });
      } else {
        throw new Error(
          `Paso de autenticación adicional requerido: ${nextStep.signInStep}`
        );
      }
    } catch (err: unknown) {
      setIsLoading(false);
      setUser(null);
      console.error("[AuthContext] Error en login:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);


  // ─── Register ───────────────────────────────────────────────────────────
  const register = React.useCallback(
    async (params: {
      email: string;
      password: string;
      adminName: string;
      clinicName: string;
    }): Promise<{ needsConfirmation: boolean }> => {
      if (!isCognitoConfigured()) {
        throw new Error("Cognito no está configurado. Revisa las variables de entorno.");
      }

      setIsLoading(true);
      try {
        const organizationId = crypto.randomUUID();

        const { isSignUpComplete, nextStep } = await amplifySignUp({
          username: params.email,
          password: params.password,
          options: {
            userAttributes: {
              email: params.email,
              given_name: params.adminName,
              "custom:clinic_name": params.clinicName,
              "custom:organization_id": organizationId,
              "custom:role": "admin",
            },
            autoSignIn: true,
          },
        });

        // ─── Database Synchronization: Register organization in PostgreSQL ───
        try {
          await createOrganizationAction({
            organizationId,
            name: params.clinicName,
          });
        } catch (dbErr) {
          console.error("Error al sincronizar la organización en PostgreSQL:", dbErr);
        }

        if (isSignUpComplete) {
          // Auto sign-in was successful
          try {
            await autoSignIn();
            const cognitoUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();
            setUser({
              id: cognitoUser.userId,
              cognitoSub: cognitoUser.userId,
              email: attributes.email ?? params.email,
              name: params.adminName,
              role: attributes["custom:role"] ?? "admin",
              organizationId: attributes["custom:organization_id"] ?? organizationId,
              clinicName: params.clinicName,
            });
          } catch {
            // autoSignIn may fail, user needs to log in manually
          }
          return { needsConfirmation: false };
        }

        if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          return { needsConfirmation: true };
        }

        return { needsConfirmation: false };
      } catch (err) {
        setIsLoading(false);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Confirm Sign Up ───────────────────────────────────────────────────
  const confirmSignUp = React.useCallback(
    async (email: string, code: string) => {
      if (!isCognitoConfigured()) {
        setIsLoading(false);
        throw new Error("Cognito no está configurado.");
      }

      setIsLoading(true);
      try {
        await amplifyConfirmSignUp({
          username: email,
          confirmationCode: code,
        });
      } catch (err) {
        setIsLoading(false);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Logout ─────────────────────────────────────────────────────────────
  const logout = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (isCognitoConfigured()) {
        await amplifySignOut();
      }
      setUser(null);
    } catch (err) {
      setUser(null);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Reset Password ────────────────────────────────────────────────────
  const resetPasswordFn = React.useCallback(async (email: string) => {
    if (!isCognitoConfigured()) {
      setIsLoading(false);
      throw new Error("Cognito no está configurado.");
    }

    setIsLoading(true);
    try {
      await amplifyResetPassword({ username: email });
    } catch (err) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Confirm Reset Password ────────────────────────────────────────────
  const confirmResetPasswordFn = React.useCallback(
    async (email: string, code: string, newPassword: string) => {
      if (!isCognitoConfigured()) {
        setIsLoading(false);
        throw new Error("Cognito no está configurado.");
      }

      setIsLoading(true);
      try {
        await amplifyConfirmResetPassword({
          username: email,
          confirmationCode: code,
          newPassword,
        });
      } catch (err) {
        setIsLoading(false);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Context Value ─────────────────────────────────────────────────────
  const isConfigured = React.useMemo(() => isCognitoConfigured(), []);

  const value = React.useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      isConfigured,
      login,
      logout,
      register,
      confirmSignUp,
      resetPassword: resetPasswordFn,
      confirmResetPassword: confirmResetPasswordFn,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      isConfigured,
      login,
      logout,
      register,
      confirmSignUp,
      resetPasswordFn,
      confirmResetPasswordFn,
    ]
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
