import { z } from "zod";

export const CreateServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "El nombre del servicio debe tener al menos 2 caracteres" })
    .max(255, { message: "El nombre no puede exceder 255 caracteres" }),
  description: z.string().trim().optional().nullable().transform((val) => val || null),
  durationMinutes: z.coerce
    .number()
    .int({ message: "La duración debe ser un número entero de minutos" })
    .positive({ message: "La duración debe ser mayor a 0 minutos" }),
  price: z.coerce
    .number()
    .nonnegative({ message: "El precio no puede ser negativo" })
    .transform((val) => val.toFixed(2)),
  currency: z.string().trim().length(3).default("MXN"),
  isVariablePrice: z.boolean().default(false),
  requiresAssessment: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const UpdateServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "El nombre del servicio debe tener al menos 2 caracteres" })
    .max(255, { message: "El nombre no puede exceder 255 caracteres" })
    .optional(),
  description: z.string().trim().optional().nullable().transform((val) => val || null),
  durationMinutes: z.coerce
    .number()
    .int({ message: "La duración debe ser un número entero de minutos" })
    .positive({ message: "La duración debe ser mayor a 0 minutos" })
    .optional(),
  price: z.coerce
    .number()
    .nonnegative({ message: "El precio no puede ser negativo" })
    .transform((val) => val.toFixed(2))
    .optional(),
  currency: z.string().trim().length(3).optional(),
  isVariablePrice: z.boolean().optional(),
  requiresAssessment: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
