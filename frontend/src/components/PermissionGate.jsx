import React from 'react';
import { useAuth } from '../contexts/AuthContext';

// Roles that bypass all permission checks
const BYPASS_ROLES = ['owner', 'superadmin'];

/**
 * PermissionGate - Show children only if user has the required permission or role
 * 
 * Usage:
 *   <PermissionGate permission="students.edit">...</PermissionGate>
 *   <PermissionGate roles={['admin', 'owner']}>...</PermissionGate>
 *   <PermissionGate permission="finance.view" fallback={<Text>No access</Text>}>...</PermissionGate>
 */
export default function PermissionGate({ permission, roles, children, fallback = null }) {
  const { user, moduleAccess } = useAuth();
  
  if (!user) return fallback;
  
  // Owner and superadmin bypass all permission checks
  if (BYPASS_ROLES.includes(user.role)) return children;
  
  // Check specific roles
  if (roles && roles.length > 0) {
    if (roles.includes(user.role)) return children;
    return fallback;
  }
  
  // Check permission string against module access
  if (permission) {
    const userPerms = moduleAccess?.permissions || [];
    if (userPerms.includes(permission)) return children;
    return fallback;
  }
  
  // No restriction specified, show children
  return children;
}
