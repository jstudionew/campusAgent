const USER_SECRET_FIELDS = new Set([
  'password_hash',
  'passwordHash',
  'password',
  'refreshToken',
  'refresh_token',
  'token',
  'accessToken',
  'secret',
  'apiSecret',
  'api_key',
  'apiKey',
  'sessionToken',
]);

const TEACHER_SENSITIVE_FIELDS = new Set([
  'baseSalary',
  'allowances',
  'deductions',
  'salary',
  'bankName',
  'accountNumber',
  'iban',
  'accountTitle',
  'paymentMethod',
  'chequeNumber',
  'transactionReference',
  'taxId',
  'nationalId',
]);

const STUDENT_SENSITIVE_FIELDS = new Set([
  'parentPhone',
  'parentName',
  'parent',
  'personal',
  'familyNumber',
]);

const USER_RESTRICTED_FIELDS = new Set(['password_hash', 'passwordHash', 'refreshToken', 'refresh_token', 'token']);

const clonePlainObject = (value) => {
  if (Array.isArray(value)) return value.map((entry) => clonePlainObject(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clonePlainObject(v)]));
  }
  return value;
};

export const sanitizeUserResponse = (user = {}, context = {}) => {
  const payload = clonePlainObject(user);
  if (!payload || typeof payload !== 'object') return payload;

  for (const key of USER_SECRET_FIELDS) {
    delete payload[key];
  }

  const actorRole = context.actorRole;
  const actorId = context.actorId;
  const targetId = context.targetId ?? payload.id;

  if (actorRole && !['owner', 'superadmin', 'admin'].includes(actorRole) && Number(actorId) !== Number(targetId)) {
    delete payload.jobTitle;
    delete payload.department;
    delete payload.campusId;
  }

  return payload;
};

export const sanitizeTeacherResponse = (teacher = {}, context = {}) => {
  const payload = clonePlainObject(teacher);
  if (!payload || typeof payload !== 'object') return payload;

  const actorRole = context.actorRole;
  const actorId = context.actorId;
  const targetId = context.targetId ?? payload.id;
  const isOwnRecord = Number(actorId) === Number(targetId);
  const canSeeSensitiveData = ['owner', 'superadmin', 'admin'].includes(actorRole) || isOwnRecord;

  if (!canSeeSensitiveData) {
    for (const key of TEACHER_SENSITIVE_FIELDS) {
      delete payload[key];
    }
  }

  delete payload.password_hash;
  delete payload.passwordHash;
  delete payload.refreshToken;
  delete payload.token;

  return payload;
};

export const sanitizeStudentResponse = (student = {}, context = {}) => {
  const payload = clonePlainObject(student);
  if (!payload || typeof payload !== 'object') return payload;

  const actorRole = context.actorRole;
  const actorId = context.actorId;
  const targetId = context.targetId ?? payload.id;
  const isOwnRecord = Number(actorId) === Number(targetId);
  const relatedParent = Boolean(context.relatedParent);

  if (!['owner', 'superadmin', 'admin'].includes(actorRole) && !isOwnRecord && !relatedParent) {
    for (const key of STUDENT_SENSITIVE_FIELDS) {
      delete payload[key];
    }
  }

  delete payload.password_hash;
  delete payload.passwordHash;
  delete payload.refreshToken;
  delete payload.token;

  return payload;
};

export const obfuscateSensitiveValue = (value) => {
  if (value == null) return value;
  const text = String(value);
  if (text.length <= 4) return '****';
  return `${text.slice(0, 2)}${'*'.repeat(Math.max(4, text.length - 4))}`;
};

export const stripSensitiveFields = (payload = {}) => {
  const next = clonePlainObject(payload);
  if (!next || typeof next !== 'object') return next;
  for (const key of USER_RESTRICTED_FIELDS) {
    delete next[key];
  }
  return next;
};
