"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../shared/database";
import { getAuthenticatedContext } from "../../../shared/auth/context";
import { ServiceService } from "../services/service.service";
import { CreateServiceSchema, UpdateServiceSchema } from "../schemas/service.schema";

const serviceService = new ServiceService(db);

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore when invoked outside Next.js request context
  }
}

export async function getServicesListAction(query?: string, status?: string) {
  const context = getAuthenticatedContext();
  try {
    const list = await serviceService.getServices(context, query, status);
    return {
      success: true,
      status: 200,
      data: list,
    };
  } catch (error) {
    console.error("Error fetching services:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al obtener catálogo de servicios",
      data: [],
    };
  }
}

export async function createServiceAction(input: unknown) {
  const context = getAuthenticatedContext();
  const validated = CreateServiceSchema.safeParse(input);

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const errorDetails = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
      .join("; ");
    return {
      success: false,
      status: 400,
      error: `Datos inválidos: ${errorDetails}`,
      details: validated.error.flatten(),
    };
  }

  try {
    const created = await serviceService.createService(context, validated.data);
    const service = created[0];
    if (!service) {
      throw new Error("No se pudo crear el servicio en la base de datos");
    }

    safeRevalidatePath("/servicios");
    safeRevalidatePath("/citas/nueva");
    safeRevalidatePath("/agenda");

    return {
      success: true,
      status: 201,
      data: service,
    };
  } catch (error) {
    console.error("Error creating service:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al registrar el servicio",
    };
  }
}

export async function updateServiceAction(serviceId: string, input: unknown) {
  const context = getAuthenticatedContext();
  const validated = UpdateServiceSchema.safeParse(input);

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const errorDetails = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
      .join("; ");
    return {
      success: false,
      status: 400,
      error: `Datos inválidos: ${errorDetails}`,
      details: validated.error.flatten(),
    };
  }

  try {
    const updated = await serviceService.updateService(context, serviceId, validated.data);
    const service = updated[0];
    if (!service) {
      return {
        success: false,
        status: 404,
        error: "Servicio no encontrado",
      };
    }

    safeRevalidatePath("/servicios");
    safeRevalidatePath("/citas/nueva");
    safeRevalidatePath("/agenda");

    return {
      success: true,
      status: 200,
      data: service,
    };
  } catch (error) {
    console.error("Error updating service:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al actualizar el servicio",
    };
  }
}

export async function deleteServiceAction(serviceId: string) {
  const context = getAuthenticatedContext();

  try {
    const deactivated = await serviceService.deleteService(context, serviceId);
    const service = deactivated[0];
    if (!service) {
      return {
        success: false,
        status: 404,
        error: "Servicio no encontrado",
      };
    }

    safeRevalidatePath("/servicios");
    safeRevalidatePath("/citas/nueva");
    safeRevalidatePath("/agenda");

    return {
      success: true,
      status: 200,
      data: service,
    };
  } catch (error) {
    console.error("Error deactivating service:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al desactivar el servicio",
    };
  }
}
