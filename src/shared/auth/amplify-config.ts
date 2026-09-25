import { type ResourcesConfig } from 'aws-amplify';

/**
 * Amplify v6 configuration for AWS Cognito authentication.
 *
 * User Pool ID and Client ID are public values (not secrets).
 * The App Client must be configured as "public client" (no client secret)
 * in the AWS Cognito Console.
 */
export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
    },
  },
};
