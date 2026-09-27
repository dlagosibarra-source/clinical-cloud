import { type AuthContext } from '../types';
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { amplifyConfig } from './amplify-config';

// ─── Server Runner ──────────────────────────────────────────────────────────
// createServerRunner provides request-scoped Amplify context for server-side
// operations. This avoids cross-request token contamination in concurrent
// server environments.

const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
});

export { runWithAmplifyServerContext };

// ─── Helpers ────────────────────────────────────────────────────────────────

function isCognitoConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID &&
    !!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
  );
}

/**
 * Server-side helper to retrieve current authenticated context.
 * Used by Server Actions and background orchestrators.
 *
 * When Cognito is configured:
 *   1. Passes the cookies function to Amplify's server runner
 *   2. Uses Amplify to extract and validate JWT tokens
 *   3. Decodes the ID token to get sub, organization_id, and role
 *
 * When Cognito is NOT configured (local dev without AWS):
 *   Falls back to mock values from environment variables.
 */
export async function getAuthenticatedContext(): Promise<AuthContext> {
  if (!isCognitoConfigured()) {
    // Fallback for local development without Cognito
    return {
      user_id:
        process.env.DEFAULT_USER_ID ||
        '00000000-0000-4000-a000-000000000002',
      organization_id:
        process.env.DEFAULT_ORG_ID ||
        '00000000-0000-4000-a000-000000000001',
      role: 'OWNER',
    };
  }

  try {
    // Pass the cookies function reference — Amplify adapter expects
    // `typeof cookies` (the function itself), not the resolved value.
    // This is compatible with Next.js 16 async cookies().
    const result = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const currentUser = await getCurrentUser(contextSpec);
        const authSession = await fetchAuthSession(contextSpec);
        return { user: currentUser, session: authSession };
      },
    });

    // Extract claims from the ID token
    const idTokenPayload = result.session.tokens?.idToken?.payload;

    const organizationId =
      (idTokenPayload?.['custom:organization_id'] as string) ??
      process.env.DEFAULT_ORG_ID ??
      '';

    const role =
      (idTokenPayload?.['custom:role'] as string) ?? 'OWNER';

    return {
      user_id: result.user.userId,
      organization_id: organizationId,
      role: role as AuthContext['role'],
    };
  } catch {
    // Fallback for development, background CLI scripts, and webhooks without browser cookies
    if (process.env.NODE_ENV !== 'production' || process.env.DEFAULT_ORG_ID) {
      return {
        user_id:
          process.env.DEFAULT_USER_ID ||
          '00000000-0000-4000-a000-000000000002',
        organization_id:
          process.env.DEFAULT_ORG_ID ||
          '00000000-0000-4000-a000-000000000001',
        role: 'OWNER',
      };
    }

    throw new Error(
      'No authenticated session found. User must be logged in.'
    );
  }
}
