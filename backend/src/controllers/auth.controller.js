import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import * as authService from '../services/auth.service.js';
import { ensureParentsSchema, ensureAuthSchema, ensureCampusSchema } from '../db/autoMigrate.js';
import * as parentsSvc from '../services/parents.service.js';
import * as settingsSvc from '../services/settings.service.js';
import {
  DEFAULT_ALLOWED_MODULES,
  DEFAULT_OWNER_EMAIL,
  DEFAULT_OWNER_NAME,
  DEFAULT_OWNER_PASSWORD,
  OWNER_USERNAME,
} from '../config/brand.js';

export const login = async (req, res, next) => {
  try {
    const { email, username, password, ownerKey } = req.body;
    const ownerEmail = process.env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
    const ownerPassword = process.env.OWNER_PASSWORD || DEFAULT_OWNER_PASSWORD;
    const ownerUsername = process.env.OWNER_USERNAME || OWNER_USERNAME;
    const ownerKeyMin = Number(process.env.OWNER_KEY_MIN_LENGTH || 30);
    const loginIdent = String(email || username || '').toLowerCase().trim();
    const isOwnerIdent =
      loginIdent === String(ownerEmail).toLowerCase().trim() ||
      loginIdent === String(ownerUsername).toLowerCase().trim();

    // Gate: disallow non-owner logins until licensing is configured
    const force = String(process.env.FORCE_SETUP || '').toLowerCase() === 'true';
    const lic = await settingsSvc.getByKey('licensing.configured');
    let licensingConfigured = String(lic?.value || '').toLowerCase() === 'true';
    if (force) licensingConfigured = true;
    // Determine allowed modules/roles after licensing is configured
    let allowedModules = [];
    try {
      const allowedRow = await settingsSvc.getByKey('licensing.allowed_modules');
      allowedModules = JSON.parse(allowedRow?.value || '[]');
    } catch (_) { allowedModules = []; }
    if (force) { allowedModules = DEFAULT_ALLOWED_MODULES; }
    const allowedRoles = new Set();
    if (Array.isArray(allowedModules)) {
      if (allowedModules.includes('Teachers')) allowedRoles.add('teacher');
      if (allowedModules.includes('Students')) allowedRoles.add('student');
      if (allowedModules.includes('Parents')) allowedRoles.add('parent');
      if (allowedModules.includes('Transport')) allowedRoles.add('driver');
      if (allowedModules.includes('Dashboard') || allowedModules.includes('Settings')) allowedRoles.add('admin');
    }

    // Ensure auth and campus schema changes are applied
    try {
      await ensureAuthSchema();
      await ensureCampusSchema();
    } catch (_) { }

    // Owner-first: require correct password; owner key is step-2
    if (isOwnerIdent) {
      // Ensure owner exists using configured password (NOT user-supplied)
      let ownerUser = await authService.findUserByEmail(ownerEmail);
      if (!ownerUser) ownerUser = await authService.findUserByUsername(ownerUsername);
      if (!ownerUser) {
        await authService.ensureOwnerUser({
          email: ownerEmail,
          username: ownerUsername,
          password: ownerPassword,
          name: DEFAULT_OWNER_NAME,
        });
        ownerUser = await authService.findUserByEmail(ownerEmail) || await authService.findUserByUsername(ownerUsername);
      }
      if (!ownerUser) return res.status(401).json({ message: 'Invalid credentials' });

      const passOk = await bcrypt.compare(String(password || ''), ownerUser.password_hash || '');
      if (!passOk) return res.status(401).json({ message: 'Invalid credentials' });

      if (!force) {
        const keyRow = await settingsSvc.getByKey('owner.key_hash');
        const keyHash = keyRow?.value || '';
        if (!keyHash) {
          if (!ownerKey || String(ownerKey).length < ownerKeyMin) {
            return res.status(401).json({ message: `Owner key not set. Provide a ${ownerKeyMin}+ character key to initialize.`, code: 'OWNER_KEY_REQUIRED' });
          }
          const newHash = await bcrypt.hash(String(ownerKey), 10);
          await settingsSvc.setKey('owner.key_hash', newHash);
          try {
            await settingsSvc.setKey('licensing.configured', 'true');
            await settingsSvc.setKey('licensing.allowed_modules', JSON.stringify(DEFAULT_ALLOWED_MODULES));
          } catch (_) { }
        } else if (ownerKey) {
          const keyOk = await bcrypt.compare(String(ownerKey), keyHash);
          if (!keyOk) return res.status(401).json({ message: 'Invalid owner key' });
        }
      }

      const userPayload = {
        id: ownerUser.id,
        email: ownerUser.email || ownerEmail,
        username: ownerUser.username || ownerUsername,
        role: 'owner',
        name: ownerUser.name || DEFAULT_OWNER_NAME,
        campusId: ownerUser.campus_id
      };
      const token = signAccessToken(userPayload);
      const refreshToken = signRefreshToken({ id: ownerUser.id });
      return res.json({ token, refreshToken, user: userPayload });
    }

    // If licensing is not configured yet, block all non-owner logins
    if (!licensingConfigured) {
      return res.status(423).json({ message: 'System setup pending. Only owner can sign in until licensing is configured.' });
    }
    // Strict auth: do not auto-provision users during login (including parent phone logins)
    // Accept either email or WhatsApp number in the "email" field for parents
    let user = null;
    if (email) {
      user = await authService.findUserByEmail(email);
    }
    if (!user && username) {
      user = await authService.findUserByUsername(username);
    }
    // If still not found and an email-like field was actually a username, try it
    if (!user && email) {
      const s = String(email).trim();
      const looksLikeEmail = /.+@.+\..+/.test(s);
      const looksLikePhone = /^\+?\d{10,15}$/.test(s) || /^0\d{10}$/.test(s) || /^3\d{9}$/.test(s);
      if (!looksLikeEmail && !looksLikePhone) {
        user = await authService.findUserByUsername(s);
      }
    }
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(String(password || ''), user.password_hash || '');
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // Enforce module-based licensing for roles other than owner
    if (user.role !== 'owner' && allowedRoles.size && !allowedRoles.has(user.role)) {
      return res.status(423).json({ message: 'Your role is not licensed for login on this installation.' });
    }
    if (user.role === 'admin' && !user.campus_id) {
      return res.status(403).json({ message: 'Admin account is not assigned to a campus' });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      name: user.name,
      campusId: user.campus_id,
      jobTitle: user.job_title,
      department: user.department
    };
    const token = signAccessToken(userPayload);
    const refreshToken = signRefreshToken({ id: user.id });

    return res.json({ token, refreshToken, user: userPayload });
  } catch (e) {
    next(e);
  }
};

