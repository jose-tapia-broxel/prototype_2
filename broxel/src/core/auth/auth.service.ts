import { Injectable, signal, computed } from '@angular/core';
import { User, Permission, AuthState } from './models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Centralized state using Signals
  private state = signal<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Public computed signals for components to consume
  user = computed(() => this.state().user);
  isAuthenticated = computed(() => this.state().isAuthenticated);
  isLoading = computed(() => this.state().isLoading);
  
  // Computed signal specifically for permissions to optimize change detection
  permissions = computed(() => this.state().user?.permissions || []);

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    // Simulate fetching user session from a token or backend
    setTimeout(() => {
      // Mock User: A 'Pro Developer' in Tenant A
      const mockUser: User = {
        id: 'usr_123',
        email: 'jose.tapia@broxel.com',
        name: 'Jose Tapia',
        tenantId: 'org_broxel_01',
        roles: ['PRO_DEVELOPER'],
        permissions: [
          'workflow:read',
          'workflow:write',
          'workflow:publish',
          'custom_code:write',
          'integration:manage'
        ]
      };

      this.state.set({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false
      });
    }, 500);
  }

  /**
   * Core RBAC check.
   * Returns true if the user has ALL requested permissions.
   */
  hasPermissions(requiredPermissions: Permission | Permission[]): boolean {
    const userPerms = this.permissions();
    
    if (!userPerms || userPerms.length === 0) {
      return false;
    }

    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    // Check if user has every required permission
    return required.every(perm => userPerms.includes(perm));
  }

  /**
   * Returns true if the user has ANY of the requested permissions.
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    const userPerms = this.permissions();
    if (!userPerms) return false;
    
    return permissions.some(perm => userPerms.includes(perm));
  }

  logout() {
    this.state.set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    // Redirect to login...
  }
}
