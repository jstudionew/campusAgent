import * as rbac from '../services/rbac.service.js';
import * as settingsSvc from '../services/settings.service.js';
import { canManageRole, canDelegatePermission } from '../middleware/auth.js';

export const listRoles = async (req, res, next) => {
  try {
    const items = await rbac.listRoles();
    res.json({ items });
  } catch (e) { next(e); }
};

export const createRole = async (req, res, next) => {
  try {
    const rolePermissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const requesterRole = String(req.user?.role || '').toLowerCase();
    for (const permission of rolePermissions) {
      if (!await canDelegatePermission(requesterRole, permission)) {
        return res.status(403).json({ message: `Forbidden: You cannot delegate permission '${permission}'` });
      }
    }
    const role = await rbac.createCustomRole({
      name: req.body.name,
      permissions: rolePermissions,
      active: req.body.active !== false,
    });
    return res.status(201).json(role);
  } catch (e) {
    if (e.code === '23505' || e.message?.includes('already exists')) {
      return res.status(409).json({ message: 'A role with this name already exists' });
    }
    return next(e);
  }
};

export const setRoleActive = async (req, res, next) => {
  try {
    const role = String(req.params.role || '').toLowerCase();
    const { active } = req.body;
    const item = await rbac.setRoleActive(role, Boolean(active));
    res.json(item);
  } catch (e) { next(e); }
};

export const listPermissions = async (req, res, next) => {
  try {
    const data = await rbac.listPermissions();
    // Dynamic licensing filter: only show permissions for purchased + assigned modules
    // 1) Licensing allowed modules (display names array)
    let licAllowed = [];
    try {
      const licRow = await settingsSvc.getByKey('licensing.allowed_modules');
      licAllowed = JSON.parse(licRow?.value || '[]');
    } catch (_) { licAllowed = []; }
    const toKey = (n) => {
      if (!n) return null;
      const s = String(n).toLowerCase();
      // Map display names to internal module keys used in permissions
      const map = {
        students: 'students', teachers: 'teachers', parents: 'parents',
        finance: 'finance', transport: 'transport', attendance: 'attendance',
        reports: 'reports', communication: 'communication', settings: 'settings', dashboard: 'dashboard', academics: 'academics'
      };
      return map[s] || s;
    };
    const licKeys = new Set(licAllowed.map(toKey).filter(Boolean));

    // 2) Admin-assigned allowed modules (display names array) for intersection
    let adminAllowed = [];
    try {
      const mods = await rbac.listModuleAssignments();
      adminAllowed = mods?.assignments?.admin?.allowModules || [];
    } catch (_) { adminAllowed = []; }
    const adminKeys = new Set(adminAllowed.map(toKey).filter(Boolean));

    // Compute effective allowed keys based on who is requesting
    const requesterRole = String(req.user?.role || '').toLowerCase();
    let allowedKeys;
    if (requesterRole === 'owner') {
      // Owner sees intersection of what was purchased and what Admin is configured to use
      allowedKeys = new Set(Array.from(adminKeys).filter((k) => licKeys.has(k)));
    } else {
      // Admin sees only modules they are assigned AND that are licensed
      // Their own assignment equals adminKeys; intersect with licKeys.
      allowedKeys = new Set(Array.from(adminKeys).filter((k) => licKeys.has(k)));
    }

    // Reduce permissions list and assignments to only allowed modules
    const filterPerm = (p) => {
      const mod = String(p).split('.')[0];
      return allowedKeys.has(mod);
    };
    const allPerms = Array.isArray(data?.allPerms) ? data.allPerms.filter(filterPerm) : [];
    const assignments = {};
    for (const [role, perms] of Object.entries(data?.assignments || {})) {
      assignments[role] = Array.isArray(perms) ? perms.filter(filterPerm) : [];
    }
    res.json({ roles: data?.roles || [], allPerms, assignments });
  } catch (e) { next(e); }
};

export const setPermissionsForRole = async (req, res, next) => {
  try {
    const role = String(req.params.role || '').toLowerCase();
    const perms = Array.isArray(req.body.perms) ? req.body.perms : [];
    const requesterRole = String(req.user?.role || '').toLowerCase();

    if (requesterRole !== 'owner' && requesterRole !== 'superadmin' && requesterRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!canManageRole(requesterRole, role)) {
      return res.status(403).json({ message: 'Forbidden: You cannot delegate permissions to this role' });
    }

    for (const permission of perms) {
      const permitted = await canDelegatePermission(requesterRole, permission);
      if (!permitted) {
        return res.status(403).json({ message: `Forbidden: You cannot delegate permission '${permission}'` });
      }
    }

    const item = await rbac.setPermissionsForRole(role, perms);
    res.json(item);
  } catch (e) { next(e); }
};

// Module-level access APIs
export const listModules = async (req, res, next) => {
  try {
    const data = await rbac.listModuleAssignments();
    res.json(data);
  } catch (e) { next(e); }
};

export const setModulesForRole = async (req, res, next) => {
  try {
    const role = String(req.params.role || '').toLowerCase();
    const allowModules = Array.isArray(req.body.allowModules) ? req.body.allowModules : [];
    const allowSubroutes = Array.isArray(req.body.allowSubroutes) ? req.body.allowSubroutes : [];
    const requesterRole = String(req.user?.role || '').toLowerCase();

    if (requesterRole !== 'owner' && requesterRole !== 'superadmin' && requesterRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!canManageRole(requesterRole, role)) {
      return res.status(403).json({ message: 'Forbidden: You cannot delegate module access to this role' });
    }

    const delegatedPerms = new Set();
    for (const module of allowModules) {
      const key = String(module).toLowerCase();
      const permissionMap = {
        students: 'students.manage',
        teachers: 'teachers.manage',
        parents: 'parents.manage',
        attendance: 'attendance.edit',
        finance: 'finance.edit',
        transport: 'transport.manage',
        reports: 'reports.export',
        communication: 'communication.send',
        settings: 'settings.manage',
        dashboard: 'reports.view',
        academics: 'classes.manage',
      };
      const permission = permissionMap[key] || null;
      if (permission) delegatedPerms.add(permission);
    }

    for (const permission of Array.from(delegatedPerms)) {
      const permitted = await canDelegatePermission(requesterRole, permission);
      if (!permitted) {
        return res.status(403).json({ message: `Forbidden: You cannot delegate module access that requires '${permission}'` });
      }
    }

    const item = await rbac.setModulesForRole(role, { allowModules, allowSubroutes });
    res.json(item);
  } catch (e) { next(e); }
};

export const getMyModules = async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!role) return res.status(400).json({ message: 'No role' });
    const data = await rbac.listModuleAssignments();
    const item = data?.assignments?.[role] || { allowModules: [], allowSubroutes: [] };
    if (role === 'admin') {
      return res.json({ ...item, allowSubroutes: 'ALL' });
    }
    res.json(item);
  } catch (e) { next(e); }
};
