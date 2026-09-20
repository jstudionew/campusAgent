import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as assignmentController from '../controllers/assignments.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 200 }),
    query('q').optional().isString(),
  ],
  validate,
  assignmentController.list
);

router.get(
  '/:id',
  authenticate,
  [param('id').isInt()],
  validate,
  assignmentController.getById
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('title').isString().notEmpty(),
    body('description').optional().isString(),
    body('dueDate').optional().isISO8601(),
    body('class').optional().isString(),
    body('section').optional().isString(),
  ],
  validate,
  assignmentController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [param('id').isInt()],
  validate,
  assignmentController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [param('id').isInt()],
  validate,
  assignmentController.remove
);

router.post(
  '/:id/submit',
  authenticate,
  authorize('student'),
  [
    param('id').isInt(),
    body('content').isString().notEmpty(),
  ],
  validate,
  assignmentController.submitWork
);

export default router;