// Get all users with pagination and filtering
export const getAllUsers = async (req, res, next) => {
  try {
    const requesterRole = req.user?.role;
    const isPrivileged = requesterRole === 'admin' || requesterRole === 'owner' || requesterRole === 'superadmin';

    // Non-admin/owner/superadmin users can only see their own user record
    if (!isPrivileged) {
      const self = await authService.findUserById(req.user.id);
      const userPayload = self
        ? {
          id: self.id,
          email: self.email,
          username: self.username,
          role: self.role,
          name: self.name,
          campusId: self.campus_id,
          jobTitle: self.job_title,
          department: self.department
        }
        : null;
      return res.json({ rows: userPayload ? [userPayload] : [], total: userPayload ? 1 : 0, page: 1, pageSize: 1 });
    }

    const { page = 1, pageSize = 50, role, search } = req.query;
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];

    // Admin: scope by campusId (owner/superadmin can pass x-campus-id or view all)
    if (requesterRole === 'admin' && !req.user?.campusId) {
      return res.json({ rows: [], total: 0, page: Number(page), pageSize: Number(pageSize) });
    }
    if (req.user?.campusId) {
      params.push(Number(req.user.campusId));
      where.push(`campus_id = $${params.length}`);
    }

    if (role && role !== 'all') {
      params.push(role);
      where.push(`role = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(username) LIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Get total count
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS count FROM users ${whereSql}`,
      params
    );
    const total = countRows[0]?.count || 0;

    // Get users with job_title and department
    const { rows } = await query(
      `SELECT id, username, email, role, name, campus_id AS "campusId", job_title AS "jobTitle", department, created_at AS "createdAt"
       FROM users ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return res.json({ rows, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (e) {
    next(e);
  }
};

// Update user
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, jobTitle, department } = req.body;
    const requesterRole = req.user?.role;

    const targetUser = await authService.findUserById(id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Superadmin or admin cannot modify the owner account
    if (targetUser.role === 'owner' && requesterRole !== 'owner') {
      return res.status(403).json({ message: 'Cannot modify the Owner account' });
    }

    // Admin-level restrictions
    if (requesterRole === 'admin') {
      if (!req.user?.campusId) return res.status(403).json({ message: 'Forbidden' });
      if (!targetUser.campus_id || Number(targetUser.campus_id) !== Number(req.user.campusId)) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Admin cannot modify owner, superadmin, or other admin
      if (['owner', 'superadmin', 'admin'].includes(targetUser.role)) {
        return res.status(403).json({ message: 'Admins cannot modify administrator accounts' });
      }
      // Admin cannot promote anyone to admin, superadmin, or owner
      if (role && ['owner', 'superadmin', 'admin'].includes(role)) {
        return res.status(403).json({ message: 'Forbidden: Cannot assign administrative roles' });
      }
    }

    // Superadmin cannot promote to owner or modify owner
    if (requesterRole === 'superadmin' && role === 'owner') {
      return res.status(403).json({ message: 'Superadmin cannot assign owner role' });
    }

    // Only owner/superadmin can grant admin role
    if (role === 'admin' && requesterRole !== 'owner' && requesterRole !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Prevent updating self role to avoid lockout
    if (req.user.id === Number(id) && role && role !== req.user.role) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const updates = { name, email, role, jobTitle, department };
    if (password && password.length >= 6) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await authService.updateUser(id, updates);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    return res.json(updated);
  } catch (e) {
    next(e);
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requesterRole = req.user?.role;

    // Prevent deleting self
    if (req.user.id === Number(id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const targetUser = await authService.findUserById(id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // NO ONE can delete the owner account
    if (targetUser.role === 'owner') {
      return res.status(403).json({ message: 'Cannot delete the Owner account' });
    }

    // ONLY the Owner can delete a Superadmin account
    if (targetUser.role === 'superadmin' && requesterRole !== 'owner') {
      return res.status(403).json({ message: 'Only the Owner can delete a Superadmin account' });
    }

    // Admin-level restrictions
    if (requesterRole === 'admin') {
      if (!req.user?.campusId) return res.status(403).json({ message: 'Forbidden' });
      if (!targetUser.campus_id || Number(targetUser.campus_id) !== Number(req.user.campusId)) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Admin cannot delete owner, superadmin, or admin
      if (['owner', 'superadmin', 'admin'].includes(targetUser.role)) {
        return res.status(403).json({ message: 'Admins cannot delete administrative accounts' });
      }
    }

    const deleted = await authService.deleteUser(id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    return res.json({ message: 'User deleted successfully' });
  } catch (e) {
    next(e);
  }
};

export const register = async (req, res, next) => {
  try {
    // Ensure campus schema changes are applied
    try { await ensureCampusSchema(); } catch (_) { }

    const { email, password, name, role = 'student', campusId, jobTitle, department } = req.body;
    const requesterRole = req.user?.role;

    // Determine campus:
    // Owner and superadmin can pass any campusId (or null if system-level user)
    // Admin is strictly constrained to their own campusId
    let finalCampusId = Number(campusId || req.user?.campusId) || null;
    if (requesterRole === 'admin') {
      finalCampusId = Number(req.user?.campusId);
      if (!finalCampusId) {
        return res.status(403).json({ message: 'Admin account has no assigned campus' });
      }
    }

    if (!finalCampusId && role !== 'owner' && role !== 'superadmin') {
      return res.status(400).json({ message: 'Campus selection is mandatory for this role' });
    }

    // Role creation validation:
    // 1. Owner can create any role
    // 2. Superadmin can create any role EXCEPT owner
    // 3. Admin can ONLY create staff and end-user roles
    if (role === 'owner') {
      return res.status(403).json({ message: 'Cannot create additional Owner accounts' });
    }

    if (requesterRole === 'superadmin') {
      // Superadmin can create admin and staff roles
    } else if (requesterRole === 'admin') {
      const forbiddenForAdmin = ['owner', 'superadmin', 'admin'];
      if (forbiddenForAdmin.includes(role)) {
        return res.status(403).json({ message: 'Admins cannot create administrator or superadmin accounts' });
      }
    } else if (requesterRole !== 'owner') {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges to create users' });
    }

    // Validate role is in allowed list
    if (!authService.ALLOWED_USER_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role: ${role}`,
        allowedRoles: authService.ALLOWED_USER_ROLES
      });
    }

    const existing = await authService.findUserByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await authService.createUser({
      email,
      passwordHash,
      role,
      name,
      campusId: finalCampusId,
      jobTitle: jobTitle || null,
      department: department || null
    });

    // If this user corresponds to an existing domain record, link it
    try {
      if (user?.id && user?.email && role === 'student') {
        await query(
          `UPDATE students
           SET user_id = $1
           WHERE user_id IS NULL
             AND campus_id = $2
             AND LOWER(COALESCE(email,'')) = LOWER($3)`,
          [user.id, finalCampusId, user.email]
        );
      }
      if (user?.id && user?.email && role === 'teacher') {
        await query(
          `UPDATE teachers
           SET user_id = $1
           WHERE user_id IS NULL
             AND campus_id = $2
             AND LOWER(COALESCE(email,'')) = LOWER($3)`,
          [user.id, finalCampusId, user.email]
        );
      }
      if (user?.id && user?.email && role === 'driver') {
        await query(
          `UPDATE drivers
           SET user_id = $1
           WHERE user_id IS NULL
             AND campus_id = $2
             AND LOWER(COALESCE(email,'')) = LOWER($3)`,
          [user.id, finalCampusId, user.email]
        );
      }
    } catch (_) {}

    const userPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      campusId: user.campus_id,
      jobTitle: user.job_title,
      department: user.department
    };

    return res.status(201).json({ user: userPayload });
  } catch (e) {
    next(e);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Stateless JWT: client should discard tokens. Optionally add to denylist.
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = verifyRefreshToken(refreshToken);
    const user = await authService.findUserById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const userPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      campusId: user.campus_id
    };
    const token = signAccessToken(userPayload);
    const newRefresh = signRefreshToken({ id: user.id });
    return res.json({ token, refreshToken: newRefresh, user: userPayload });
  } catch (e) {
    e.status = 401;
    next(e);
  }
};

