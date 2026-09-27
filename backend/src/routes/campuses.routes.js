import express from 'express';
import * as campusCtrl from '../controllers/campuses.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Owners/superadmins can manage campuses, while admins can view scoped campus data
router.use(authenticate);
router.use(authorize('owner', 'superadmin', 'admin'));

router.get('/', campusCtrl.list);
router.get('/:id', campusCtrl.getById);
router.post('/', campusCtrl.create);
router.put('/:id', campusCtrl.update);
router.delete('/:id', campusCtrl.remove);

export default router;
