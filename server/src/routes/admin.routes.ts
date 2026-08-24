import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require ADMIN role
router.use(requireAuth, requireRole(['ADMIN']));

router.get('/stats', AdminController.getStats);
router.post('/doctors', AdminController.createDoctor);
router.put('/doctors/:id', AdminController.updateDoctor);
router.get('/email-queue', AdminController.getEmailQueue);
router.post('/email-queue/:id/retry', AdminController.retryEmailQueueItem);
router.post('/workers/trigger', AdminController.triggerWorker);

export default router;
