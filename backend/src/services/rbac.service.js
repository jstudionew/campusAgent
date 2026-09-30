import { query } from '../config/db.js';
import * as settings from './settings.service.js';

let customRoleSchemaPromise;
const activeRoleCache = new Map();
const activeRoleCacheTtlMs = 5000;

const ensureCustomRoleSchema = async () => {
  if (!customRoleSchemaPromise) {
    customRoleSchemaPromise = query(`
      CREATE TABLE IF NOT EXISTS custom_roles (
        role_key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CHECK (role_key LIKE 'custom_%')
      )
    `);
  }
  await customRoleSchemaPromise;
};

export const FIXED_ROLES = [
  'owner', 'superadmin', 'admin',
  'academic_coordinator', 'admissions', 'reception', 'office_staff',
  'teacher', 'student', 'parent', 'driver',
  'finance', 'finance_manager', 'hr_manager', 'hr',
  'it_admin', 'it_support', 'library', 'transport', 'security'
];

export const ALL_PERMS = [
  // Students
  'students.view', 'students.edit', 'students.export', 'students.manage',
  // Teachers
  'teachers.view', 'teachers.edit', 'teachers.export', 'teachers.manage',
  // Parents
  'parents.view', 'parents.edit', 'parents.manage', 'parents.inform',
  // Attendance
  'attendance.view', 'attendance.take', 'attendance.edit', 'attendance.export',
  // Academics & Classes
  'classes.view', 'classes.manage',
  'timetable.view', 'timetable.edit',
  'assignments.create', 'assignments.view', 'assignments.grade',
  'exams.create', 'exams.view', 'exams.grade',
  'marks.view', 'marks.edit',
  // Finance
  'finance.view', 'finance.create', 'finance.edit', 'finance.export',
  // Human Resources
  'hr.view', 'hr.edit', 'hr.manage',
  // Transport
  'transport.view', 'transport.edit', 'transport.manage',
  // Library
  'library.view', 'library.edit', 'library.manage',
  // Security
  'security.view', 'security.manage',
  // Reports
  'reports.view', 'reports.export',
  // Communication
  'communication.send',
  // System & Licensing
  'settings.view', 'settings.manage',
  'licensing.manage'
];

export const CAMPUS_ADMIN_PERMISSIONS = ALL_PERMS.filter(
  (permission) => !['licensing.manage', 'settings.view', 'settings.manage'].includes(permission)
);

// Default permissions for new or unconfigured roles
export const DEFAULT_ROLE_PERMISSIONS = {
  owner: ALL_PERMS,
  superadmin: ALL_PERMS.filter(p => p !== 'licensing.manage'),
  admin: CAMPUS_ADMIN_PERMISSIONS,
  academic_coordinator: [
    'students.view', 'teachers.view', 'classes.view', 'classes.manage',
    'timetable.view', 'timetable.edit', 'assignments.view', 'exams.view', 'exams.create',
    'marks.view', 'attendance.view', 'reports.view'
  ],
  teacher: [
    'students.view', 'attendance.take', 'attendance.view', 'attendance.edit',
    'timetable.view', 'classes.view', 'assignments.create', 'assignments.view', 'assignments.grade',
    'exams.view', 'exams.grade', 'marks.view', 'marks.edit'
  ],
  finance_manager: [
    'finance.view', 'finance.create', 'finance.edit', 'finance.export',
    'students.view', 'reports.view', 'reports.export'
  ],
  finance: [
    'finance.view', 'finance.create', 'finance.edit', 'students.view'
  ],
  hr_manager: [
    'hr.view', 'hr.edit', 'hr.manage', 'teachers.view', 'teachers.edit', 'reports.view'
  ],
  hr: [
    'hr.view', 'hr.edit', 'teachers.view'
  ],
  admissions: [
    'students.view', 'students.edit', 'students.manage', 'parents.view', 'parents.edit'
  ],
  reception: [
    'students.view', 'parents.view', 'attendance.view', 'communication.send'
  ],
  office_staff: [
    'students.view', 'attendance.view', 'reports.view'
  ],
  library: [
    'library.view', 'library.edit', 'library.manage', 'students.view'
  ],
  transport: [
    'transport.view', 'transport.edit', 'transport.manage', 'students.view'
  ],
  security: [
    'security.view', 'security.manage', 'attendance.view'
  ],
  it_admin: [
    'settings.view', 'settings.manage', 'students.view', 'teachers.view', 'reports.view'
  ],
  it_support: [
    'settings.view', 'students.view', 'teachers.view'
  ],
  driver: [
    'transport.view'
  ],
  student: [
    'timetable.view', 'assignments.view', 'exams.view', 'marks.view', 'attendance.view'
  ],
  parent: [
    'students.view', 'attendance.view', 'marks.view', 'finance.view'
  ]
};

