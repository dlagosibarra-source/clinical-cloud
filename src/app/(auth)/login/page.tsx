"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth, getCognitoErrorMessage } from "@/shared/auth/context";

function LoginForm() {
  const router = useRouter();
  const { login, isLoading, isConfigured } = useAuth();
  const searchParams = useSearchParams();
  const [successMessage] = React.useState<string | null>(() => {
    if (searchParams.get('confirmed') === 'true') {
      return 'Email verificado exitosamente. Ahora puedes iniciar sesión.';
    }
    return null;
  });

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isBusy = isLoading || isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }

    if (!password) {
      setError("Por favor, ingresa tu contraseña.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/agenda");
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'UserNotConfirmedException') {
        router.push(`/confirm-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(getCognitoErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-xl border-border/80 bg-card/95 backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Iniciar Sesión
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Ingresa tus credenciales profesionales para acceder a la agenda clínica
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <div className="p-3 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-1 animate-in fade-in duration-200">
              <p className="font-semibold">Modo Desarrollo: AWS Cognito no configurado</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Define <code className="font-mono text-[10px]">NEXT_PUBLIC_COGNITO_USER_POOL_ID</code> y <code className="font-mono text-[10px]">NEXT_PUBLIC_COGNITO_CLIENT_ID</code> en <code className="font-mono text-[10px]">.env.local</code> para habilitar la autenticación real.
              </p>
            </div>
          )}
          {successMessage && (
            <div className="p-3 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@miclinica.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startIcon={<Mail className="size-4" />}
            />
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">
                Contraseña
              </Label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startIcon={<Lock className="size-4" />}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors size-9 flex items-center justify-center rounded"
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-sm transition-all"
            disabled={isBusy}
          >
            {isBusy ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="size-4 ml-1.5" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿No tienes una clínica registrada?{" "}
            <Link
              href="/register"
              className="font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors underline-offset-2 hover:underline"
            >
              Registra tu clínica
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="flex justify-center p-8">
        <Loader2 className="size-6 animate-spin text-cyan-600" />
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}
