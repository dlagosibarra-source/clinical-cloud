"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ShieldCheck, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth, getCognitoErrorMessage } from "@/shared/auth/context";
import { resendSignUpCode } from "aws-amplify/auth";

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { confirmSignUp, isLoading } = useAuth();

  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendSuccess(false);

    if (!email) {
      setError("No se encontró el correo electrónico. Vuelve a registrarte.");
      return;
    }

    if (!code.trim()) {
      setError("Por favor, ingresa el código de verificación.");
      return;
    }

    try {
      await confirmSignUp(email, code);
      router.push("/login?confirmed=true");
    } catch (err) {
      setError(getCognitoErrorMessage(err));
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      await resendSignUpCode({ username: email });
      setResendSuccess(true);
    } catch (err) {
      setError(getCognitoErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-border/80 bg-card/95 backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Verificar Email
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Ingresa el código de 6 dígitos que enviamos a tu correo
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {email && (
            <div className="p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/20 flex items-center gap-2">
              <Mail className="size-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">
                Código enviado a{" "}
                <span className="font-semibold text-foreground">{email}</span>
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 animate-in fade-in duration-200">
              Código reenviado exitosamente. Revisa tu bandeja de entrada.
            </div>
          )}

          {/* Verification Code */}
          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-xs font-semibold">
              Código de Verificación
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              startIcon={<ShieldCheck className="size-4" />}
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
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Verificar y Continuar</span>
                <ArrowRight className="size-4 ml-1.5" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-9 text-xs"
            disabled={resendLoading}
            onClick={handleResend}
          >
            {resendLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                <span>Reenviando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="size-3.5 mr-1.5" />
                <span>Reenviar código</span>
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿Ya verificaste tu cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors underline-offset-2 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ConfirmEmailPage() {
  return (
    <React.Suspense fallback={
      <div className="flex justify-center p-8">
        <Loader2 className="size-6 animate-spin text-cyan-600" />
      </div>
    }>
      <ConfirmEmailContent />
    </React.Suspense>
  );
}
