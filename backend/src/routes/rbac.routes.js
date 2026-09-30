import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as controller from '../controllers/rbac.controller.js';
import * as rbac from '../services/rbac.service.js';

const router = Router();

router.get('/roles', authenticate, authorize('owner', 'superadmin'), controller.listRoles);
router.post(
  '/roles',
  authenticate,
  authorize('owner', 'superadmin'),
  [body('name').isString().trim().isLength({ min: 2, max: 60 }), body('permissions').optional().isArray(), body('permissions.*').optional().isString(), body('active').optional().isBoolean()],
  validate,
  controller.createRole
);
router.put(
  '/roles/:role/active',
  authenticate,
  authorize('owner', 'superadmin'),
  [param('role').custom(rbac.isRoleDefined), body('active').isBoolean()],
  validate,
  controller.setRoleActive
);

router.get('/permissions', authenticate, authorize('owner', 'superadmin'), controller.listPermissions);
router.put(
  '/permissions/:role',
  authenticate,
  authorize('owner', 'superadmin'),
  [param('role').custom(rbac.isRoleDefined), body('perms').isArray()],
  validate,
  controller.setPermissionsForRole
);

// Module-level access management
router.get('/modules', authenticate, authorize('owner', 'superadmin'), controller.listModules);
router.put(
  '/modules/:role',
  authenticate,
  authorize('owner', 'superadmin'),
  [param('role').custom(rbac.isRoleDefined), body('allowModules').optional().isArray(), body('allowSubroutes').optional().isArray()],
  validate,
  controller.setModulesForRole
);

// Own role's module access (non-admin)
router.get('/my-modules', authenticate, controller.getMyModules);

export default router;
