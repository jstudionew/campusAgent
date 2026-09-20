import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as controller from '../controllers/rbac.controller.js';

const router = Router();

router.get('/roles', authenticate, authorize('admin','owner'), controller.listRoles);
router.put(
  '/roles/:role/active',
  authenticate,
  authorize('admin','owner'),
  [param('role').isIn(['admin','teacher','student','driver']), body('active').isBoolean()],
  validate,
  controller.setRoleActive
);

router.get('/permissions', authenticate, authorize('admin','owner'), controller.listPermissions);
router.put(
  '/permissions/:role',
  authenticate,
  authorize('admin','owner'),
  [param('role').isIn(['admin','teacher','student','driver']), body('perms').isArray()],
  validate,
  controller.setPermissionsForRole
);

// Module-level access management
router.get('/modules', authenticate, authorize('admin','owner'), controller.listModules);
router.put(
  '/modules/:role',
  authenticate,
  authorize('admin','owner'),
  [param('role').isIn(['admin','teacher','student','driver']), body('allowModules').optional().isArray(), body('allowSubroutes').optional().isArray()],
  validate,
  controller.setModulesForRole
);

// Own role's module access (non-admin)
router.get('/my-modules', authenticate, controller.getMyModules);

export default router;