// Map permissions to subroutes
const PERM_TO_SUBROUTES = {
  // Students
  'students.view': [
    '/students/list',
    '/students/attendance/daily',
    '/students/performance',
    '/students/profile',
    '/students/parents',
  ],
  'students.edit': ['/students/add', '/students/edit/:id'],
  'students.manage': ['/students/add', '/students/edit/:id'],
  'students.export': ['/students/list'],
  // Teachers
  'teachers.view': ['/teachers/list'],
  'teachers.edit': ['/teachers/add'],
  'teachers.manage': ['/teachers/add'],
  'teachers.export': ['/teachers/list'],
  // Attendance
  'attendance.view': [
    '/attendance/daily',
    '/attendance/reports',
    '/attendance/my',
    '/attendance/qr',
    '/attendance/monthly',
    '/attendance/chart',
  ],
  'attendance.take': ['/attendance/daily', '/attendance/manual', '/attendance/qr', '/students/attendance/daily'],
  'attendance.edit': ['/attendance/manual'],
  'attendance.export': ['/attendance/reports'],
  // Classes & Academics
  'classes.view': ['/academics/classes', '/classes/list', '/classes/teachers', '/classes/students'],
  'classes.manage': ['/academics/classes', '/classes/list', '/classes/students'],
  'timetable.view': ['/academics/timetable', '/classes/timetable', '/schedule/daily', '/schedule/weekly'],
  'timetable.edit': ['/academics/timetable', '/classes/timetable', '/schedule/daily', '/schedule/weekly'],
  'assignments.view': [
    '/academics/assignments',
    '/assignments/list',
    '/assignments/submit',
    '/assignments/feedback',
    '/assignments/due-dates',
    '/assignments/submissions',
    '/assignments/grading',
    '/assignments/late-report',
  ],
  'assignments.create': ['/academics/assignments', '/assignments/create'],
  'assignments.grade': ['/academics/assignments', '/assignments/grading', '/assignments/submissions'],
  'exams.view': [
    '/academics/exams',
    '/exams/timetable',
    '/exams/results',
    '/exams/grade-card',
    '/exams/analytics',
    '/exams/schedule',
  ],
  'exams.create': ['/academics/exams', '/exams/schedule'],
  'exams.grade': ['/academics/exams', '/exams/marks-sheet', '/exams/upload-marks'],
  'marks.view': ['/academics/marks', '/exams/results', '/exams/grade-card', '/exams/marks-sheet'],
  'marks.edit': ['/academics/marks', '/exams/marks-sheet', '/exams/upload-marks'],
  // Transport
  'transport.view': [
    '/transport/buses',
    '/transport/routes',
    '/routes',
    '/live-tracking',
    '/pickup-drop',
    '/checklist',
    '/incidents',
    '/shift',
    '/documents',
  ],
  'transport.edit': ['/transport/drivers', '/transport/routes', '/routes', '/pickup-drop', '/checklist'],
  'transport.manage': ['/transport/buses', '/transport/drivers', '/transport/routes', '/routes', '/live-tracking', '/pickup-drop', '/checklist', '/incidents', '/shift', '/documents'],
  // Finance
  'finance.view': ['/finance/dashboard', '/finance/invoices', '/fees/status', '/fees/due', '/fees/pay', '/fees/receipts', '/salary'],
  'finance.create': ['/finance/invoices', '/finance/payments'],
  'finance.edit': ['/finance/invoices', '/finance/payments'],
  'finance.export': ['/finance/reports'],
  // HR
  'hr.view': ['/hr/dashboard', '/hr/employees'],
  'hr.edit': ['/hr/employees', '/hr/payroll'],
  'hr.manage': ['/hr/dashboard', '/hr/employees', '/hr/payroll', '/hr/leaves'],
  // Library
  'library.view': ['/inventory'],
  'library.edit': ['/inventory'],
  'library.manage': ['/inventory'],
  // Security
  'security.view': ['/reception'],
  'security.manage': ['/reception'],
  // Settings
  'settings.view': ['/settings/system'],
  'settings.manage': ['/settings/system'],
  // Licensing (Owner)
  'licensing.manage': ['/settings/licensing'],
  // Parents
  'parents.view': ['/parents/list'],
  'parents.edit': ['/parents/list'],
  'parents.manage': ['/parents/list'],
  'parents.inform': ['/parents/inform'],
  // Reports
  'reports.view': ['/reports'],
  'reports.export': ['/reports'],
  // Communication
  'communication.send': ['/communication/announcements', '/communication/alerts', '/announcements', '/communications']
};

