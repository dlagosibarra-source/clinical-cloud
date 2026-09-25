"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Loader2, Send, Lock, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth, getCognitoErrorMessage } from "@/shared/auth/context";

export default function ForgotPasswordPage() {
  const { resetPassword, confirmResetPassword, isLoading } = useAuth();

  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<'request' | 'confirm' | 'done'>('request');
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }

    try {
      await resetPassword(email);
      setStep('confirm');
    } catch (err) {
      setError(getCognitoErrorMessage(err));
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Por favor, ingresa el código de verificación.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    try {
      await confirmResetPassword(email, code, newPassword);
      setStep('done');
    } catch (err) {
      setError(getCognitoErrorMessage(err));
    }
  };

  return (
    <Card className="shadow-xl border-border/80 bg-card/95 backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Recuperar Contraseña
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Te enviaremos las instrucciones y un código de recuperación a tu correo electrónico
        </CardDescription>
      </CardHeader>

      {step === 'done' ? (
        <CardContent className="space-y-4 pt-1">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold">Contraseña restablecida exitosamente</p>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm transition-all shadow-sm"
            >
              <ArrowLeft className="size-4 mr-1.5" />
              <span>Volver al inicio de sesión</span>
            </Link>
          </div>
        </CardContent>
      ) : step === 'confirm' ? (
        <form onSubmit={handleConfirm}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 flex items-center gap-2">
              <Mail className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{email}</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs font-semibold">
                Código de Verificación
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                startIcon={<Mail className="size-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-semibold">
                Nueva Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  <span>Restableciendo...</span>
                </>
              ) : (
                <>
                  <Lock className="size-4 mr-2" />
                  <span>Restablecer Contraseña</span>
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => { setStep('request'); setError(null); }}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Probar con otro correo</span>
            </button>
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Correo Electrónico Registrado
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
                  <span>Enviando código...</span>
                </>
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  <span>Enviar código de recuperación</span>
                </>
              )}
            </Button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Volver al inicio de sesión</span>
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
