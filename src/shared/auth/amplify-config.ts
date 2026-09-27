import { type ResourcesConfig } from 'aws-amplify';
import { CookieStorage } from 'aws-amplify/utils';
import { createUserPoolsTokenProvider } from 'aws-amplify/adapter-core';
import { Amplify } from 'aws-amplify';

/**
 * Returns the current application origin dynamically:
 * - On the client (browser): window.location.origin (e.g. http://192.168.1.70:3000 or http://localhost:3000)
 * - On the server: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
 */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Generates Amplify v6 configuration dynamically based on the current origin.
 * Ensures callback/logout URLs and any host-dependent settings adapt to localhost
 * or LAN IP (e.g., http://192.168.1.70:3000) seamlessly without hardcoded localhost.
 */
export function getAmplifyConfig(origin?: string): ResourcesConfig {
  const currentOrigin = origin || getAppOrigin();

  return {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
        loginWith: {
          oauth: {
            domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '',
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: [
              currentOrigin,
              `${currentOrigin}/agenda`,
              `${currentOrigin}/login`,
            ],
            redirectSignOut: [
              currentOrigin,
              `${currentOrigin}/login`,
            ],
            responseType: 'code',
          },
        },
      },
    },
  };
}

/**
 * Static/Default configuration instance for server-side runners or initial imports.
 */
export const amplifyConfig: ResourcesConfig = getAmplifyConfig();

/**
 * Configures Amplify client-side with dynamic host detection and cookie storage.
 * In LAN/HTTP environments (e.g. http://192.168.1.70:3000), sets secure: false so
 * mobile browsers accept session cookies. In HTTPS environments, enables secure: true.
 * Cookie domain is not hardcoded so it defaults to the active host.
 */
export function configureAmplifyClient(): void {
  const config = getAmplifyConfig();
  const isSecure = typeof window !== 'undefined' ? window.location.protocol === 'https:' : false;

  Amplify.configure(config, {
    ssr: true,
    ...(config.Auth ? {
      Auth: {
        tokenProvider: createUserPoolsTokenProvider(
          config.Auth,
          new CookieStorage({
            sameSite: 'lax',
            secure: isSecure,
          })
        ),
      },
    } : {}),
  });
}