const getCustomRoles = async () => {
  await ensureCustomRoleSchema();
  const { rows } = await query('SELECT role_key AS id, name, active FROM custom_roles ORDER BY name ASC');
  return rows;
};

export const isCustomRole = async (role) => {
  if (typeof role !== 'string' || !role.startsWith('custom_')) return false;
  await ensureCustomRoleSchema();
  const { rows } = await query('SELECT 1 FROM custom_roles WHERE role_key = $1 LIMIT 1', [role]);
  return rows.length > 0;
};

export const isRoleDefined = async (role) => FIXED_ROLES.includes(role) || await isCustomRole(role);

export const isAssignableRole = async (role) => {
  if (role === 'owner' || role === 'superadmin') return true;
  if (!FIXED_ROLES.includes(role) && !await isCustomRole(role)) return false;
  return isRoleActive(role);
};

export const isRoleActive = async (role) => {
  const cached = activeRoleCache.get(role);
  if (cached && Date.now() - cached.checkedAt < activeRoleCacheTtlMs) return cached.active;

  let active;
  if (await isCustomRole(role)) {
    const { rows } = await query('SELECT active FROM custom_roles WHERE role_key = $1', [role]);
    active = rows[0]?.active === true;
  } else {
    const item = await settings.getByKey(`role.active.${role}`);
    active = item ? item.value === 'true' : FIXED_ROLES.includes(role);
  }
  activeRoleCache.set(role, { active, checkedAt: Date.now() });
  return active;
};

export const makeCustomRoleKey = (name) => {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug ? `custom_${slug}` : '';
};

export const createCustomRole = async ({ name, permissions = [], active = true }) => {
  const displayName = String(name || '').trim();
  if (displayName.length < 2 || displayName.length > 60) {
    throw new Error('Role name must be between 2 and 60 characters');
  }
  if (FIXED_ROLES.some((role) => role.replace(/_/g, ' ').toLowerCase() === displayName.toLowerCase())) {
    throw new Error('Choose a name that does not match a built-in role');
  }
  const roleKey = makeCustomRoleKey(displayName);
  if (!roleKey || FIXED_ROLES.includes(roleKey)) throw new Error('Role name is not valid');
  if (await isCustomRole(roleKey)) throw new Error('A role with this name already exists');

  const validPermissions = Array.from(new Set((Array.isArray(permissions) ? permissions : [])
    .filter((permission) => ALL_PERMS.includes(permission))));
  await ensureCustomRoleSchema();
  const { rows } = await query(
    'INSERT INTO custom_roles (role_key, name, active) VALUES ($1, $2, $3) RETURNING role_key AS id, name, active',
    [roleKey, displayName, active !== false]
  );
  activeRoleCache.set(roleKey, { active: active !== false, checkedAt: Date.now() });
  await setPermissionsForRole(roleKey, validPermissions);
  return { ...rows[0], users: 0, isCustom: true };
};

export const listRoles = async () => {
  const { rows } = await query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role');
  const counts = Object.fromEntries(rows.map(r => [r.role, r.count]));
  const items = [];
  for (const r of FIXED_ROLES) {
    const activeKey = `role.active.${r}`;
    const activeItem = await settings.getByKey(activeKey);
    const active = activeItem ? activeItem.value === 'true' : true;
    const formattedName = r
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    items.push({ id: r, name: formattedName, users: counts[r] || 0, active });
  }
  for (const role of await getCustomRoles()) {
    items.push({ ...role, users: counts[role.id] || 0, isCustom: true });
  }
  return items;
};

export const setRoleActive = async (role, active) => {
  if (await isCustomRole(role)) {
    const { rows } = await query(
      'UPDATE custom_roles SET active = $2 WHERE role_key = $1 RETURNING role_key AS id, name, active',
      [role, Boolean(active)]
    );
    activeRoleCache.set(role, { active: Boolean(active), checkedAt: Date.now() });
    return rows[0];
  }
  if (!FIXED_ROLES.includes(role)) throw new Error('Invalid role');
  const key = `role.active.${role}`;
  const v = active ? 'true' : 'false';
  const saved = await settings.setKey(key, v);
  activeRoleCache.set(role, { active: Boolean(active), checkedAt: Date.now() });
  return saved;
};

