import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/book', requireAuth, requireRole(['PATIENT']), AppointmentController.bookAppointment);
router.get('/my', requireAuth, AppointmentController.getMyAppointments);
router.post('/pre-visit-preview', AppointmentController.previewSymptomAnalysis);
router.get('/:id', requireAuth, AppointmentController.getAppointmentById);
router.post('/:id/reschedule', requireAuth, AppointmentController.rescheduleAppointment);
router.post('/:id/cancel', requireAuth, AppointmentController.cancelAppointment);
router.get('/:id/ics', AppointmentController.downloadIcs);

export default router;
