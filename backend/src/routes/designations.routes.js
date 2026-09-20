import { Router } from 'express';
import * as controller from '../controllers/masterData.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// List designations (any authenticated user can read designations for dropdowns)
router.get('/', controller.getDesignations);

// Create, update, delete designations (admin, owner, superadmin)
router.post('/', authorize('admin', 'owner', 'superadmin'), controller.createDesignation);
router.put('/:id', authorize('admin', 'owner', 'superadmin'), controller.updateDesignation);
router.delete('/:id', authorize('admin', 'owner', 'superadmin'), controller.deleteDesignation);

export default router;
