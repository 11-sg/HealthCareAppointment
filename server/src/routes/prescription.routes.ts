import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/my', requireAuth, requireRole(['PATIENT']), PrescriptionController.getMyPrescriptions);
router.get('/reminders/today', requireAuth, requireRole(['PATIENT']), PrescriptionController.getTodayReminders);
router.post('/reminders/:id/ack', requireAuth, requireRole(['PATIENT']), PrescriptionController.acknowledgeReminder);
router.get('/appointment/:appointmentId', requireAuth, PrescriptionController.getAppointmentPrescriptions);

export default router;
