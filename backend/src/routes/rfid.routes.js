import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as controller from '../controllers/rfid.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// List RFID logs with filters
router.get(
  '/logs',
  authenticate,
  authorize('admin', 'teacher'),
  [
    query('q').optional().isString(),
    query('status').optional().isString().toLowerCase(),
    query('location').optional().isString(),
    query('bus').optional().isString(),
    query('date').optional().isISO8601(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validate,
  controller.list
);

router.get(
  '/logs/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [param('id').isInt()],
  validate,
  controller.getById
);

router.post(
  '/logs',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('studentId').optional().isInt(),
    body('cardNumber').optional().isString(),
    body('busNumber').optional().isString(),
    body('status').optional().isIn(['success', 'failed']),
    body('location').optional().isString(),
    body('scanTime').optional().isISO8601(),
  ],
  validate,
  controller.create
);

router.put(
  '/logs/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [
    param('id').isInt(),
    body('status').optional().isIn(['success', 'failed']),
    body('location').optional().isString(),
    body('busNumber').optional().isString(),
    body('cardNumber').optional().isString(),
    body('scanTime').optional().isISO8601(),
  ],
  validate,
  controller.update
);

router.delete(
  '/logs/:id',
  authenticate,
  authorize('admin'),
  [param('id').isInt()],
  validate,
  controller.remove
);

export default router;