export const profile = async (req, res, next) => {
  try {
    const user = await authService.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      name: user.name,
      campusId: user.campus_id,
      jobTitle: user.job_title,
      department: user.department
    };
    return res.json({ user: userPayload });
  } catch (e) {
    next(e);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Non-admin/owner/superadmin can only read themselves
    const isPrivileged = ['admin', 'owner', 'superadmin'].includes(req.user?.role);
    if (!isPrivileged && Number(id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user?.role === 'admin' && !req.user?.campusId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await authService.findUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Admin: enforce campus scope
    if (req.user?.role === 'admin' && req.user?.campusId) {
      if (Number(user.campus_id) !== Number(req.user.campusId)) {
        return res.status(404).json({ message: 'User not found' });
      }
    }
    const userPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      name: user.name,
      campusId: user.campus_id,
      jobTitle: user.job_title,
      department: user.department
    };
    return res.json({ user: userPayload });
  } catch (e) {
    next(e);
  }
};

// Owner Visibility Settings: Get all controls
export const getVisibilitySettings = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, setting_key AS "settingKey", setting_value AS "settingValue", description, updated_at AS "updatedAt" FROM owner_visibility_settings ORDER BY setting_key ASC'
    );
    return res.json({ settings: rows });
  } catch (e) {
    next(e);
  }
};

