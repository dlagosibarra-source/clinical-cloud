"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, User, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth, getCognitoErrorMessage } from "@/shared/auth/context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [clinicName, setClinicName] = React.useState("");
  const [adminName, setAdminName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clinicName.trim()) {
      setError("Por favor, ingresa el nombre de tu clínica dental.");
      return;
    }

    if (!adminName.trim()) {
      setError("Por favor, ingresa tu nombre completo o título profesional.");
      return;
    }

    if (!email.trim()) {
      setError("Por favor, ingresa un correo electrónico profesional.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    try {
      const { needsConfirmation } = await register({
        email,
        password,
        adminName,
        clinicName,
      });

      if (needsConfirmation) {
        router.push(`/confirm-email?email=${encodeURIComponent(email)}`);
      } else {
        router.push("/agenda");
      }
    } catch (err) {
      setError(getCognitoErrorMessage(err));
    }
  };

  return (
    <Card className="shadow-xl border-border/80 bg-card/95 backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Registrar Clínica
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Configura tu clínica y comienza a gestionar pacientes y turnos en minutos
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3.5">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Clinic Name */}
          <div className="space-y-1.5">
            <Label htmlFor="clinicName" className="text-xs font-semibold">
              Nombre de la Clínica
            </Label>
            <Input
              id="clinicName"
              type="text"
              placeholder="Ej. Clínica Dental San Jerónimo"
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              startIcon={<Building2 className="size-4" />}
            />
          </div>

          {/* Admin Name */}
          <div className="space-y-1.5">
            <Label htmlFor="adminName" className="text-xs font-semibold">
              Nombre del Administrador / Doctor
            </Label>
            <Input
              id="adminName"
              type="text"
              placeholder="Ej. Dra. Mariana Morales"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              startIcon={<User className="size-4" />}
            />
          </div>

          {/* Professional Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Correo Electrónico Profesional
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@miclinica.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startIcon={<Mail className="size-4" />}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
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
            <p className="text-[10px] text-muted-foreground">
              Usa al menos 8 caracteres con letras y números.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-3">
          <Button
            type="submit"
            className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-sm transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                <span>Creando cuenta clínica...</span>
              </>
            ) : (
              <>
                <span>Crear Cuenta y Empezar</span>
                <ArrowRight className="size-4 ml-1.5" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿Ya tienes una clínica registrada?{" "}
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
