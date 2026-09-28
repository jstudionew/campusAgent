import { Router } from 'express';
import {
  Student,
  Teacher,
  Payroll,
  Leave,
  Product,
  Supplier,
  Purchase,
  Sale,
  QRAttendance,
  // Add other needed models
} from '../models/index.js';
import { Sequelize } from 'sequelize';
import { authenticate, requirePermission } from '../middleware/auth.js';
import * as reportsController from '../controllers/reports.controller.js';
import { query } from '../config/db.js';

const router = Router();

router.use(authenticate);

// Endpoints used by frontend src/services/api/reports.js
router.get('/overview', requirePermission('reports', 'view'), reportsController.overview);
router.get('/attendance-summary', requirePermission('reports', 'view'), reportsController.attendanceSummary);
router.get('/finance-summary', requirePermission('finance', 'view'), reportsController.financeSummary);
router.get('/finance-by-class', requirePermission('finance', 'view'), reportsController.financeByClass);
router.get('/finance-by-head', requirePermission('finance', 'view'), reportsController.financeByHead);
router.get('/finance-payment-methods', requirePermission('finance', 'view'), reportsController.financePaymentMethods);
router.get('/finance-overdue-buckets', requirePermission('finance', 'view'), reportsController.financeOverdueBuckets);
router.get('/exam-performance', requirePermission('marks', 'view'), reportsController.examPerformance);
router.get('/attendance-by-class', requirePermission('attendance', 'view'), reportsController.attendanceByClass);
router.get('/attendance-heatmap', requirePermission('attendance', 'view'), reportsController.attendanceHeatmap);

// Helper to get campus query
const getCampusQuery = (req) => {
  const campusId = req.user?.campusId;
  return campusId ? { campusId: Number(campusId) } : {};
};

const getCampusId = (req) => {
  const campusId = req.user?.campusId;
  const n = Number(campusId);
  return Number.isNaN(n) ? null : n;
};

const toIsoDate = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, 10);
};

