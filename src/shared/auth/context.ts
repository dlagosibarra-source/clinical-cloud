import { type AuthContext } from '../../shared/types/index';

export function getAuthenticatedContext(): AuthContext {
    return {
        user_id: process.env.DEFAULT_USER_ID || '00000000-0000-4000-a000-000000000002',
        organization_id: process.env.DEFAULT_ORG_ID || '00000000-0000-4000-a000-000000000001',
        role: 'OWNER'
    };
}