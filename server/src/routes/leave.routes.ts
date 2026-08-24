import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/', requireAuth, requireRole(['DOCTOR', 'ADMIN']), LeaveController.createLeave);
router.get('/all', requireAuth, requireRole(['ADMIN']), LeaveController.getAllLeaves);
router.get('/doctor/:doctorId', requireAuth, LeaveController.getDoctorLeaves);
router.delete('/:id', requireAuth, requireRole(['DOCTOR', 'ADMIN']), LeaveController.deleteLeave);

export default router;