// Owner Visibility Settings: Update/upsert a setting
export const updateVisibilitySetting = async (req, res, next) => {
  try {
    const { settingKey, settingValue, description } = req.body;
    if (!settingKey) return res.status(400).json({ message: 'settingKey is required' });

    const val = typeof settingValue === 'object' ? JSON.stringify(settingValue) : String(settingValue);
    const { rows } = await query(
      `INSERT INTO owner_visibility_settings (setting_key, setting_value, description, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $2::jsonb, description = COALESCE($3, owner_visibility_settings.description), updated_at = NOW()
       RETURNING id, setting_key AS "settingKey", setting_value AS "settingValue", description, updated_at AS "updatedAt"`,
      [settingKey, val, description || null]
    );

    return res.json({ setting: rows[0] });
  } catch (e) {
    next(e);
  }
};

export const backfillUsers = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowed = ['student', 'teacher', 'driver'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const result = await authService.backfillUsersFromDomain(role);
    return res.json(result);
  } catch (e) {
    next(e);
  }
};

export const status = async (req, res, next) => {
  try {
    const force = String(process.env.FORCE_SETUP || '').toLowerCase() === 'true';
    const lic = await settingsSvc.getByKey('licensing.configured');
    let licensingConfigured = String(lic?.value || '').toLowerCase() === 'true';
    if (force) licensingConfigured = true;
    let allowedModules = [];
    try {
      const allowedRow = await settingsSvc.getByKey('licensing.allowed_modules');
      allowedModules = JSON.parse(allowedRow?.value || '[]');
    } catch (_) { allowedModules = []; }
    if (force && (!Array.isArray(allowedModules) || allowedModules.length === 0)) {
      allowedModules = ['Dashboard', 'Settings', 'Teachers', 'Students', 'Parents', 'Transport'];
    }
    const { rows: adminRows } = await query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['admin']);
    const adminExists = adminRows.length > 0;
    return res.json({ licensingConfigured, allowedModules, adminExists });
  } catch (e) {
    next(e);
  }
};
