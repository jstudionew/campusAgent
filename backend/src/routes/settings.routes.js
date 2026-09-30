import { Router } from 'express';
import { body, param } from 'express-validator';
import * as controller from '../controllers/settings.controller.js';
import { authenticate, authorize, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, authorize('owner', 'superadmin'), requirePermission('settings', 'view'), controller.list);
router.get('/:key', authenticate, authorize('owner', 'superadmin'), requirePermission('settings', 'view'), [param('key').isString()], validate, controller.getByKey);
router.put('/:key', authenticate, authorize('owner', 'superadmin'), requirePermission('settings', 'manage'), [param('key').isString(), body('value').exists()], validate, controller.setKey);
router.delete('/:key', authenticate, authorize('owner', 'superadmin'), requirePermission('settings', 'manage'), [param('key').isString()], validate, controller.removeKey);

export default router;
