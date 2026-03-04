export type Permission = 
  | 'workflow:read'
  | 'workflow:write'
  | 'workflow:publish'
  | 'workflow:delete'
  | 'custom_code:write'
  | 'integration:manage'
  | 'users:manage'
  | 'billing:read';

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  permissions: Permission[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
