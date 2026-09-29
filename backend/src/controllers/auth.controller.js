import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import * as authService from '../services/auth.service.js';
import { ensureParentsSchema, ensureAuthSchema, ensureCampusSchema } from '../db/autoMigrate.js';
import * as parentsSvc from '../services/parents.service.js';
import * as settingsSvc from '../services/settings.service.js';
import { sanitizeUserResponse } from '../utils/privacy.js';
import { appendAuditLog } from '../utils/audit.js';
import cloudinary from '../config/cloudinary.js';
import {
  DEFAULT_ALLOWED_MODULES,
  DEFAULT_OWNER_NAME,
  resolveOwnerConfig,
} from '../config/brand.js';

const BASE_PROFILE_FIELDS = ['name', 'username', 'email', 'phone', 'avatar'];
const PROFESSIONAL_PROFILE_ROLES = new Set([
  'owner',
  'superadmin',
  'admin',
  'teacher',
  'academic_coordinator',
  'admissions',
  'reception',
  'office_staff',
  'finance',
  'finance_manager',
  'hr_manager',
  'hr',
  'it_admin',
  'it_support',
  'library',
  'transport',
  'security',
]);

const getEditableProfileFields = (role) => (
  PROFESSIONAL_PROFILE_ROLES.has(role)
    ? [...BASE_PROFILE_FIELDS, 'jobTitle', 'department']
    : [...BASE_PROFILE_FIELDS]
);

export const resolveLicensingState = ({ configuredValue, allowedModulesValue, fallbackModules = DEFAULT_ALLOWED_MODULES } = {}) => {
  let allowedModules = Array.isArray(fallbackModules) ? [...fallbackModules] : [];

  if (allowedModulesValue !== undefined && allowedModulesValue !== null && String(allowedModulesValue).trim()) {
    try {
      const parsed = JSON.parse(String(allowedModulesValue));
      if (Array.isArray(parsed) && parsed.length) allowedModules = parsed;
    } catch (_) {
      allowedModules = Array.isArray(fallbackModules) ? [...fallbackModules] : [];
    }
  }

  return {
    licensingConfigured: true,
    allowedModules,
  };
};

