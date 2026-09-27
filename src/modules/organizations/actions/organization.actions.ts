"use server";

import { db } from "@/shared/database";
import { organizations } from "../types/schema";
import { eq } from "drizzle-orm";

export async function createOrganizationAction(data: {
  organizationId: string;
  name: string;
}) {
  try {
    // 1. Idempotency check: if organization already exists with this ID, return success
    const existing = await db
      .select({ id: organizations.organizationId })
      .from(organizations)
      .where(eq(organizations.organizationId, data.organizationId))
      .limit(1);

    if (existing.length > 0) {
      return { success: true, organizationId: data.organizationId };
    }

    // 2. Slug generation from clinic name
    let baseSlug = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70);

    if (!baseSlug) {
      baseSlug = "clinica";
    }

    // 3. Ensure slug uniqueness
    const existingSlug = await db
      .select({ id: organizations.organizationId })
      .from(organizations)
      .where(eq(organizations.slug, baseSlug))
      .limit(1);

    const finalSlug =
      existingSlug.length > 0
        ? `${baseSlug}-${data.organizationId.slice(0, 8)}`
        : baseSlug;

    // 4. Insert organization
    const [created] = await db
      .insert(organizations)
      .values({
        organizationId: data.organizationId,
        name: data.name,
        slug: finalSlug,
      })
      .returning();

    return {
      success: true,
      data: created,
      organizationId: data.organizationId,
    };
  } catch (error) {
    console.error("Error creating organization in PostgreSQL:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al registrar la organización",
    };
  }
}
