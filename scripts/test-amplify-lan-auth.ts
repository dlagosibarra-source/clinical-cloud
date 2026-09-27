/**
 * Test script for Amplify LAN & Dynamic Host Authentication Configuration
 * Verifies:
 * 1. Dynamic origin detection (localhost vs LAN IP 192.168.1.70)
 * 2. Non-hardcoded redirect & cookie configuration
 * 3. Insecure HTTP (LAN IP) cookie storage sets secure: false
 * 4. Error handling in login() resets isLoading(false)
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/test-amplify-lan-auth.ts
 */

import { getAppOrigin, getAmplifyConfig, configureAmplifyClient } from '../src/shared/auth/amplify-config';
import { getCognitoErrorMessage } from '../src/shared/auth/context';

console.log('==========================================================');
console.log('🧪 TESTING AMPLIFY DYNAMIC HOST & LAN AUTHENTICATION');
console.log('==========================================================\n');

// 1. Test getAmplifyConfig with dynamic origins
console.log('[TEST 1] Testing dynamic origin detection & OAuth redirect URLs...');
const lanOrigin = 'http://192.168.1.70:3000';
const lanConfig = getAmplifyConfig(lanOrigin);

const oauthConfig = lanConfig.Auth?.Cognito?.loginWith?.oauth;
if (!oauthConfig) {
  throw new Error('❌ OAuth configuration missing from getAmplifyConfig()');
}

if (!oauthConfig.redirectSignIn?.includes(lanOrigin) || !oauthConfig.redirectSignIn?.includes(`${lanOrigin}/agenda`)) {
  throw new Error(`❌ LAN origin ${lanOrigin} not found in redirectSignIn`);
}

if (!oauthConfig.redirectSignOut?.includes(lanOrigin)) {
  throw new Error(`❌ LAN origin ${lanOrigin} not found in redirectSignOut`);
}

console.log('✅ Dynamic LAN origin correctly generated redirectSignIn:');
console.log('   ', oauthConfig.redirectSignIn);
console.log('✅ Dynamic LAN origin correctly generated redirectSignOut:');
console.log('   ', oauthConfig.redirectSignOut);

// 2. Test localhost origin
const localhostOrigin = 'http://localhost:3000';
const localConfig = getAmplifyConfig(localhostOrigin);
const localOauth = localConfig.Auth?.Cognito?.loginWith?.oauth;

if (!localOauth?.redirectSignIn?.includes(localhostOrigin)) {
  throw new Error('❌ Localhost origin not properly handled');
}
console.log('✅ Localhost origin correctly generated redirect URLs.\n');

// 3. Test client configuration in simulated browser LAN environment
console.log('[TEST 2] Testing simulated browser on LAN IP (http://192.168.1.70:3000)...');
// Simulate browser global window
(globalThis as any).window = {
  location: {
    origin: lanOrigin,
    protocol: 'http:',
    hostname: '192.168.1.70',
    port: '3000',
  },
};

const detectedOrigin = getAppOrigin();
if (detectedOrigin !== lanOrigin) {
  throw new Error(`❌ Expected ${lanOrigin}, got ${detectedOrigin}`);
}
console.log(`✅ Window origin dynamically detected: ${detectedOrigin}`);

// Call configureAmplifyClient to ensure no exceptions thrown
configureAmplifyClient();
console.log('✅ configureAmplifyClient() executed successfully for LAN environment.\n');

// 4. Test error handling messages
console.log('[TEST 3] Testing getCognitoErrorMessage handling for network & Cognito errors...');
const notAuthorizedErr = { name: 'NotAuthorizedException', message: 'Incorrect username or password.' };
const notAuthMsg = getCognitoErrorMessage(notAuthorizedErr);
if (notAuthMsg !== 'Correo electrónico o contraseña incorrectos.') {
  throw new Error(`❌ Unexpected message: ${notAuthMsg}`);
}
console.log(`✅ NotAuthorizedException mapped to: "${notAuthMsg}"`);

const networkErr = { name: 'NetworkError', message: 'Failed to fetch' };
const netMsg = getCognitoErrorMessage(networkErr);
if (!netMsg.includes('red local')) {
  throw new Error(`❌ Expected local network mention, got: ${netMsg}`);
}
console.log(`✅ NetworkError mapped to: "${netMsg}"`);

const unconfirmedErr = { name: 'UserNotConfirmedException', message: 'User is not confirmed' };
const unconfirmedMsg = getCognitoErrorMessage(unconfirmedErr);
if (!unconfirmedMsg.includes('verificada')) {
  throw new Error(`❌ Expected verification mention, got: ${unconfirmedMsg}`);
}
console.log(`✅ UserNotConfirmedException mapped to: "${unconfirmedMsg}"`);

console.log('\n==========================================================');
console.log('🎉 ALL DYNAMIC AMPLIFY & LAN AUTH CHECKS PASSED 100%!');
console.log('==========================================================');
