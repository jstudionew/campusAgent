import { query } from '../config/db.js';

/**
 * Retrieves all teaching assignments and scopes for a teacher user
 * Aggregates assignments from:
 * 1. teacher_schedules (scheduled classes, sections, subjects)
 * 2. teacher_subject_assignments (subject allocations with class arrays)
 * 3. teachers.classes & teachers.subjects (direct profile assignments)
 * 4. class_sections (class teacher assignments)
 *
 * @param {number} userId - The user ID from auth token
 * @param {number} [campusId] - Optional campus ID
 * @returns {Promise<{ teacherId: number|null, scopes: Array<{ className: string, section: string|null, subject: string|null }>, classes: string[], hasAssignments: boolean }>}
 */
export const getTeacherAssignments = async (userId, campusId = null) => {
  const emptyResult = { teacherId: null, scopes: [], classes: [], hasAssignments: false };
  if (!userId) return emptyResult;

  // 1. Find teacher record
  const { rows: tRows } = await query(
    'SELECT id, classes, subjects, campus_id FROM teachers WHERE user_id = $1',
    [Number(userId)]
  );
  if (!tRows[0]) return emptyResult;

  const teacher = tRows[0];
  const teacherId = teacher.id;
  const scopesMap = new Map(); // key: `${className}::${section || ''}::${subject || ''}`

  const addScope = (className, section = null, subject = null) => {
    if (!className) return;
    const c = String(className).trim();
    const s = section ? String(section).trim() : null;
    const subj = subject ? String(subject).trim() : null;
    const key = `${c.toLowerCase()}::${(s || '').toLowerCase()}::${(subj || '').toLowerCase()}`;
    if (!scopesMap.has(key)) {
      scopesMap.set(key, { className: c, section: s, subject: subj });
    }
  };

  // 2. From teacher_schedules
  try {
    const { rows: schedRows } = await query(
      `SELECT DISTINCT class AS "className", section, subject
       FROM teacher_schedules
       WHERE teacher_id = $1 AND COALESCE(NULLIF(TRIM(class), ''), '') <> ''`,
      [teacherId]
    );
    for (const r of schedRows) {
      addScope(r.className, r.section, r.subject);
    }
  } catch (_) {}

  // 3. From teacher_subject_assignments
  try {
    const { rows: subAssRows } = await query(
      `SELECT tsa.classes, s.name AS "subjectName"
       FROM teacher_subject_assignments tsa
       LEFT JOIN subjects s ON s.id = tsa.subject_id
       WHERE tsa.teacher_id = $1`,
      [teacherId]
    );
    for (const r of subAssRows) {
      const clsList = Array.isArray(r.classes) ? r.classes : [];
      for (const item of clsList) {
        if (typeof item === 'string') {
          addScope(item, null, r.subjectName);
        } else if (item && typeof item === 'object') {
          addScope(item.class || item.className, item.section, r.subjectName);
        }
      }
    }
  } catch (_) {}

  // 4. From class_sections (where teacher is the class teacher)
  try {
    const { rows: csRows } = await query(
      `SELECT class_name AS "className", section
       FROM class_sections
       WHERE class_teacher_id = $1`,
      [teacherId]
    );
    for (const r of csRows) {
      addScope(r.className, r.section, null);
    }
  } catch (_) {}

  // 5. From teachers.classes JSONB array
  if (Array.isArray(teacher.classes)) {
    for (const item of teacher.classes) {
      if (typeof item === 'string') {
        // e.g. "10-A" or "Class 1"
        if (item.includes('-')) {
          const [c, s] = item.split('-');
          addScope(c, s, null);
        } else {
          addScope(item, null, null);
        }
      } else if (item && typeof item === 'object') {
        addScope(item.class || item.className, item.section, null);
      }
    }
  }

  const scopes = Array.from(scopesMap.values());
  const classes = Array.from(new Set(scopes.map((s) => s.className)));

  return {
    teacherId,
    scopes,
    classes,
    hasAssignments: scopes.length > 0
  };
};

/**
 * Checks if a teacher can access a specific student
 *
 * @param {number} userId - Teacher user ID
 * @param {number} studentId - Student ID to check
 * @returns {Promise<boolean>}
 */
export const canTeacherAccessStudent = async (userId, studentId) => {
  const assignments = await getTeacherAssignments(userId);
  if (!assignments.hasAssignments) return false;

  const { rows } = await query(
    'SELECT class, section FROM students WHERE id = $1',
    [Number(studentId)]
  );
  if (!rows[0]) return false;

  const student = rows[0];
  return assignments.scopes.some((scope) => {
    if (String(scope.className).toLowerCase() !== String(student.class).toLowerCase()) {
      return false;
    }
    if (scope.section) {
      return String(scope.section).toLowerCase() === String(student.section || '').toLowerCase();
    }
    // If scope has no section restriction, full class access is granted
    return true;
  });
};

/**
 * Validates whether a teacher can access a given class/section
 *
 * @param {number} userId - Teacher user ID
 * @param {string} className - Class name
 * @param {string} [section] - Section name
 * @returns {Promise<boolean>}
 */
export const canTeacherAccessClass = async (userId, className, section = null) => {
  const assignments = await getTeacherAssignments(userId);
  if (!assignments.hasAssignments) return false;

  return assignments.scopes.some((scope) => {
    if (String(scope.className).toLowerCase() !== String(className).toLowerCase()) {
      return false;
    }
    if (scope.section && section) {
      return String(scope.section).toLowerCase() === String(section).toLowerCase();
    }
    return true;
  });
};
