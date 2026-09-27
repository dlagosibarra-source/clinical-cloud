"use server";

import { db } from "@/shared/database";
import { getAuthenticatedContext } from "@/shared/auth/server-context";
import { DashboardService } from "../services/dashboard.service";
import type { DashboardKPIs } from "../types";

export interface DashboardActionResult {
  success: boolean;
  data?: DashboardKPIs;
  error?: string;
}

/**
 * Server Action to fetch operational KPIs for the authenticated organization.
 */
export async function getDashboardKPIsAction(): Promise<DashboardActionResult> {
  try {
    const context = await getAuthenticatedContext();
    const service = new DashboardService(db);
    const kpis = await service.getOperationalKPIs(context.organization_id);

    return {
      success: true,
      data: kpis,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[DashboardAction] ❌ Error recuperando KPIs operativos:", error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