export const login = async (req, res, next) => {
  try {
    const { email, username, phone, password } = req.body;
    const {
      email: ownerEmail,
      username: ownerUsername,
      name: ownerName,
      password: ownerPassword,
    } = resolveOwnerConfig();
    const loginIdent = String(email || username || '').toLowerCase().trim();
    const isOwnerIdent =
      loginIdent === String(ownerEmail).toLowerCase().trim() ||
      loginIdent === String(ownerUsername).toLowerCase().trim();

    const { allowedModules } = resolveLicensingState({
      configuredValue: 'true',
      allowedModulesValue: JSON.stringify(DEFAULT_ALLOWED_MODULES),
    });
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
      // Bootstrap a missing owner with the same configured credentials used at startup.
      let ownerUser = await authService.findUserByEmail(ownerEmail);
      if (!ownerUser) ownerUser = await authService.findUserByUsername(ownerUsername);
      if (!ownerUser && process.env.NODE_ENV === 'production') {
        return res.status(401).json({
          success: false,
          message: 'System Owner account is not configured.',
          field: 'identifier',
          code: 'USER_NOT_FOUND',
        });
      }
      if (!ownerUser) {
        await authService.ensureOwnerUser({
          email: ownerEmail,
          username: ownerUsername,
          password: ownerPassword,
          name: ownerName,
        });
        ownerUser = await authService.findUserByEmail(ownerEmail) || await authService.findUserByUsername(ownerUsername);
      }
      if (!ownerUser) {
        return res.status(401).json({
          success: false,
          message: 'System Owner account is not configured.',
          field: 'identifier',
          code: 'USER_NOT_FOUND',
        });
      }

      const passOk = await bcrypt.compare(String(password || ''), ownerUser.password_hash || '');
      if (!passOk) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password for System Owner.',
          field: 'password',
          code: 'INVALID_PASSWORD',
        });
      }

      const userPayload = {
        id: ownerUser.id,
        email: ownerUser.email || ownerEmail,
        username: ownerUser.username || ownerUsername,
        role: 'owner',
        name: ownerUser.name || ownerName,
        campusId: ownerUser.campus_id,
        jobTitle: ownerUser.job_title,
        department: ownerUser.department,
        phone: ownerUser.phone,
        avatar: ownerUser.avatar,
      };
      const token = signAccessToken(userPayload);
      const refreshToken = signRefreshToken({ id: ownerUser.id });
      await appendAuditLog({ actorId: ownerUser.id, actorRole: 'owner', action: 'login', entityType: 'user', entityId: ownerUser.id, campusId: ownerUser.campus_id, details: { method: 'password' }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
      return res.json({ token, refreshToken, user: sanitizeUserResponse(userPayload, { actorRole: 'owner', actorId: ownerUser.id, targetId: ownerUser.id }) });
    }

    // Normal deployment: no first-run license gating
    // Strict auth: do not auto-provision users during login (including parent phone logins)
    // Accept either email or WhatsApp number in the "email" field for parents
    const identifier = email || username || phone;
    const user = await authService.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this username, email, or phone number.',
        field: 'identifier',
        code: 'USER_NOT_FOUND',
      });
    }

    const ok = await bcrypt.compare(String(password || ''), user.password_hash || '');
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please verify and try again.',
        field: 'password',
        code: 'INVALID_PASSWORD',
      });
    }

    if (user.role === 'admin' && !user.campus_id) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is not assigned to a campus.',
        field: 'campus',
        code: 'CAMPUS_UNASSIGNED',
      });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      name: user.name,
      campusId: user.campus_id,
      jobTitle: user.job_title,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
    };
    const token = signAccessToken(userPayload);
    const refreshToken = signRefreshToken({ id: user.id });
    await appendAuditLog({ actorId: user.id, actorRole: user.role, action: 'login', entityType: 'user', entityId: user.id, campusId: user.campus_id, details: { method: 'password' }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ token, refreshToken, user: sanitizeUserResponse(userPayload, { actorRole: user.role, actorId: user.id, targetId: user.id }) });
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
      where.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(username) LIKE $${params.length} OR phone LIKE $${params.length})`);
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
      `SELECT id, username, email, phone, role, name, campus_id AS "campusId", job_title AS "jobTitle", department, created_at AS "createdAt"
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
    const { name, username, email, phone, role, password, jobTitle, department } = req.body;
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

    for (const [field, lookup] of [
      ['username', authService.findUserByUsername],
      ['email', authService.findUserByEmail],
      ['phone', authService.findUserByPhone],
    ]) {
      if (!req.body[field]) continue;
      const existing = await lookup(req.body[field]);
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).json({ message: `${field} is already in use` });
      }
    }

    const updates = { name, username, email, phone, role, jobTitle, department };
    if (password && password.length >= 6) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await authService.updateUser(id, updates);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    await appendAuditLog({ actorId: req.user?.id, actorRole: req.user?.role, action: 'user_update', entityType: 'user', entityId: id, campusId: req.user?.campusId, details: { updatedFields: Object.keys(updates) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json(sanitizeUserResponse(updated, { actorRole: req.user?.role, actorId: req.user?.id, targetId: id }));
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

    await appendAuditLog({ actorId: req.user?.id, actorRole: req.user?.role, action: 'user_delete', entityType: 'user', entityId: id, campusId: req.user?.campusId, details: { targetRole: targetUser.role }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ message: 'User deleted successfully' });
  } catch (e) {
    next(e);
  }
};

export const register = async (req, res, next) => {
  try {
    // Ensure campus schema changes are applied
    try { await ensureCampusSchema(); } catch (_) { }

    const { email, username, phone, password, name, role = 'student', campusId, jobTitle, department } = req.body;
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

    if (!email && !username && !phone) {
      return res.status(400).json({ message: 'Email, username, or phone number is required' });
    }
    const identifiers = [email, username, phone].filter(Boolean);
    for (const identifier of identifiers) {
      const existing = await authService.findUserByIdentifier(identifier);
      if (existing) return res.status(409).json({ message: 'Email, username, or phone number is already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await authService.createUser({
      email,
      username,
      phone,
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
      username: user.username,
      phone: user.phone,
      role: user.role,
      name: user.name,
      campusId: user.campus_id,
      jobTitle: user.job_title,
      department: user.department,
      phone: user.phone
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
      campusId: user.campus_id,
      username: user.username,
      jobTitle: user.job_title,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
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
    const user = await authService.findOwnProfile(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      name: user.name,
      campusId: user.campus_id,
      jobTitle: user.job_title,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
    };
    return res.json({ user: userPayload, editableFields: getEditableProfileFields(user.role) });
  } catch (e) {
    next(e);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'A profile update object is required' });
    }

    const requester = await authService.findUserById(req.user.id);
    if (!requester) return res.status(404).json({ message: 'User not found' });
    const allowedFields = getEditableProfileFields(requester.role);
    const allowedKeys = new Set([...allowedFields, 'currentPassword', 'newPassword']);
    const unsupportedFields = Object.keys(req.body).filter((key) => !allowedKeys.has(key));
    if (unsupportedFields.length) {
      return res.status(403).json({ message: 'One or more profile fields cannot be changed for this role' });
    }

    const updates = {};
    for (const field of allowedFields) {
      if (!Object.hasOwn(req.body, field)) continue;
      const rawValue = req.body[field];
      if (field === 'avatar') {
        if (rawValue !== null && typeof rawValue !== 'string') {
          return res.status(400).json({ message: 'Profile photo must be a URL or image file' });
        }
        updates.avatar = typeof rawValue === 'string' ? rawValue.trim() || null : null;
        continue;
      }
      if (rawValue !== null && typeof rawValue !== 'string') {
        return res.status(400).json({ message: `${field} must be a string` });
      }
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';

      if (field === 'name') {
        if (!value || value.length > 120) {
          return res.status(400).json({ message: 'Name must be between 1 and 120 characters' });
        }
        updates.name = value;
      } else if (field === 'username') {
        if (!/^[a-zA-Z0-9._-]{3,40}$/.test(value)) {
          return res.status(400).json({ message: 'Username must be 3-40 characters using letters, numbers, dots, underscores, or hyphens' });
        }
        updates.username = value.toLowerCase();
      } else if (field === 'email') {
        const normalizedEmail = value.toLowerCase();
        if (normalizedEmail && (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))) {
          return res.status(400).json({ message: 'Enter a valid email address' });
        }
        updates.email = normalizedEmail || null;
      } else if (field === 'phone') {
        if (value.length > 32) return res.status(400).json({ message: 'Phone number must be 32 characters or fewer' });
        updates.phone = value || null;
      } else if (field === 'jobTitle' || field === 'department') {
        if (value.length > 120) return res.status(400).json({ message: `${field} must be 120 characters or fewer` });
        updates[field] = value || null;
      }
    }

    const { currentPassword, newPassword } = req.body;
    const isChangingPassword = currentPassword !== undefined || newPassword !== undefined;
    if (isChangingPassword) {
      if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string') {
        return res.status(400).json({ message: 'Current and new passwords are required to change your password' });
      }
      if (newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({ message: 'New password must be between 8 and 128 characters' });
      }

      const credentials = await authService.findUserCredentialsById(req.user.id);
      if (!credentials) return res.status(404).json({ message: 'User not found' });
      const passwordMatches = await bcrypt.compare(currentPassword, credentials.password_hash || '');
      if (!passwordMatches) return res.status(401).json({ message: 'Current password is incorrect' });
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const profileFields = Object.keys(updates).filter((field) => field !== 'passwordHash');
    if (profileFields.length === 0 && !isChangingPassword) {
      return res.status(400).json({ message: 'No profile changes were provided' });
    }

    if (updates.username) {
      const existing = await authService.findUserByUsername(updates.username);
      if (existing && Number(existing.id) !== Number(req.user.id)) {
        return res.status(409).json({ message: 'Username is already in use' });
      }
    }
    if (updates.email) {
      const existing = await authService.findUserByEmail(updates.email);
      if (existing && Number(existing.id) !== Number(req.user.id)) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
    }
    if (updates.phone) {
      const existing = await authService.findUserByPhone(updates.phone);
      if (existing && Number(existing.id) !== Number(req.user.id)) {
        return res.status(409).json({ message: 'Phone number is already in use' });
      }
    }

    if (typeof updates.avatar === 'string' && updates.avatar.startsWith('data:')) {
      const imageMatch = updates.avatar.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
      if (!imageMatch || imageMatch[2].length > 2_800_000) {
        return res.status(400).json({ message: 'Choose a PNG, JPEG, or WebP image no larger than 2 MB' });
      }
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ message: 'Profile photo uploads are not configured on this server' });
      }
      const upload = await cloudinary.uploader.upload(updates.avatar, {
        folder: 'user-profiles',
        resource_type: 'image',
        transformation: [{ width: 512, height: 512, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      });
      updates.avatar = upload.secure_url;
    } else if (typeof updates.avatar === 'string') {
      try {
        const avatarUrl = new URL(updates.avatar);
        if (avatarUrl.protocol !== 'https:' || avatarUrl.username || avatarUrl.password || updates.avatar.length > 2048) {
          return res.status(400).json({ message: 'Profile photo URL must be a valid HTTPS URL' });
        }
      } catch {
        return res.status(400).json({ message: 'Profile photo URL must be a valid HTTPS URL' });
      }
    }

    let updated;
    try {
      updated = await authService.updateOwnProfile(req.user.id, updates, { expectedRole: requester.role });
    } catch (error) {
      if (error?.code === '23505') {
        return res.status(409).json({ message: 'Username or email is already in use' });
      }
      if (error?.code === 'PROFILE_ROLE_CHANGED') {
        return res.status(403).json({ message: error.message });
      }
      throw error;
    }
    if (!updated) return res.status(404).json({ message: 'User not found' });

    await appendAuditLog({
      actorId: req.user.id,
      actorRole: requester.role,
      action: 'profile_update',
      entityType: 'user',
      entityId: req.user.id,
      campusId: requester.campus_id,
      details: {
        updatedFields: profileFields,
        passwordChanged: isChangingPassword,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const userPayload = {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      name: updated.name,
      campusId: updated.campus_id,
      jobTitle: updated.job_title,
      department: updated.department,
      phone: updated.phone,
      avatar: updated.avatar,
    };
    const token = signAccessToken(userPayload);
    return res.json({
      user: sanitizeUserResponse(userPayload, {
        actorRole: requester.role,
        actorId: req.user.id,
        targetId: updated.id,
      }),
      editableFields: getEditableProfileFields(updated.role),
      token,
    });
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
      department: user.department,
      phone: user.phone
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
    const { licensingConfigured, allowedModules } = resolveLicensingState({
      configuredValue: 'true',
      allowedModulesValue: JSON.stringify(DEFAULT_ALLOWED_MODULES),
    });
    const { rows: adminRows } = await query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['admin']);
    const adminExists = adminRows.length > 0;
    return res.json({ licensingConfigured, allowedModules, adminExists });
  } catch (e) {
    next(e);
  }
};