export const listPermissions = async () => {
  const assignments = {};
  const roles = [...FIXED_ROLES, ...(await getCustomRoles()).map((role) => role.id)];
  for (const r of roles) {
    if (r === 'admin') {
      assignments[r] = CAMPUS_ADMIN_PERMISSIONS;
      continue;
    }
    const key = `perms.${r}`;
    const item = await settings.getByKey(key);
    try {
      if (item && item.value) {
        assignments[r] = JSON.parse(item.value);
      } else {
        assignments[r] = DEFAULT_ROLE_PERMISSIONS[r] || [];
      }
    } catch (_) {
      assignments[r] = DEFAULT_ROLE_PERMISSIONS[r] || [];
    }
  }
  return { roles, allPerms: ALL_PERMS, assignments };
};

export const setPermissionsForRole = async (role, perms = []) => {
  if (!FIXED_ROLES.includes(role) && !await isCustomRole(role)) throw new Error('Invalid role');
  if (role === 'admin') {
    return { key: 'perms.admin', value: JSON.stringify(CAMPUS_ADMIN_PERMISSIONS) };
  }
  const valid = perms.filter(p => ALL_PERMS.includes(p));
  const key = `perms.${role}`;
  const saved = await settings.setKey(key, JSON.stringify(valid));
  // Derive module + subroute allow lists from granted permissions for convenience
  try {
    const moduleKeys = new Set(valid.map((p) => String(p).split('.')[0]));
    // Map keys to display names that match frontend route names
    const displayMap = {
      students: 'Students',
      teachers: 'Teachers',
      finance: 'Finance',
      transport: 'Transport',
      attendance: 'Attendance',
      reports: 'Reports',
      communication: 'Communication',
      settings: 'Settings',
      parents: 'Parents',
      classes: 'Academics',
      timetable: 'Academics',
      assignments: 'Academics',
      exams: 'Academics',
      marks: 'Academics',
      hr: 'Human Resource',
      library: 'Inventory',
      security: 'Reception'
    };
    const allowModules = Array.from(moduleKeys)
      .map((k) => displayMap[k])
      .filter(Boolean);
    // Derive subroutes precisely from permissions
    const allowSubroutes = Array.from(new Set(valid.flatMap((p) => PERM_TO_SUBROUTES[p] || [])));
    await settings.setKey(`modules.allow.${role}`, JSON.stringify(allowModules));
    await settings.setKey(`subroutes.allow.${role}`, JSON.stringify(allowSubroutes));
  } catch (_) {}
  return saved;
};

// Module-level access management
export const listModuleAssignments = async () => {
  const assignments = {};
  const roles = [...FIXED_ROLES, ...(await getCustomRoles()).map((role) => role.id)];
  for (const r of roles) {
    const mKey = `modules.allow.${r}`;
    const sKey = `subroutes.allow.${r}`;
    const mItem = await settings.getByKey(mKey);
    const sItem = await settings.getByKey(sKey);
    let allowModules = [];
    let allowSubroutes = [];
    try { allowModules = mItem ? JSON.parse(mItem.value) : []; } catch (_) { allowModules = []; }
    try { allowSubroutes = sItem ? JSON.parse(sItem.value) : []; } catch (_) { allowSubroutes = []; }

    // Apply role defaults only before an administrator has explicitly configured access.
    if (!mItem && !sItem && DEFAULT_ROLE_PERMISSIONS[r]) {
      const defPerms = DEFAULT_ROLE_PERMISSIONS[r];
      const displayMap = {
        students: 'Students', teachers: 'Teachers', finance: 'Finance', transport: 'Transport',
        attendance: 'Attendance', reports: 'Reports', communication: 'Communication', settings: 'Settings',
        parents: 'Parents', classes: 'Academics', timetable: 'Academics', assignments: 'Academics',
        exams: 'Academics', marks: 'Academics', hr: 'Human Resource', library: 'Inventory', security: 'Reception'
      };
      allowModules = Array.from(new Set(defPerms.map(p => displayMap[p.split('.')[0]]).filter(Boolean)));
      allowSubroutes = Array.from(new Set(defPerms.flatMap(p => PERM_TO_SUBROUTES[p] || [])));
    }

    assignments[r] = { allowModules, allowSubroutes };
  }
  return { roles, assignments };
};

export const setModulesForRole = async (role, data = {}) => {
  if (!FIXED_ROLES.includes(role) && !await isCustomRole(role)) throw new Error('Invalid role');
  const allowModules = Array.isArray(data.allowModules) ? data.allowModules : [];
  const allowSubroutes = Array.isArray(data.allowSubroutes) ? data.allowSubroutes : [];
  await settings.setKey(`modules.allow.${role}`, JSON.stringify(allowModules));
  await settings.setKey(`subroutes.allow.${role}`, JSON.stringify(allowSubroutes));
  return { role, allowModules, allowSubroutes };
};
