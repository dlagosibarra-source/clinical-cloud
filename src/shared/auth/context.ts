import { type AuthContext } from '../../shared/types';

export function getAuthenticatedContext(): AuthContext {
    return {
        user_id: 'mock-user-123',
        organization_id: 'mock-org-456',
        role: 'OWNER'
    };
}