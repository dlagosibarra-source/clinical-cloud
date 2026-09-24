import { z } from "zod";

const dateOfBirthSchema = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}/, {
      message: "La fecha de nacimiento debe tener formato YYYY-MM-DD",
    }),
    z.date().transform((d) => d.toISOString().split("T")[0]!),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (typeof val === "string") {
      const clean = val.trim();
      if (!clean) return undefined;
      return clean.split("T")[0]!;
    }
    return val;
  });

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Correo electrónico no válido" })
  .optional()
  .or(z.literal(""))
  .nullable()
  .transform((val) => (val && val.trim() ? val.trim() : undefined));

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .nullable()
  .transform((val) => (val && val.trim() ? val.trim() : undefined));

const genderSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .nullable()
  .transform((val) => (val && val.trim() ? val.trim() : undefined));

export const CreatePatientSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio" }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: "El apellido es obligatorio" }),
  phone: phoneSchema,
  email: emailSchema,
  dateOfBirth: dateOfBirthSchema,
  gender: genderSchema,
  whatsappOptIn: z.boolean().optional().default(false),
});

export const UpdatePatientSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "El nombre no puede estar vacío" })
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, { message: "El apellido no puede estar vacío" })
    .optional(),
  phone: phoneSchema,
  email: emailSchema,
  dateOfBirth: dateOfBirthSchema,
  gender: genderSchema,
  whatsappOptIn: z.boolean().optional(),
});

export const SearchPatientsQuerySchema = z.object({
  query: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});
