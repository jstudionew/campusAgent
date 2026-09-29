import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { authenticate, authorize, requireOwnerAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ALLOWED_USER_ROLES } from '../services/auth.service.js';

const router = Router();

router.post(
  '/login',
  [
    body().custom((_, { req }) => {
      const uname = String(req.body?.username || '').trim();
      if (uname && uname.length >= 3) return true;
      const v = String(req.body?.email || req.body?.phone || '').trim();
      const emailRegex = /.+@.+\..+/;
      const phoneDigits = v.replace(/\D/g, '');
      if (emailRegex.test(v) || (phoneDigits.length >= 10 && phoneDigits.length <= 15)) return true;
      throw new Error('Provide a username, email, or phone number');
    }),
    body('password').isString().isLength({ min: 6 })
  ],
  validate,
  authController.login
);

// Public status endpoint used by frontend to toggle login buttons before setup
router.get('/status', authController.status);

router.post(
  '/register',
  authenticate,
  authorize('admin', 'owner', 'superadmin'),
  [
    body().custom((_, { req }) => {
      const email = String(req.body?.email || '').trim();
      const username = String(req.body?.username || '').trim();
      const phone = String(req.body?.phone || '').trim();
      if (!email && !username && !phone) throw new Error('Provide an email, username, or phone number');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address');
      if (username && !/^[a-zA-Z0-9._-]{3,40}$/.test(username)) throw new Error('Username must be 3-40 characters using letters, numbers, dots, underscores, or hyphens');
      const phoneDigits = phone.replace(/\D/g, '');
      if (phone && (phone.length > 32 || phoneDigits.length < 10 || phoneDigits.length > 15)) throw new Error('Enter a valid phone number');
      return true;
    }),
    body('password').isString().isLength({ min: 6 }),
    body('name').optional().isString(),
    body('role').optional().custom((value, { req }) => {
      const v = String(value || '').trim();
      if (!v) return true;
      if (ALLOWED_USER_ROLES.includes(v)) return true;
      throw new Error('Invalid role');
    }),
    body('campusId').optional().isInt({ min: 1 }),
  ],
  validate,
  authController.register
);

router.post('/logout', authenticate, authController.logout);
router.post('/refresh', [body('refreshToken').isString()], validate, authController.refresh);
router.get('/profile', authenticate, authController.profile);
router.put('/profile', authenticate, authController.updateMyProfile);
router.get('/users', authenticate, authController.getAllUsers);
router.get('/users/:id', authenticate, authController.getUserById);
router.put('/users/:id', authenticate, authorize('admin', 'owner', 'superadmin'), validate, authController.updateUser);
router.delete('/users/:id', authenticate, authorize('admin', 'owner', 'superadmin'), authController.deleteUser);

// Owner Visibility Settings
router.get('/visibility-settings', authenticate, requireOwnerAccess(), authController.getVisibilitySettings);
router.put(
  '/visibility-settings',
  authenticate,
  requireOwnerAccess(),
  [body('settingKey').isString().notEmpty()],
  validate,
  authController.updateVisibilitySetting
);

// Create missing user accounts from domain tables by role
router.post(
  '/backfill-users',
  authenticate,
  authorize('admin'),
  [body('role').isIn(['student', 'teacher', 'driver'])],
  validate,
  authController.backfillUsers
);

export default router;
