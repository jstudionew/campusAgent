import { pool, query } from '../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as rbacService from './rbac.service.js';

// All system roles that can be assigned to users
export const ALLOWED_USER_ROLES = [
  'student', 'teacher', 'driver', 'parent', 'admin', 'superadmin',
  'academic_coordinator', 'admissions', 'reception', 'office_staff',
  'finance', 'finance_manager', 'hr_manager', 'hr',
  'it_admin', 'it_support', 'library', 'transport', 'security',
];

export const isAllowedUserRole = async (role) => {
  if (!ALLOWED_USER_ROLES.includes(role) && !await rbacService.isCustomRole(role)) return false;
  return rbacService.isAssignableRole(role);
};

// Normalize Pakistan WhatsApp numbers to +92 format for consistent login identifiers
const normalizePkPhone = (raw) => {
  if (!raw) return raw;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('92')) return `+${digits}`;
  if (digits.startsWith('0')) return `+92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('3')) return `+92${digits}`;
  return String(raw).startsWith('+') ? String(raw) : `+${digits}`;
};

export const findUserByEmail = async (email) => {
  const { rows } = await query('SELECT id, username, email, password_hash, role, name, campus_id, job_title, department, phone, avatar, status FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [email]);
  return rows[0] || null;
};

export const findUserByUsername = async (username) => {
  const { rows } = await query('SELECT id, username, email, password_hash, role, name, campus_id, job_title, department, phone, avatar, status FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))', [username]);
  return rows[0] || null;
};

export const findUserByPhone = async (phone) => {
  const { rows } = await query(
    `SELECT id, username, email, password_hash, role, name, campus_id, job_title, department, phone, avatar, status
     FROM users
       WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') <> ''
        AND regexp_replace($1, '[^0-9]', '', 'g') <> ''
        AND regexp_replace($1, '[^0-9+(). -]', '', 'g') = $1
         AND (regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
           OR RIGHT(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = RIGHT(regexp_replace($1, '[^0-9]', '', 'g'), 10))
     LIMIT 1`,
    [phone]
  );
  return rows[0] || null;
};

export const findUserByIdentifier = async (identifier) => {
  const value = String(identifier || '').trim();
  if (!value) return null;

  const { rows } = await query(
    `SELECT id, username, email, password_hash, role, name, campus_id, job_title, department, phone, avatar, status
     FROM users
     WHERE LOWER(TRIM(COALESCE(email, ''))) = LOWER(TRIM($1))
        OR LOWER(TRIM(COALESCE(username, ''))) = LOWER(TRIM($1))
        OR (
          regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') <> ''
          AND regexp_replace($1, '[^0-9]', '', 'g') <> ''
          AND regexp_replace($1, '[^0-9+(). -]', '', 'g') = $1
          AND (regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
            OR RIGHT(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = RIGHT(regexp_replace($1, '[^0-9]', '', 'g'), 10))
        )
     LIMIT 1`,
    [value]
  );
  return rows[0] || null;
};

export const findUserById = async (id) => {
  const { rows } = await query('SELECT id, email, username, role, name, campus_id, job_title, department, phone, avatar, status FROM users WHERE id = $1', [id]);
  return rows[0] || null;
};

export const findOwnProfile = async (id) => {
  const user = await findUserById(id);
  if (!user) return null;

  const profileTables = {
    teacher: `SELECT name, email, phone, avatar, designation AS job_title, department
              FROM teachers WHERE user_id = $1 LIMIT 1`,
    student: `SELECT name, email, personal->>'phone' AS phone, avatar
              FROM students WHERE user_id = $1 LIMIT 1`,
    driver: `SELECT name, email, phone, avatar
             FROM drivers WHERE user_id = $1 LIMIT 1`,
  };
  const profileSql = profileTables[user.role];
  if (!profileSql) return user;

  const { rows } = await query(profileSql, [id]);
  const linkedProfile = rows[0];
  if (!linkedProfile) return user;
  for (const field of ['name', 'email', 'phone', 'avatar', 'job_title', 'department']) {
    if ((user[field] === null || user[field] === undefined || user[field] === '') && linkedProfile[field]) {
      user[field] = linkedProfile[field];
    }
  }
  return user;
};

export const findUserCredentialsById = async (id) => {
  const { rows } = await query('SELECT id, password_hash FROM users WHERE id = $1', [id]);
  return rows[0] || null;
};

export const updateOwnProfile = async (id, updates, { expectedRole } = {}) => {
  const userColumns = {
    name: 'name',
    username: 'username',
    email: 'email',
    phone: 'phone',
    avatar: 'avatar',
    jobTitle: 'job_title',
    department: 'department',
    passwordHash: 'password_hash',
  };
  const domainColumns = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    avatar: 'avatar',
  };
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows: currentUsers } = await client.query(
      'SELECT id, role FROM users WHERE id = $1 FOR UPDATE',
      [id]
    );
    const currentUser = currentUsers[0];
    if (!currentUser) {
      await client.query('ROLLBACK');
      return null;
    }
    if (expectedRole && currentUser.role !== expectedRole) {
      const error = new Error('Account role changed. Reload your profile and try again.');
      error.code = 'PROFILE_ROLE_CHANGED';
      throw error;
    }

    const fields = Object.keys(updates).filter((key) => userColumns[key]);
    const values = [];
    const assignments = fields.map((key) => {
      values.push(updates[key]);
      return `${userColumns[key]} = $${values.length}`;
    });
    values.push(id);
    const { rows } = await client.query(
      `UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length}
       RETURNING id, username, email, role, name, campus_id, job_title, department, phone, avatar`,
      values
    );
    const updatedUser = rows[0];

    const linkedColumns = currentUser.role === 'teacher'
      ? { ...domainColumns, jobTitle: 'designation', department: 'department' }
      : domainColumns;
    const profileFields = Object.keys(updates).filter((key) => linkedColumns[key]);
    if (profileFields.length) {
      const roleTables = {
        teacher: 'teachers',
        student: 'students',
        driver: 'drivers',
      };
      const table = roleTables[currentUser.role];
      if (table) {
        const domainValues = [];
        const domainAssignments = profileFields
          .filter((key) => !(currentUser.role === 'student' && key === 'phone'))
          .map((key) => {
            domainValues.push(updates[key]);
            return `${linkedColumns[key]} = $${domainValues.length}`;
          });

        if (currentUser.role === 'student' && Object.hasOwn(updates, 'phone')) {
          domainValues.push(updates.phone);
          domainAssignments.push(
            `personal = COALESCE(personal, '{}'::jsonb) || jsonb_build_object('phone', $${domainValues.length}::text)`
          );
        }
        if (table !== 'students') domainAssignments.push('updated_at = NOW()');

        if (domainAssignments.length) {
          domainValues.push(id);
          await client.query(
            `UPDATE ${table} SET ${domainAssignments.join(', ')} WHERE user_id = $${domainValues.length}`,
            domainValues
          );
        }
      }
    }

    await client.query('COMMIT');
    return updatedUser;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Create new user (admin only)
export const createUser = async ({ email = null, username = null, phone = null, passwordHash, role = 'student', name, campusId, jobTitle = null, department = null, active = true }) => {
  // Validate role is in allowed list
  if (!await isAllowedUserRole(role)) {
    throw new Error(`Invalid role: ${role}. Allowed roles are: ${ALLOWED_USER_ROLES.join(', ')}`);
  }
  const columns = ['password_hash', 'role', 'name', 'campus_id', 'job_title', 'department', 'status'];
  const values = [passwordHash, role, name || email || username || phone, campusId, jobTitle, department, active === false ? 'inactive' : 'active'];
  if (email) { columns.unshift('email'); values.unshift(email); }
  if (username) { columns.unshift('username'); values.unshift(username); }
  if (phone) { columns.unshift('phone'); values.unshift(phone); }
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(',');
  const { rows } = await query(
    `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})
    RETURNING id, username, email, phone, role, name, campus_id, job_title, department, status`,
    values
  );
  return rows[0];
};

export const updateUser = async (id, updates) => {
  const { name, username, email, phone, role, passwordHash, jobTitle, department, active, campusId } = updates;
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (username !== undefined) { fields.push(`username = $${idx++}`); values.push(username); }
  if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
  if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
  if (role !== undefined) {
    if (!await isAllowedUserRole(role)) throw new Error(`Invalid role`);
    fields.push(`role = $${idx++}`); values.push(role);
  }
  if (passwordHash !== undefined) { fields.push(`password_hash = $${idx++}`); values.push(passwordHash); }
  if (jobTitle !== undefined) { fields.push(`job_title = $${idx++}`); values.push(jobTitle); }
  if (department !== undefined) { fields.push(`department = $${idx++}`); values.push(department); }
  if (campusId !== undefined) { fields.push(`campus_id = $${idx++}`); values.push(campusId); }
  if (active !== undefined) { fields.push(`status = $${idx++}`); values.push(active ? 'active' : 'inactive'); }

  if (fields.length === 0) return null;

  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, phone, role, name, campus_id, job_title, department, status`,
    values
  );
  return rows[0];
};

