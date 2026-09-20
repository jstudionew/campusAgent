import { Router } from 'express';
import { body, query } from 'express-validator';
import * as controller from '../controllers/alerts.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('admin'),
  [
    query('severity').optional().isIn(['info','warning','critical']),
    query('status').optional().isIn(['active','resolved']),
    query('q').optional().isString(),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('targetUserId').optional().isInt(),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  controller.list
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('message').isString().trim().isLength({ min: 1 }),
    body('severity').optional().isIn(['info','warning','critical']),
    body('type').optional().isString().trim(),
    body('targetUserId').optional().isInt(),
  ],
  validate,
  controller.create
);

router.post(
  '/mark-read',
  authenticate,
  authorize('admin'),
  [body('ids').isArray({ min: 1 }), body('ids.*').isInt()],
  validate,
  controller.markRead
);

router.post(
  '/resolve',
  authenticate,
  authorize('admin'),
  [body('ids').isArray({ min: 1 }), body('ids.*').isInt()],
  validate,
  controller.resolve
);

// Current user's targeted alerts
router.get(
  '/mine',
  authenticate,
  [
    query('severity').optional().isIn(['info','warning','critical']),
    query('status').optional().isIn(['active','resolved']),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  controller.listMine
);

// Recipient lookup by role (admin)
router.get(
  '/recipients',
  authenticate,
  authorize('admin'),
  [
    query('role').isIn(['student','teacher','driver']),
    query('q').optional().isString(),
  ],
  validate,
  controller.listRecipients
);

export default router;