const parseMonthRange = (ym) => {
  if (!ym) return null;
  const s = String(ym).trim();
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  const from = `${s}-01`;
  const d = new Date(`${s}-01T00:00:00Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  const to = end.toISOString().slice(0, 10);
  return { from, to };
};

const gradeFromPct = (pct) => {
  const p = Number(pct || 0);
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B';
  if (p >= 60) return 'C';
  if (p >= 50) return 'D';
  return 'F';
};

// --- Student Reports ---
router.get('/student/attendance', requirePermission('reports', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const startDate = toIsoDate(req.query?.startDate) || null;
    const endDate = toIsoDate(req.query?.endDate) || null;
    const klass = req.query?.class ? String(req.query.class) : null;

    const params = [campusId];
    let p = params.length;
    const whereStudents = [`s.campus_id = $${p}`];

    if (klass) {
      params.push(klass);
      p = params.length;
      whereStudents.push(`s.class = $${p}`);
    }

    const joinWhere = [`ar.student_id = s.id`, `ar.campus_id = $1`];
    if (startDate) {
      params.push(startDate);
      p = params.length;
      joinWhere.push(`ar.date >= $${p}`);
    }
    if (endDate) {
      params.push(endDate);
      p = params.length;
      joinWhere.push(`ar.date <= $${p}`);
    }

    const { rows } = await query(
      `SELECT
          s.id,
          s.name AS "studentName",
          s.class AS "className",
          COUNT(ar.id)::int AS "totalDays",
          SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::int AS present,
          SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END)::int AS absent
       FROM students s
       LEFT JOIN attendance_records ar
         ON ${joinWhere.join(' AND ')}
       WHERE ${whereStudents.join(' AND ')}
       GROUP BY s.id, s.name, s.class
       ORDER BY s.name ASC`,
      params
    );

    const data = rows.map((r) => {
      const totalDays = Number(r.totalDays || 0);
      const present = Number(r.present || 0);
      const percentage = totalDays ? +((present * 100) / totalDays).toFixed(2) : 0;
      return {
        studentName: r.studentName,
        className: r.className,
        totalDays,
        present,
        absent: Number(r.absent || 0),
        percentage,
      };
    });

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/student/performance', requirePermission('reports', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId && !['owner', 'superadmin'].includes(req.user?.role)) {
      return res.status(400).json({ error: 'Campus context is required for this report.' });
    }

    const klass = req.query?.class ? String(req.query.class) : null;
    const examType = req.query?.examType ? String(req.query.examType) : null;

    const params = [];
    const where = [];

    if (campusId) {
      params.push(campusId);
      where.push(`s.campus_id = $${params.length}`);
    }

    if (klass) {
      params.push(klass);
      where.push(`s.class = $${params.length}`);
    }

    if (examType) {
      params.push(`%${examType}%`);
      where.push(`COALESCE(e.title,'') ILIKE $${params.length}`);
    }

    const { rows } = await query(
      `WITH per AS (
          SELECT
            s.id AS student_id,
            s.name AS student_name,
            s.class AS class_name,
            COUNT(er.marks)::int AS scored_subjects,
            COUNT(cs.full_marks) FILTER (WHERE er.marks IS NOT NULL)::int AS subjects_with_full_marks,
            COALESCE(SUM(er.marks), 0)::numeric AS obtained,
            SUM(cs.full_marks) FILTER (WHERE er.marks IS NOT NULL)::numeric AS configured_total,
            STRING_AGG(DISTINCT NULLIF(TRIM(er.grade), ''), ', ' ORDER BY NULLIF(TRIM(er.grade), '')) AS recorded_grades
          FROM students s
          LEFT JOIN exam_results er
            ON er.student_id = s.id
           AND (er.campus_id IS NULL OR er.campus_id = s.campus_id)
          LEFT JOIN exams e
            ON e.id = er.exam_id
           AND (e.campus_id IS NULL OR e.campus_id = s.campus_id)
          LEFT JOIN LATERAL (
            SELECT cs.class_section_id
            FROM class_sections csec
            JOIN class_subjects cs ON cs.class_section_id = csec.id
            JOIN subjects subj ON subj.id = cs.subject_id
            WHERE csec.class_name = s.class
              AND csec.section = s.section
              AND (csec.campus_id IS NULL OR csec.campus_id = s.campus_id)
              AND LOWER(subj.name) = LOWER(er.subject)
            ORDER BY (csec.status = 'active') DESC, csec.updated_at DESC
            LIMIT 1
          ) class_subject ON TRUE
          LEFT JOIN class_subjects cs
            ON cs.class_section_id = class_subject.class_section_id
           AND cs.full_marks IS NOT NULL
          LEFT JOIN subjects subj ON subj.id = cs.subject_id AND LOWER(subj.name) = LOWER(er.subject)
          WHERE ${where.length ? where.join(' AND ') : 'TRUE'}
          GROUP BY s.id, s.name, s.class
          HAVING COUNT(er.marks) > 0
       ), ranked AS (
          SELECT
            student_id,
            student_name,
            class_name,
            scored_subjects,
            subjects_with_full_marks,
            obtained,
            CASE WHEN scored_subjects = subjects_with_full_marks THEN configured_total END AS total_marks,
            recorded_grades
          FROM per
       )
       SELECT
         student_name AS "studentName",
         class_name AS "className",
         total_marks AS "totalMarks",
         obtained AS "obtainedMarks",
         recorded_grades AS grade
       FROM ranked
       ORDER BY class_name NULLS LAST, obtained DESC, "studentName" ASC`,
      params
    );

    const data = rows.map((r) => {
      return {
        studentName: r.studentName,
        className: r.className,
        totalMarks: r.totalMarks === null ? null : Number(r.totalMarks),
        obtainedMarks: Number(r.obtainedMarks || 0),
        grade: r.grade || null,
      };
    });

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// --- Fees Reports ---
router.get('/fees/collection', requirePermission('finance', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const startDate = toIsoDate(req.query?.startDate) || null;
    const endDate = toIsoDate(req.query?.endDate) || null;

    const params = [campusId];
    let p = params.length;
    const where = [`fi.campus_id = $${p}`, `fp.user_type = 'student'`];

    if (startDate) {
      params.push(startDate);
      p = params.length;
      where.push(`fp.paid_at::date >= $${p}`);
    }
    if (endDate) {
      params.push(endDate);
      p = params.length;
      where.push(`fp.paid_at::date <= $${p}`);
    }

    const { rows } = await query(
      `SELECT
         COALESCE(fr.receipt_number, 'PAY-' || fp.id::text) AS "receiptNo",
         s.name AS "studentName",
         s.class AS "className",
         fp.paid_at AS date,
         fp.amount::numeric AS amount,
         COALESCE(fp.method, 'other') AS "paymentMode"
       FROM finance_payments fp
       JOIN finance_invoices fi ON fi.id = fp.invoice_id
       LEFT JOIN finance_receipts fr ON fr.payment_id = fp.id
       LEFT JOIN students s ON s.id = fp.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY fp.paid_at DESC, fp.id DESC
       LIMIT 2000`,
      params
    );

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/fees/outstanding', requirePermission('finance', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const klass = req.query?.class ? String(req.query.class) : null;

    const params = [campusId];
    let p = params.length;
    const where = [
      `fi.campus_id = $${p}`,
      `fi.user_type = 'student'`,
      `fi.invoice_type = 'fee'`,
      `fi.balance > 0`,
      `fi.status IN ('pending','partial','overdue')`,
    ];

    if (klass) {
      params.push(klass);
      p = params.length;
      where.push(`s.class = $${p}`);
    }

    const { rows } = await query(
      `SELECT
         s.name AS "studentName",
         s.class AS "className",
         COALESCE(NULLIF(TRIM(fi.description), ''), 'Fee') AS "feeType",
         fi.due_date AS "dueDate",
         fi.balance::numeric AS amount
       FROM finance_invoices fi
       LEFT JOIN students s ON s.id = fi.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY fi.due_date NULLS LAST, fi.id DESC
       LIMIT 2000`,
      params
    );

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// --- Financial Reports ---
router.get('/financial/income', requirePermission('finance', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const startDate = toIsoDate(req.query?.startDate) || null;
    const endDate = toIsoDate(req.query?.endDate) || null;

    const params = [campusId];
    let p = params.length;
    const where = [`fi.campus_id = $${p}`];

    if (startDate) {
      params.push(startDate);
      p = params.length;
      where.push(`fp.paid_at::date >= $${p}`);
    }
    if (endDate) {
      params.push(endDate);
      p = params.length;
      where.push(`fp.paid_at::date <= $${p}`);
    }

    const { rows } = await query(
      `SELECT
         fp.paid_at AS date,
         COALESCE(fi.invoice_type, 'income') AS category,
         COALESCE(NULLIF(TRIM(fi.description), ''), 'Payment') AS description,
         COALESCE(fp.method, 'other') AS "paymentMethod",
         fp.amount::numeric AS amount
       FROM finance_payments fp
       JOIN finance_invoices fi ON fi.id = fp.invoice_id
       WHERE ${where.join(' AND ')}
       ORDER BY fp.paid_at DESC, fp.id DESC
       LIMIT 2000`,
      params
    );

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/financial/expense', requirePermission('finance', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const startDate = toIsoDate(req.query?.startDate) || null;
    const endDate = toIsoDate(req.query?.endDate) || null;

    const params = [campusId];
    let p = params.length;
    const where = [`campus_id = $${p}`];

    if (startDate) {
      params.push(startDate);
      p = params.length;
      where.push(`date >= $${p}`);
    }
    if (endDate) {
      params.push(endDate);
      p = params.length;
      where.push(`date <= $${p}`);
    }

    const { rows } = await query(
      `SELECT
         date,
         category,
         description,
         COALESCE(vendor, '-') AS payee,
         amount::numeric AS amount
       FROM expenses
       WHERE ${where.join(' AND ')}
       ORDER BY date DESC, id DESC
       LIMIT 2000`,
      params
    );

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// --- Attendance Reports ---
router.get('/attendance/daily', requirePermission('attendance', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);
    const date = toIsoDate(req.query?.date) || new Date().toISOString().slice(0, 10);
    const type = String(req.query?.type || 'student').toLowerCase();

    if (type === 'staff' || type === 'teacher' || type === 'teachers') {
      const { rows } = await query(
        `SELECT
           t.id,
           t.name,
           ta.check_in_time AS "checkIn",
           ta.check_out_time AS "checkOut",
           INITCAP(ta.status) AS status
         FROM teacher_attendance ta
         JOIN teachers t ON t.id = ta.teacher_id
         WHERE ta.attendance_date = $1
           AND t.campus_id = $2
         ORDER BY t.name ASC`,
        [date, campusId]
      );
      return res.json(rows);
    }

    const { rows } = await query(
      `SELECT
         s.id,
         s.name,
         ar.check_in_time AS "checkIn",
         ar.check_out_time AS "checkOut",
         INITCAP(ar.status) AS status
       FROM attendance_records ar
       JOIN students s ON s.id = ar.student_id
       WHERE ar.date = $1
         AND ar.campus_id = $2
       ORDER BY s.name ASC`,
      [date, campusId]
    );

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/attendance/monthly', requirePermission('attendance', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);
    const month = req.query?.month;
    const type = String(req.query?.type || 'student').toLowerCase();
    const range = parseMonthRange(month);
    if (!range) return res.json([]);

    if (type === 'staff' || type === 'teacher' || type === 'teachers') {
      const { rows } = await query(
        `SELECT
           t.id,
           t.name,
           COUNT(ta.id)::int AS "totalDays",
           SUM(CASE WHEN ta.status = 'present' THEN 1 ELSE 0 END)::int AS present,
           SUM(CASE WHEN ta.status = 'absent' THEN 1 ELSE 0 END)::int AS absent,
           SUM(CASE WHEN ta.status = 'late' THEN 1 ELSE 0 END)::int AS late
         FROM teachers t
         LEFT JOIN teacher_attendance ta
           ON ta.teacher_id = t.id
          AND ta.attendance_date >= $2
          AND ta.attendance_date <= $3
         WHERE t.campus_id = $1
         GROUP BY t.id, t.name
         ORDER BY t.name ASC`,
        [campusId, range.from, range.to]
      );

      const out = rows.map((r) => {
        const totalDays = Number(r.totalDays || 0);
        const present = Number(r.present || 0);
        const percentage = totalDays ? +((present * 100) / totalDays).toFixed(2) : 0;
        return {
          id: r.id,
          name: r.name,
          totalDays,
          present,
          absent: Number(r.absent || 0),
          late: Number(r.late || 0),
          percentage,
        };
      });

      return res.json(out);
    }

    const { rows } = await query(
      `SELECT
         s.id,
         s.name,
         COUNT(ar.id)::int AS "totalDays",
         SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::int AS present,
         SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END)::int AS absent,
         SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END)::int AS late
       FROM students s
       LEFT JOIN attendance_records ar
         ON ar.student_id = s.id
        AND ar.campus_id = $1
        AND ar.date >= $2
        AND ar.date <= $3
       WHERE s.campus_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name ASC`,
      [campusId, range.from, range.to]
    );

    const out = rows.map((r) => {
      const totalDays = Number(r.totalDays || 0);
      const present = Number(r.present || 0);
      const percentage = totalDays ? +((present * 100) / totalDays).toFixed(2) : 0;
      return {
        id: r.id,
        name: r.name,
        totalDays,
        present,
        absent: Number(r.absent || 0),
        late: Number(r.late || 0),
        percentage,
      };
    });

    return res.json(out);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// --- HR Reports ---
router.get('/hr/employee', requirePermission('hr', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const department = req.query?.department ? String(req.query.department) : null;

    const params = [campusId];
    let p = params.length;
    const where = [`campus_id = $${p}`];
    if (department) {
      params.push(department);
      p = params.length;
      where.push(`department = $${p}`);
    }

    const { rows } = await query(
      `SELECT
         id,
         name,
         COALESCE(designation, '') AS role,
         COALESCE(department, '') AS department,
         joining_date AS "joinDate",
         COALESCE(status, employment_status, 'active') AS status
       FROM teachers
       WHERE ${where.join(' AND ')}
       ORDER BY name ASC`,
      params
    );

    return res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/hr/salary', requirePermission('hr', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);
    const month = req.query?.month;
    const range = parseMonthRange(month);
    if (!range) return res.json([]);

    const { rows } = await query(
      `SELECT
         t.name AS "employeeName",
         COALESCE(t.designation, '') AS designation,
         tp.base_salary::numeric AS "basicSalary",
         tp.deductions::numeric AS deductions,
         tp.total_amount::numeric AS "netSalary",
         tp.status AS status
       FROM teacher_payrolls tp
       JOIN teachers t ON t.id = tp.teacher_id
       WHERE t.campus_id = $1
         AND tp.period_month >= $2
         AND tp.period_month <= $3
       ORDER BY t.name ASC`,
      [campusId, range.from, range.to]
    );

    return res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Examination Reports ---
router.get('/exam/results', requirePermission('marks', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const examIdRaw = req.query?.examId;
    const klass = req.query?.classId ? String(req.query.classId) : null;
    const examIdNum = examIdRaw && String(examIdRaw).match(/^\d+$/) ? Number(examIdRaw) : null;
    const examKey = !examIdNum && examIdRaw ? String(examIdRaw) : null;

    const params = [campusId];
    let p = params.length;
    const where = [`s.campus_id = $${p}`];

    if (klass) {
      params.push(klass);
      p = params.length;
      where.push(`s.class = $${p}`);
    }

    if (examIdNum) {
      params.push(examIdNum);
      p = params.length;
      where.push(`er.exam_id = $${p}`);
    } else if (examKey) {
      params.push(`%${examKey}%`);
      p = params.length;
      where.push(`COALESCE(e.title,'') ILIKE $${p}`);
    }

    const { rows } = await query(
      `WITH per AS (
         SELECT
           s.id,
           s.name AS "studentName",
           s.roll_number AS "rollNo",
           COUNT(er.subject)::int AS subjects,
           COALESCE(SUM(er.marks), 0)::numeric AS obtained
         FROM students s
         LEFT JOIN exam_results er ON er.student_id = s.id
         LEFT JOIN exams e ON e.id = er.exam_id
         WHERE ${where.join(' AND ')}
         GROUP BY s.id, s.name, s.roll_number
         HAVING COUNT(er.marks) > 0
       )
       SELECT
         "studentName",
         "rollNo",
         (subjects * 100)::int AS "totalMarks",
         obtained::numeric AS "obtainedMarks",
         CASE WHEN subjects > 0 THEN ROUND((obtained / NULLIF((subjects * 100), 0) * 100)::numeric, 2) ELSE 0 END AS percentage
       FROM per
       ORDER BY percentage DESC, "studentName" ASC`,
      params
    );

    const data = rows.map((r) => ({
      studentName: r.studentName,
      rollNo: r.rollNo,
      totalMarks: Number(r.totalMarks || 0),
      obtainedMarks: Number(r.obtainedMarks || 0),
      percentage: Number(r.percentage || 0),
      grade: gradeFromPct(r.percentage),
    }));

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/exam/grades', requirePermission('marks', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const examIdRaw = req.query?.examId;
    const klass = req.query?.classId ? String(req.query.classId) : null;
    const examIdNum = examIdRaw && String(examIdRaw).match(/^\d+$/) ? Number(examIdRaw) : null;
    const examKey = !examIdNum && examIdRaw ? String(examIdRaw) : null;

    const params = [campusId];
    let p = params.length;
    const where = [`s.campus_id = $${p}`];

    if (klass) {
      params.push(klass);
      p = params.length;
      where.push(`s.class = $${p}`);
    }

    if (examIdNum) {
      params.push(examIdNum);
      p = params.length;
      where.push(`er.exam_id = $${p}`);
    } else if (examKey) {
      params.push(`%${examKey}%`);
      p = params.length;
      where.push(`COALESCE(e.title,'') ILIKE $${p}`);
    }

    const { rows } = await query(
      `WITH per AS (
         SELECT
           s.id,
           COUNT(er.subject)::int AS subjects,
           COALESCE(SUM(er.marks), 0)::numeric AS obtained
         FROM students s
         LEFT JOIN exam_results er ON er.student_id = s.id
         LEFT JOIN exams e ON e.id = er.exam_id
         WHERE ${where.join(' AND ')}
         GROUP BY s.id
         HAVING COUNT(er.marks) > 0
       ), scored AS (
         SELECT
           id,
           CASE WHEN subjects > 0 THEN (obtained / NULLIF((subjects * 100), 0) * 100) ELSE 0 END AS pct
         FROM per
       )
       SELECT
         CASE
           WHEN pct >= 90 THEN 'A+'
           WHEN pct >= 80 THEN 'A'
           WHEN pct >= 70 THEN 'B'
           WHEN pct >= 60 THEN 'C'
           WHEN pct >= 50 THEN 'D'
           ELSE 'F'
         END AS grade,
         COUNT(*)::int AS count
       FROM scored
       GROUP BY grade
       ORDER BY grade ASC`,
      params
    );

    const total = rows.reduce((acc, r) => acc + Number(r.count || 0), 0);
    const bounds = {
      'A+': [90, 100],
      'A': [80, 89],
      'B': [70, 79],
      'C': [60, 69],
      'D': [50, 59],
      'F': [0, 49],
    };

    const data = rows.map((r) => {
      const [minMarks, maxMarks] = bounds[r.grade] || [0, 0];
      const count = Number(r.count || 0);
      const percentage = total ? +((count * 100) / total).toFixed(2) : 0;
      return { grade: r.grade, minMarks, maxMarks, count, percentage };
    });

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// --- Inventory Reports ---
router.get('/inventory/stock', requirePermission('library', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const category = req.query?.category ? String(req.query.category) : null;
    const where = { campusId };
    if (category) where.category = category;

    const items = await Product.findAll({ where, order: [['name', 'ASC']] });
    const data = (items || []).map((p) => {
      const json = p?.toJSON ? p.toJSON() : p;
      const qty = Number(json.quantity || 0);
      const unitPrice = Number(json.price || 0);
      return {
        itemName: json.name,
        category: json.category,
        quantity: qty,
        unitPrice,
        totalValue: +(qty * unitPrice).toFixed(2),
      };
    });

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/inventory/purchase', requirePermission('library', 'view'), async (req, res) => {
  try {
    const campusId = getCampusId(req);
    if (!campusId) return res.json([]);

    const startDate = toIsoDate(req.query?.startDate) || null;
    const endDate = toIsoDate(req.query?.endDate) || null;

    const where = { campusId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Sequelize.Op.gte] = new Date(`${startDate}T00:00:00Z`);
      if (endDate) where.date[Sequelize.Op.lte] = new Date(`${endDate}T23:59:59Z`);
    }

    const purchases = await Purchase.findAll({ where, order: [['date', 'DESC'], ['id', 'DESC']], limit: 2000 });

    const supplierIds = Array.from(
      new Set(purchases.map((p) => (p?.supplierId != null ? String(p.supplierId) : null)).filter(Boolean))
    );
    const suppliers = supplierIds.length
      ? await Supplier.findAll({ where: { campusId, id: supplierIds } })
      : [];
    const supplierMap = new Map(suppliers.map((s) => [String(s.id), s.name]));

    const data = purchases.map((p) => {
      const json = p?.toJSON ? p.toJSON() : p;
      return {
        date: json.date,
        reference: `PUR-${json.id}`,
        supplier: supplierMap.get(String(json.supplierId)) || String(json.supplierId || '-'),
        items: Number(json.quantity || 0),
        totalAmount: Number(json.total || 0),
        status: json.status,
      };
    });

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
