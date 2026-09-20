import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import * as settingsSvc from '../services/settings.service.js';

// ─── Roles hierarchy (higher index = higher privilege) ───
const SYSTEM_LEVEL_ROLES = ['owner', 'superadmin'];
const ADMIN_LEVEL_ROLES = ['admin', 'academic_coordinator', 'finance_manager', 'hr_manager', 'it_admin'];
const STAFF_LEVEL_ROLES = [
  'teacher', 'admissions', 'reception', 'office_staff',
  'finance', 'hr', 'it_support', 'library', 'transport', 'security'
];
const END_USER_ROLES = ['student', 'parent', 'driver'];

export const ALL_SYSTEM_ROLES = [
  ...SYSTEM_LEVEL_ROLES, ...ADMIN_LEVEL_ROLES, ...STAFF_LEVEL_ROLES, ...END_USER_ROLES,
];

// ─── Core Authentication ───
export const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const payload = jwt.verify(token, secret);

    // Support campus override for administrators
    const campusHeader = req.headers['x-campus-id'];
    if (campusHeader && (payload.role === 'owner' || payload.role === 'superadmin' || payload.role === 'admin')) {
      const raw = String(campusHeader).trim();
      if (raw.toLowerCase() === 'all') {
        payload.campusId = null;
      } else {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          payload.campusId = parsed;
        } else if (raw) {
          try {
            const { rows } = await query(
              'SELECT id FROM campuses WHERE LOWER(name) = LOWER($1) LIMIT 1',
              [raw]
            );
            if (rows[0]?.id) payload.campusId = rows[0].id;
          } catch (_) {}
        }
      }
    }

    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// ─── Role-Based Authorization ───
// Pass allowed roles; owner always passes; superadmin passes if admin/owner is in the list
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.length) return next();
  const role = req.user?.role;
  if (!role) return res.status(403).json({ message: 'Forbidden' });

  // Owner has universal access
  if (role === 'owner') return next();

  // Superadmin passes if admin or owner is in the allowed list
  if (role === 'superadmin' && (roles.includes('admin') || roles.includes('owner') || roles.includes('superadmin'))) {
    return next();
  }

  // Direct role match
  if (roles.includes(role)) return next();

  return res.status(403).json({ message: 'Forbidden' });
};

// ─── Owner-Only Access ───
export const requireOwnerAccess = () => (req, res, next) => {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ message: 'This action requires owner privileges' });
  }
  next();
};

// ─── Superadmin or Owner Access ───
export const requireSuperadminAccess = () => (req, res, next) => {
  const role = req.user?.role;
  if (role !== 'owner' && role !== 'superadmin') {
    return res.status(403).json({ message: 'This action requires superadmin or owner privileges' });
  }
  next();
};

// ─── Campus Access Validation ───
// Ensures the requesting user has access to the campus identified by req.params.campusId or req.body.campusId
export const requireCampusAccess = () => (req, res, next) => {
  const role = req.user?.role;
  // Owner and superadmin can access any campus
  if (role === 'owner' || role === 'superadmin') return next();

  const targetCampus = Number(req.params.campusId || req.body?.campusId || req.query?.campusId);
  const userCampus = Number(req.user?.campusId);

  // If the user has a campus, it must match the target
  if (userCampus && targetCampus && userCampus !== targetCampus) {
    return res.status(403).json({ message: 'You do not have access to this campus' });
  }

  next();
};

// ─── Permission-Based Access ───
// Checks if the user's role has the required permission (e.g. 'students.view', 'finance.edit')
// Owner and superadmin bypass permission checks
export const requirePermission = (module, action) => async (req, res, next) => {
  const role = req.user?.role;
  if (!role) return res.status(403).json({ message: 'Forbidden' });

  // Owner and superadmin bypass all permission checks
  if (role === 'owner' || role === 'superadmin') return next();

  const permKey = `${module}.${action}`;
  try {
    const item = await settingsSvc.getByKey(`perms.${role}`);
    const perms = item ? JSON.parse(item.value) : [];
    if (Array.isArray(perms) && perms.includes(permKey)) {
      return next();
    }
  } catch (_) {
    // If permission lookup fails, deny access
  }

  return res.status(403).json({
    message: `You do not have permission: ${permKey}`,
    requiredPermission: permKey,
  });
};

// ─── Owner Visibility Controls ───
// Filters data for superadmin users based on owner's visibility settings
// This middleware reads owner_visibility_settings and attaches hidden modules to req
export const filterSuperadminVisibility = () => async (req, res, next) => {
  const role = req.user?.role;

  // Only apply to superadmin — owner sees everything, other roles have separate filters
  if (role !== 'superadmin') return next();

  try {
    const { rows } = await query(
      'SELECT setting_key, setting_value FROM owner_visibility_settings'
    );
    // Build a map of hidden features/modules
    const hiddenModules = new Set();
    const hiddenFields = new Set();
    for (const row of rows) {
      const val = row.setting_value;
      if (val?.hidden === true) {
        hiddenModules.add(row.setting_key);
      }
      if (Array.isArray(val?.hiddenFields)) {
        for (const f of val.hiddenFields) hiddenFields.add(f);
      }
    }
    // Attach to request for controllers to use
    req.visibilityFilter = { hiddenModules, hiddenFields };
  } catch (_) {
    // If table doesn't exist yet, no filtering
    req.visibilityFilter = { hiddenModules: new Set(), hiddenFields: new Set() };
  }

  next();
};

// ─── Helper: Check if a role is system-level (owner/superadmin) ───
export const isSystemRole = (role) => SYSTEM_LEVEL_ROLES.includes(role);

// ─── Helper: Check if a role is admin-level or higher ───
export const isAdminOrAbove = (role) =>
  SYSTEM_LEVEL_ROLES.includes(role) || ADMIN_LEVEL_ROLES.includes(role);

// ─── Helper: Can role A manage role B? (hierarchy enforcement) ───
export const canManageRole = (managerRole, targetRole) => {
  // Owner can manage everyone
  if (managerRole === 'owner') return true;
  // Superadmin can manage everyone except owner
  if (managerRole === 'superadmin') return targetRole !== 'owner';
  // Admin can manage staff and end-user roles, not other admins or system roles
  if (ADMIN_LEVEL_ROLES.includes(managerRole)) {
    return STAFF_LEVEL_ROLES.includes(targetRole) || END_USER_ROLES.includes(targetRole);
  }
  // Staff and end-users cannot manage anyone
  return false;
};
