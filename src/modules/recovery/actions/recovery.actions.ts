"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../shared/database";
import { getAuthenticatedContext } from "../../../shared/auth/server-context";
import { RecoveryEngine, type FreedSlotInfo } from "../services/recovery.service";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore when invoked outside Next.js request context
  }
}

// ─── Waitlist Actions ───────────────────────────────────────────

export async function addToWaitlistAction(data: {
  patientId: string;
  serviceId: string;
  dentistId?: string;
  locationId?: string;
  preferredDateStart: string;
  preferredDateEnd: string;
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  priority?: number;
}) {
  const context = await getAuthenticatedContext();
  const engine = new RecoveryEngine(db);

  try {
    const entry = await engine.addToWaitlist(context, data);
    safeRevalidatePath("/agenda");
    return {
      success: true,
      status: 201,
      data: entry,
    };
  } catch (error: unknown) {
    console.error("Error adding to waitlist:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al agregar a la lista de espera",
    };
  }
}

export async function cancelWaitlistAction(waitlistId: string) {
  const context = await getAuthenticatedContext();
  const engine = new RecoveryEngine(db);

  try {
    const result = await engine.cancelWaitlistEntry(context, waitlistId);
    return { success: true, status: 200, data: result[0] };
  } catch (error: unknown) {
    console.error("Error cancelling waitlist entry:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al cancelar entrada de lista de espera",
    };
  }
}

export async function getPatientWaitlistAction(patientId: string) {
  const context = await getAuthenticatedContext();
  const engine = new RecoveryEngine(db);

  try {
    const entries = await engine.getPatientWaitlist(context, patientId);
    return { success: true, status: 200, data: entries };
  } catch (error: unknown) {
    console.error("Error fetching patient waitlist:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al consultar lista de espera",
      data: [],
    };
  }
}

// ─── Recovery Engine Actions ────────────────────────────────────

export async function processFreedSlotAction(freedSlot: FreedSlotInfo) {
  const context = await getAuthenticatedContext();
  const engine = new RecoveryEngine(db);

  try {
    const result = await engine.processFreedSlot(context, freedSlot);
    return {
      success: true,
      status: 200,
      data: result,
    };
  } catch (error: unknown) {
    console.error("Error processing freed slot:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al procesar slot liberado",
    };
  }
}

export async function acceptRecoveryOfferAction(offerId: string) {
  const context = await getAuthenticatedContext();
  const engine = new RecoveryEngine(db);

  try {
    const result = await engine.acceptOffer(context, offerId);

    if (result.success) {
      safeRevalidatePath("/agenda");
      safeRevalidatePath("/pacientes");
    }

    return {
      success: result.success,
      status: result.success ? 200 : 409,
      data: result.success ? { newAppointmentId: result.newAppointmentId } : undefined,
      error: result.error,
    };
  } catch (error: unknown) {
    console.error("Error accepting recovery offer:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al aceptar oferta de recuperación",
    };
  }
}

export async function declineRecoveryOfferAction(offerId: string) {
  const context = await getAuthenticatedContext();
  const engine = new RecoveryEngine(db);

  try {
    const result = await engine.declineOffer(context, offerId);
    return {
      success: result.success,
      status: result.success ? 200 : 400,
      error: result.error,
    };
  } catch (error: unknown) {
    console.error("Error declining recovery offer:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al rechazar oferta de recuperación",
    };
  }
}

export async function processExpiredOffersAction() {
  const context = await getAuthenticatedContext();
  const engine = new RecoveryEngine(db);

  try {
    const result = await engine.processExpiredOffers(context);
    return {
      success: true,
      status: 200,
      data: result,
    };
  } catch (error: unknown) {
    console.error("Error processing expired offers:", error);
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Error al procesar ofertas expiradas",
    };
  }
}
