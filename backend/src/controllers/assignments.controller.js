import * as assignments from '../services/assignments.service.js';
import * as teachers from '../services/teachers.service.js';
import * as students from '../services/students.service.js';
import { canTeacherAccessClass } from '../services/teacherAccess.service.js';

export const list = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, q } = req.query;

    // Filter assignments based on user role
    if (req.user?.role === 'teacher') {
      const teacher = await teachers.getByUserId(req.user.id);
      if (!teacher) return res.json({ rows: [], total: 0, page, pageSize });

      // Get assignments created by this teacher OR for classes assigned to this teacher
      const result = await assignments.listByTeacher(teacher.id, { page: Number(page), pageSize: Number(pageSize), q });
      return res.json(result);
    }

    if (req.user?.role === 'student') {
      const student = await students.getByUserId(req.user.id);
      if (!student) return res.json({ rows: [], total: 0, page, pageSize });

      // Get assignments for student's class/section
      const result = await assignments.listByStudent(student, { page: Number(page), pageSize: Number(pageSize), q });
      return res.json(result);
    }

    // Admin/Owner see all assignments
    const result = await assignments.list({
      page: Number(page),
      pageSize: Number(pageSize),
      q,
      campusId: req.user?.campusId
    });
    return res.json(result);
  } catch (e) { next(e); }
};

export const getById = async (req, res, next) => {
  try {
    const a = await assignments.getById(Number(req.params.id));
    if (!a) return res.status(404).json({ message: 'Assignment not found' });

    if (req.user?.role === 'student') {
      const self = await students.getByUserId(req.user.id);
      if (!self) return res.status(404).json({ message: 'Student profile not found' });
      if (req.user?.campusId && a.campusId && Number(a.campusId) !== Number(req.user.campusId)) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      if (a.class && String(a.class) !== String(self.class)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (a.section && String(a.section) !== String(self.section)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    return res.json(a);
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    if (req.user?.role === 'teacher') {
      const ok = await canTeacherAccessClass(req.user.id, req.body.class, req.body.section);
      if (!ok) return res.status(403).json({ message: 'Forbidden: You are not assigned to teach this class/section' });
    }
    const created = await assignments.create({ ...req.body, campusId: req.user?.campusId }, req.user);
    return res.status(201).json(created);
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const existing = await assignments.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: 'Assignment not found' });
    if (req.user?.role === 'teacher') {
      const isOwner = Number(existing.createdBy) === Number(req.user.id);
      const canAccess = await canTeacherAccessClass(req.user.id, existing.class, existing.section);
      if (!isOwner && !canAccess) return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await assignments.update(Number(req.params.id), req.body);
    return res.json(updated);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const existing = await assignments.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: 'Assignment not found' });
    if (req.user?.role === 'teacher') {
      const isOwner = Number(existing.createdBy) === Number(req.user.id);
      if (!isOwner) return res.status(403).json({ message: 'Forbidden: Can only delete your own assignments' });
    }
    const ok = await assignments.remove(Number(req.params.id));
    return res.json({ success: true });
  } catch (e) { next(e); }
};

export const submitWork = async (req, res, next) => {
  try {
    const self = await students.getByUserId(req.user.id);
    if (!self) return res.status(404).json({ message: 'Student profile not found' });
    const submission = await assignments.submitWork(Number(req.params.id), self.id, req.body);
    return res.status(201).json(submission);
  } catch (e) { next(e); }
};