export const deleteUser = async (id) => {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
};

export const createUserWith = async ({ email = null, username = null, passwordHash, role = 'student', name, campusId, jobTitle = null, department = null }) => {
  // Validate role is in allowed list
  if (!ALLOWED_USER_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}. Allowed roles are: ${ALLOWED_USER_ROLES.join(', ')}`);
  }
  const columns = ['password_hash', 'role', 'name', 'campus_id'];
  const values = [passwordHash, role, name || email || username, campusId];
  if (email !== null && email !== undefined) { columns.unshift('email'); values.unshift(email); }
  if (username !== null && username !== undefined) { columns.unshift('username'); values.unshift(username); }
  if (jobTitle) { columns.push('job_title'); values.push(jobTitle); }
  if (department) { columns.push('department'); values.push(department); }
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await query(`INSERT INTO users (${columns.join(',')}) VALUES (${placeholders}) RETURNING id, username, email, role, name, campus_id, job_title, department`, values);
  return rows[0];
};

const toSlug = (s) => String(s || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 24);

export const generateUniqueUsername = async ({ base, role }) => {
  const prefix = role === 'teacher' ? 't' : role === 'student' ? 's' : role === 'driver' ? 'd' : 'u';
  const root = [prefix, toSlug(base)].filter(Boolean).join('-') || `${prefix}`;
  let candidate = root;
  let i = 0;
  // Try plain, then with numeric suffixes
  while (true) {
    const { rows } = await query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [candidate]);
    if (!rows.length) return candidate;
    i += 1;
    candidate = `${root}${i}`;
  }
};

export const generateRandomPassword = (length = 12) => {
  const buf = crypto.randomBytes(Math.max(8, length));
  return buf.toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, length);
};

export const listUsers = async () => {
  const { rows } = await query('SELECT id, email, role, name FROM users ORDER BY id ASC');
  return rows;
};

export const backfillUsersFromDomain = async (role) => {
  let domainSql;
  if (role === 'teacher') {
    domainSql = `SELECT name, email FROM teachers WHERE email IS NOT NULL AND email <> ''
                 AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(teachers.email))`;
  } else if (role === 'student') {
    domainSql = `SELECT name, email FROM students WHERE email IS NOT NULL AND email <> ''
                 AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(students.email))`;
  } else if (role === 'driver') {
    domainSql = `SELECT name, email FROM drivers WHERE email IS NOT NULL AND email <> ''
                 AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(drivers.email))`;
  } else {
    return { created: 0, items: [] };
  }

  const { rows } = await query(domainSql);
  if (!rows.length) return { created: 0, items: [] };

  const tempPass = Math.random().toString(36).slice(2) + 'A!9';
  const passwordHash = await bcrypt.hash(tempPass, 10);

  const created = [];
  for (const r of rows) {
    const name = r.name || r.email;
    const email = r.email;
    const { rows: ins } = await query(
      'INSERT INTO users (email, password_hash, role, name) VALUES ($1,$2,$3,$4) RETURNING id, email, role, name',
      [email, passwordHash, role, name]
    );
    if (ins[0]) created.push(ins[0]);
  }

  return { created: created.length, items: created };
};

export const ensureOwnerUser = async ({
  email,
  password,
  name,
  username = 'campusagent',
  syncExisting = false,
}) => {
  const ownerEmail = String(email || '').trim();
  const ownerUsername = String(username || 'campusagent').trim();
  const ownerName = name || 'CampusAgent Admin';

  // Get or create default campus for owner user
  let defaultCampusId = null;
  try {
    const { rows: campusRows } = await query('SELECT id FROM campuses ORDER BY id ASC LIMIT 1');
    if (campusRows.length > 0) {
      defaultCampusId = campusRows[0].id;
    } else {
      // Create default campus if none exists
      const { rows: newCampus } = await query(
        'INSERT INTO campuses (name) VALUES ($1) RETURNING id',
        ['Main Campus']
      );
      defaultCampusId = newCampus[0]?.id;
    }
  } catch (_) {
    // If campuses table doesn't exist or other error, continue without campus_id
  }

  const { rows } = await query(
    `SELECT id, role, username, campus_id FROM users
     WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
        OR LOWER(TRIM(COALESCE(username, ''))) = LOWER(TRIM($2))
     ORDER BY CASE WHEN LOWER(TRIM(COALESCE(username, ''))) = LOWER(TRIM($2)) THEN 0 ELSE 1 END
     LIMIT 1`,
    [ownerEmail, ownerUsername]
  );

  let id = rows[0]?.id;
  let matchedLegacyOwner = Boolean(
    rows[0]?.role === 'admin' &&
    !rows[0]?.campus_id &&
    ['owner', 'admin'].includes(String(rows[0]?.username || '').toLowerCase())
  );
  if (!id) {
    const { rows: legacy } = await query(
      `SELECT id, role FROM users
       WHERE role = 'owner'
          OR (
            role = 'admin'
            AND LOWER(COALESCE(username, '')) IN ('owner', 'admin')
            AND campus_id IS NULL
          )
       ORDER BY id ASC LIMIT 1`
    );
    id = legacy[0]?.id;
    if (legacy[0]) rows.push(legacy[0]);
    matchedLegacyOwner = Boolean(legacy[0]);
  }

  const existingRole = rows.find((row) => Number(row.id) === Number(id))?.role;
  if (id && existingRole !== 'owner' && !matchedLegacyOwner) {
    throw new Error('Configured owner identity conflicts with a non-owner account; refusing to change its role.');
  }
  if (id && !syncExisting) {
    if (matchedLegacyOwner && existingRole !== 'owner') {
      await query("UPDATE users SET role = 'owner' WHERE id = $1", [id]);
    }
    return { id, unchanged: true };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  if (id) {
    await query(
      `UPDATE users
       SET username = $2, email = $3, password_hash = $4, role = 'owner', name = $5, campus_id = $6
       WHERE id = $1`,
      [id, ownerUsername, ownerEmail, passwordHash, ownerName, defaultCampusId]
    );
  } else {
    const ins = await query(
      'INSERT INTO users (username, email, password_hash, role, name, campus_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [ownerUsername, ownerEmail, passwordHash, 'owner', ownerName, defaultCampusId]
    );
    id = ins.rows[0]?.id;
  }

  return { id, unchanged: false };
};

export const findParentByPhone = async (phone) => {
  const p = normalizePkPhone(phone);
  // Try exact and space-stripped match
  const { rows } = await query(
    `SELECT id, family_number, primary_name, father_name, mother_name, whatsapp_phone
     FROM parents
     WHERE REPLACE(COALESCE(whatsapp_phone,''), ' ', '') = REPLACE($1, ' ', '')
        OR COALESCE(whatsapp_phone,'') = $1
     LIMIT 1`,
    [p]
  );
  return rows[0] || null;
};

export const ensureParentUserForPhone = async ({ phone, password, name, campusId = null }) => {
  const emailLike = normalizePkPhone(phone);
  const existing = await findUserByPhone(emailLike) || await findUserByEmail(emailLike);
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    'INSERT INTO users (phone, password_hash, role, name, campus_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, username, phone, role, name, campus_id, password_hash',
    [emailLike, passwordHash, 'parent', name || emailLike, campusId]
  );
  return rows[0] || null;
};

// Create or update a parent user for a given phone, always setting the provided password
export const upsertParentUserForPhone = async ({ phone, password, name, campusId = null }) => {
  const emailLike = normalizePkPhone(phone);
  const existing = await findUserByPhone(emailLike) || await findUserByEmail(emailLike);
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    const { rows } = await query(
      'UPDATE users SET phone = $2, password_hash = $3, role = $4, name = COALESCE($5, name), campus_id = COALESCE($6, campus_id) WHERE id = $1 RETURNING id, email, username, phone, role, name, campus_id',
      [existing.id, emailLike, passwordHash, 'parent', name || null, campusId]
    );
    return rows[0] || { ...existing, phone: emailLike, role: 'parent', name: name || existing.name, campus_id: campusId || existing.campus_id };
  }
  const { rows } = await query(
    'INSERT INTO users (phone, password_hash, role, name, campus_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, username, phone, role, name, campus_id, password_hash',
    [emailLike, passwordHash, 'parent', name || emailLike, campusId]
  );
  return rows[0] || null;
};
