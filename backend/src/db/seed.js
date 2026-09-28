import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db.js';
import { loadEnv } from '../config/env.js';
import { ensureAuthSchema } from './autoMigrate.js';
import {
  DEFAULT_ALLOWED_MODULES,
  resolveOwnerConfig,
} from '../config/brand.js';

loadEnv();

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure auth schema (username + user_id links) exists
    try { await ensureAuthSchema(); } catch (_) {}

    // Ensure Super Admin / Owner account exists with desired credentials
    const { email: ownerEmail, username: ownerUsername, name: ownerName, password: ownerPassword } = resolveOwnerConfig();

    if (!process.env.OWNER_PASSWORD && process.env.NODE_ENV === 'production') {
      console.warn('[seed] OWNER_PASSWORD not set in production; falling back to the default owner password for this deployment. Set OWNER_PASSWORD to override it explicitly.');
    }
    {
      const { rows: existingOwner } = await client.query(
        `SELECT id, role FROM users
         WHERE LOWER(email) = LOWER($1)
            OR LOWER(COALESCE(username, '')) = LOWER($2)
            OR role = 'owner'
         ORDER BY CASE WHEN LOWER(COALESCE(username, '')) = LOWER($2) THEN 0 ELSE 1 END
         LIMIT 1`,
        [ownerEmail, ownerUsername]
      );
      if (!existingOwner.length) {
        const ownerHash = await bcrypt.hash(ownerPassword, 10);
        await client.query(
          'INSERT INTO users (username, email, password_hash, role, name, campus_id) VALUES ($1,$2,$3,$4,$5,1)',
          [ownerUsername, ownerEmail, ownerHash, 'owner', ownerName]
        );
        console.log('Seeded OWNER user:', ownerUsername, ownerEmail);
      } else if (process.env.OWNER_SYNC_ON_BOOT?.toLowerCase() === 'true') {
        if (existingOwner[0].role !== 'owner') {
          throw new Error('Configured owner identity conflicts with a non-owner account; refusing to change its role.');
        }
        const ownerHash = await bcrypt.hash(ownerPassword, 10);
        await client.query(
          'UPDATE users SET password_hash=$2, name=$3, username=$4, email=$5 WHERE id=$1',
          [existingOwner[0].id, ownerHash, ownerName, ownerUsername, ownerEmail]
        );
        console.log('Synchronized OWNER user from environment:', ownerUsername, ownerEmail);
      } else {
        if (existingOwner[0].role !== 'owner') {
          throw new Error('Configured owner identity conflicts with a non-owner account; refusing to change its role.');
        }
        console.log('OWNER user already exists; preserving saved profile credentials.');
      }
    }

    // No first-run licensing configuration is required for normal deployments

    // Create demo users if not exists
    const usersToSeed = [
      { email: 'teacher@jstudio.tech', username: 'teacher', role: 'teacher', name: 'Teacher Ali', password: 'password123' },
      { email: 'student@jstudio.tech', username: 'student', role: 'student', name: 'Student Ahmed', password: 'password123' },
      { email: 'driver@jstudio.tech', username: 'driver', role: 'driver', name: 'Driver Umar', password: 'password123' },
    ];
    for (const u of usersToSeed) {
      const { rows: existing } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [u.email]);
      if (!existing.length) {
        const hash = await bcrypt.hash(u.password, 10);
        await client.query('INSERT INTO users (username, email, password_hash, role, name) VALUES ($1,$2,$3,$4,$5)', [u.username, u.email, hash, u.role, u.name]);
        console.log('Seeded demo user:', u.email, 'role:', u.role);
      } else {
        // Ensure username set for existing row
        await client.query('UPDATE users SET username = COALESCE(username, $2) WHERE id = $1', [existing[0].id, u.username]);
        console.log('Demo user already exists:', u.email);
      }
    }

    // Seed a demo student only if not present (by email OR roll number)
    const { rows: existsStudent } = await client.query(
      'SELECT id FROM students WHERE email = $1 OR roll_number = $2 LIMIT 1',
      ['student@jstudio.tech', 'STD001']
    );
    if (!existsStudent.length) {
      const { rows: userRow } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', ['student@jstudio.tech']);
      const studentUserId = userRow[0]?.id || null;
      await client.query(
        `INSERT INTO students (name, email, roll_number, class, section, rfid_tag, attendance, fee_status, bus_number, bus_assigned, parent_name, parent_phone, status, user_id)
         VALUES ('Student Ahmed','student@jstudio.tech','STD001','10','A','RFID-001',95.5,'paid','101',true,'Khan Sahab','+92 300 1234567','active',$1)`,
        [studentUserId]
      );
      console.log('Seeded demo student: student@jstudio.tech');
    } else {
      // Link existing demo student to user_id if missing
      const { rows: u } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', ['student@jstudio.tech']);
      if (u[0]) await client.query('UPDATE students SET user_id = COALESCE(user_id, $1) WHERE email = $2', [u[0].id, 'student@jstudio.tech']);
      console.log('Demo student already exists, skipping.');
    }

    // Seed demo teachers if not present (by email)
    const demoTeachers = [
      {
        name: 'Teacher Ayesha',
        email: 'ayesha.teacher@jstudio.tech',
        employeeId: 'T-1001',
        department: 'Science & Mathematics',
        designation: 'Senior Lecturer',
        subjects: ['Mathematics', 'Physics'],
        classes: ['Class 9', 'Class 10'],
        baseSalary: 120000,
      },
      {
        name: 'Teacher Bilal',
        email: 'bilal.teacher@jstudio.tech',
        employeeId: 'T-1002',
        department: 'Languages',
        designation: 'Lecturer',
        subjects: ['English'],
        classes: ['Class 8', 'Class 9'],
        baseSalary: 95000,
      },
      {
        name: 'Teacher Sana',
        email: 'sana.teacher@jstudio.tech',
        employeeId: 'T-1003',
        department: 'Humanities',
        designation: 'Assistant Lecturer',
        subjects: ['History', 'Geography'],
        classes: ['Class 7', 'Class 8'],
        baseSalary: 85000,
      },
    ];

    for (const t of demoTeachers) {
      const { rows: existing } = await client.query('SELECT id FROM teachers WHERE email = $1', [t.email]);
      if (!existing.length) {
        const { rows: tu } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [t.email]);
        const linkedUserId = tu[0]?.id || null;
        const insertRes = await client.query(
          `INSERT INTO teachers (
            name, email, employee_id, department, designation,
            subjects, classes, base_salary, user_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [
            t.name,
            t.email,
            t.employeeId,
            t.department,
            t.designation,
            JSON.stringify(t.subjects),
            JSON.stringify(t.classes),
            t.baseSalary,
            linkedUserId,
          ]
        );
        console.log('Seeded teacher:', t.email);
      } else {
        // Link existing teacher to user if not linked
        const { rows: tu } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [t.email]);
        if (tu[0]) await client.query('UPDATE teachers SET user_id = COALESCE(user_id, $1) WHERE email = $2', [tu[0].id, t.email]);
        console.log('Teacher already exists:', t.email);
      }
    }

    // Seed teacher performance reviews for the seeded teachers if none exist
    const { rows: teacherRowsForPerf } = await client.query('SELECT id, name FROM teachers ORDER BY id ASC LIMIT 10');
    if (teacherRowsForPerf.length) {
      // Check if there are any performance reviews already
      const { rows: perfExists } = await client.query('SELECT id FROM teacher_performance_reviews LIMIT 1');
      if (!perfExists.length) {
        for (const t of teacherRowsForPerf) {
          const samples = [
            {
              periodType: 'current-semester',
              periodLabel: 'Spring 2025',
              overall: 88,
              feedback: 90,
              attendance: 92,
              classMgmt: 85,
              exams: 87,
              status: 'excellent',
              improvement: 5,
            },
            {
              periodType: 'annual',
              periodLabel: 'Academic Year 2024-2025',
              overall: 76,
              feedback: 78,
              attendance: 80,
              classMgmt: 72,
              exams: 75,
              status: 'good',
              improvement: 2,
            },
          ];
          for (const s of samples) {
            await client.query(
              `INSERT INTO teacher_performance_reviews (
                 teacher_id, period_type, period_label, period_start, period_end,
                 overall_score, student_feedback_score, attendance_score,
                 class_management_score, exam_results_score, status, improvement, remarks
               ) VALUES ($1,$2,$3,NULL,NULL,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [
                t.id,
                s.periodType,
                s.periodLabel,
                s.overall,
                s.feedback,
                s.attendance,
                s.classMgmt,
                s.exams,
                s.status,
                s.improvement,
                `Auto-seeded review for ${t.name}`,
              ]
            );
          }
        }
        console.log('Seeded teacher performance reviews.');
      } else {
        console.log('Teacher performance reviews already exist, skipping.');
      }
    } else {
      console.log('No teachers found; skipping performance review seed.');
    }

    const defaultSubjects = [
      { name: 'Mathematics', code: 'MATH', department: 'Science & Mathematics' },
      { name: 'Physics', code: 'PHYS', department: 'Science & Mathematics' },
      { name: 'Chemistry', code: 'CHEM', department: 'Science & Mathematics' },
      { name: 'Biology', code: 'BIO', department: 'Science & Mathematics' },
      { name: 'English', code: 'ENG', department: 'Languages' },
      { name: 'History', code: 'HIST', department: 'Humanities' },
      { name: 'Geography', code: 'GEO', department: 'Humanities' },
      { name: 'Computer Science', code: 'CS', department: 'Technology' },
    ];

    for (const subject of defaultSubjects) {
      await client.query(
        `INSERT INTO subjects (name, code, department)
         VALUES ($1,$2,$3)
         ON CONFLICT (name)
         DO UPDATE SET code = EXCLUDED.code, department = EXCLUDED.department, updated_at = NOW()`,
        [subject.name, subject.code, subject.department]
      );
    }

    const { rows: teacherRows } = await client.query('SELECT id FROM teachers ORDER BY id LIMIT 10');
    if (!teacherRows.length) {
      console.log('No teachers found; skipping class section seed.');
    } else {
      const defaultClasses = [
        { className: 'Class 1', section: 'A', capacity: 30, enrolled: 28, room: 'A101' },
        { className: 'Class 1', section: 'B', capacity: 30, enrolled: 26, room: 'A102' },
        { className: 'Class 2', section: 'A', capacity: 32, enrolled: 30, room: 'B201' },
        { className: 'Class 3', section: 'A', capacity: 28, enrolled: 24, room: 'C301' },
      ];
      const academicYear = '2024-2025';
      for (let idx = 0; idx < defaultClasses.length; idx += 1) {
        const entry = defaultClasses[idx];
        const teacherId = teacherRows[idx % teacherRows.length]?.id || null;
        await client.query(
          `INSERT INTO class_sections (class_name, section, academic_year, class_teacher_id, capacity, enrolled_students, status, room)
           VALUES ($1,$2,$3,$4,$5,$6,'active',$7)
           ON CONFLICT (class_name, section, academic_year)
           DO UPDATE SET
             class_teacher_id = EXCLUDED.class_teacher_id,
             capacity = EXCLUDED.capacity,
             enrolled_students = LEAST(EXCLUDED.enrolled_students, EXCLUDED.capacity),
             status = EXCLUDED.status,
             room = EXCLUDED.room,
             updated_at = NOW()` ,
          [entry.className, entry.section, academicYear, teacherId, entry.capacity, entry.enrolled, entry.room]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seed completed.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
