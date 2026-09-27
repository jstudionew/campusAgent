import * as attendanceService from '../services/attendance.service.js';
import * as studentsSvc from '../services/students.service.js';
import * as parentsSvc from '../services/parents.service.js';
import * as teachersSvc from '../services/teachers.service.js';
import { assertResourceCampusAccess } from '../middleware/auth.js';

export const list = async (req, res, next) => {
  try {
    const { studentId, startDate, endDate, page, pageSize } = req.query;
    const rows = await attendanceService.list({
      studentId, startDate, endDate, page, pageSize,
      campusId: req.user?.campusId
    });
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
};

export const getById = async (req, res, next) => {
  try {
    const row = await attendanceService.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Record not found' });
    const student = row.studentId ? await studentsSvc.getById(Number(row.studentId)) : null;
    if (student && !assertResourceCampusAccess(req, student.campusId)) return res.status(404).json({ message: 'Record not found' });
    if (req.user?.role === 'student' && row.studentId && Number(row.studentId) !== Number((await studentsSvc.getByUserId(req.user.id))?.id)) return res.status(404).json({ message: 'Record not found' });
    if (req.user?.role === 'parent') {
      const parent = await parentsSvc.getByUserId(req.user.id);
      const child = student ? student : await studentsSvc.getById(Number(row.studentId));
      if (!parent || !child || String(parent.familyNumber) !== String(child.familyNumber)) return res.status(404).json({ message: 'Record not found' });
    }
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const { studentId, date, status, remarks } = req.body;

    if (req.user?.role === 'teacher') {
      const { canTeacherAccessStudent } = await import('../services/teacherAccess.service.js');
      const ok = await canTeacherAccessStudent(req.user.id, studentId);
      if (!ok) return res.status(403).json({ message: 'Forbidden: Student not in your assigned classes' });
    }

    const createdBy = req.user?.id;
    const row = await attendanceService.create({
      studentId, date, status, remarks, createdBy,
      campusId: req.user?.campusId
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const current = await attendanceService.getById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Record not found' });
    const student = current.studentId ? await studentsSvc.getById(Number(current.studentId)) : null;
    if (student && !assertResourceCampusAccess(req, student.campusId)) return res.status(404).json({ message: 'Record not found' });
    const row = await attendanceService.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ message: 'Record not found' });
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const current = await attendanceService.getById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Record not found' });
    const student = current.studentId ? await studentsSvc.getById(Number(current.studentId)) : null;
    if (student && !assertResourceCampusAccess(req, student.campusId)) return res.status(404).json({ message: 'Record not found' });
    await attendanceService.remove(req.params.id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

// Daily (Admin): list students with their attendance for a given date and filters
export const listDaily = async (req, res, next) => {
  try {
    const { date, class: cls, section, q } = req.query;
    if (!date) return res.status(400).json({ message: 'date is required' });

    if (req.user?.role === 'teacher' && cls) {
      const { canTeacherAccessClass } = await import('../services/teacherAccess.service.js');
      const ok = await canTeacherAccessClass(req.user.id, cls, section);
      if (!ok) return res.status(403).json({ message: 'Forbidden: You are not assigned to this class/section' });
    }

    const rows = await attendanceService.listDaily({
      date, class: cls, section, q,
      campusId: req.user?.campusId
    });
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
};

// Daily (Admin): bulk upsert for a given date
export const upsertDaily = async (req, res, next) => {
  try {
    const { date, records } = req.body || {};
    if (!date || !Array.isArray(records)) return res.status(400).json({ message: 'date and records[] are required' });

    if (req.user?.role === 'teacher') {
      const { canTeacherAccessStudent } = await import('../services/teacherAccess.service.js');
      for (const r of records) {
        if (r.studentId) {
          const ok = await canTeacherAccessStudent(req.user.id, r.studentId);
          if (!ok) return res.status(403).json({ message: `Forbidden: Student ${r.studentId} is not in your assigned classes` });
        }
      }
    }

    const createdBy = req.user?.id;
    const result = await attendanceService.upsertDaily({
      date, records, createdBy,
      campusId: req.user?.campusId
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};
