"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/shared/auth/context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

    try {
      await login(email, password);
      router.push("/agenda");
    } catch {
      setError("Error al iniciar sesión. Intenta nuevamente.");
    }
  };

  const handleFillDemo = () => {
    setEmail("owner@demo.clinicalcloud.dev");
    setPassword("DemoPassword2026!");
    setError(null);
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
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

          {/* Quick Demo Credentials Autofill Banner */}
          <div className="p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="size-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div className="text-[11px] text-muted-foreground truncate">
                <span className="font-semibold text-foreground">Cuenta demo:</span>{" "}
                owner@demo.clinicalcloud.dev
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleFillDemo}
              className="text-[10px] h-6 px-2 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 hover:bg-cyan-100/50 dark:hover:bg-cyan-900/30 shrink-0"
            >
              Autocompletar
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-sm transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
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
