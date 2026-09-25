"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/shared/auth/context";

export default function ForgotPasswordPage() {
  const { resetPassword, isLoading } = useAuth();

  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch {
      setError("Ocurrió un error al procesar tu solicitud. Intenta nuevamente.");
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

      {submitted ? (
        <CardContent className="space-y-4 pt-1">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold">Código de recuperación enviado</p>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Si la dirección <strong className="font-semibold text-foreground">{email}</strong> corresponde a una cuenta registrada, recibirás un correo con las instrucciones para restablecer tu contraseña.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitted(false)}
              className="w-full h-9 text-xs"
            >
              Probar con otro correo
            </Button>

            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm transition-all shadow-sm"
            >
              <ArrowLeft className="size-4 mr-1.5" />
              <span>Volver al inicio de sesión</span>
            </Link>
          </div>
        </CardContent>
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
