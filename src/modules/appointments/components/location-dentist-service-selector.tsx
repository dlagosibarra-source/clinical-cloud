"use client";

import * as React from "react";
import { MapPin, Stethoscope, Sparkles, Clock, Check } from "lucide-react";
import type { LocationOption, DentistOption, ServiceOption } from "./types";
import { cn } from "cn";

interface LocationDentistServiceSelectorProps {
  locations: LocationOption[];
  selectedLocation: LocationOption | null;
  onSelectLocation: (loc: LocationOption) => void;

  dentists: DentistOption[];
  selectedDentist: DentistOption | null;
  onSelectDentist: (dentist: DentistOption) => void;

  services: ServiceOption[];
  selectedService: ServiceOption | null;
  onSelectService: (service: ServiceOption) => void;
}

export function LocationDentistServiceSelector({
  locations,
  selectedLocation,
  onSelectLocation,
  dentists,
  selectedDentist,
  onSelectDentist,
  services,
  selectedService,
  onSelectService,
}: LocationDentistServiceSelectorProps) {
  return (
    <div className="space-y-6">
      {/* 1. Selector de Sucursal (Location) */}
      <div className="space-y-2.5">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin className="size-4 text-cyan-600 dark:text-cyan-400" />
          Sucursal
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {locations.map((loc) => {
            const isSelected = selectedLocation?.locationId === loc.locationId;
            return (
              <button
                key={loc.locationId}
                type="button"
                onClick={() => onSelectLocation(loc)}
                className={cn(
                  "relative flex items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/50",
                  isSelected
                    ? "border-cyan-600 bg-cyan-50/60 dark:bg-cyan-950/30 dark:border-cyan-500 shadow-xs"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
                )}
              >
                <div className="min-w-0 pr-2">
                  <p
                    className={cn(
                      "font-semibold text-sm truncate",
                      isSelected
                        ? "text-cyan-900 dark:text-cyan-200"
                        : "text-foreground"
                    )}
                  >
                    {loc.name}
                  </p>
                  {loc.address && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {loc.address} {loc.city ? `• ${loc.city}` : ""}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selector de Odontólogo (Dentist) */}
      <div className="space-y-2.5">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Stethoscope className="size-4 text-cyan-600 dark:text-cyan-400" />
          Odontólogo Tratante
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {dentists.map((dentist) => {
            const isSelected = selectedDentist?.dentistId === dentist.dentistId;
            const displayName =
              dentist.professionalName ||
              `Dr. ${dentist.firstName} ${dentist.lastName}`;
            return (
              <button
                key={dentist.dentistId}
                type="button"
                onClick={() => onSelectDentist(dentist)}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/50",
                  isSelected
                    ? "border-cyan-600 bg-cyan-50/60 dark:bg-cyan-950/30 dark:border-cyan-500 shadow-xs"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
                )}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                    {dentist.firstName[0]}
                    {dentist.lastName[0]}
                  </div>
                  {isSelected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-cyan-600 text-white">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="mt-2.5">
                  <p
                    className={cn(
                      "font-semibold text-sm truncate",
                      isSelected
                        ? "text-cyan-900 dark:text-cyan-200"
                        : "text-foreground"
                    )}
                  >
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {dentist.specialty || "Odontología General"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selector de Servicio Dental */}
      <div className="space-y-2.5">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="size-4 text-cyan-600 dark:text-cyan-400" />
          Tratamiento / Servicio
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {services.map((srv) => {
            const isSelected = selectedService?.serviceId === srv.serviceId;
            const formattedPrice =
              typeof srv.price === "number"
                ? `$${srv.price.toFixed(2)}`
                : `$${parseFloat(srv.price || "0").toFixed(2)}`;

            return (
              <button
                key={srv.serviceId}
                type="button"
                onClick={() => onSelectService(srv)}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/50",
                  isSelected
                    ? "border-cyan-600 bg-cyan-50/60 dark:bg-cyan-950/30 dark:border-cyan-500 shadow-xs ring-1 ring-cyan-500/20"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "font-semibold text-sm",
                        isSelected
                          ? "text-cyan-900 dark:text-cyan-200"
                          : "text-foreground"
                      )}
                    >
                      {srv.name}
                    </p>
                    {isSelected && (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white">
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  {srv.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {srv.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5 text-muted-foreground/80" />
                    <span>{srv.durationMinutes} min</span>
                  </div>
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      isSelected
                        ? "text-cyan-700 dark:text-cyan-300"
                        : "text-foreground"
                    )}
                  >
                    {formattedPrice} {srv.currency || "MXN"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
