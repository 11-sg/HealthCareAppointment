import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', DoctorController.listDoctors);
router.get('/specializations', DoctorController.getSpecializations);
router.get('/:id', DoctorController.getDoctorById);
router.put('/profile', requireAuth, requireRole(['DOCTOR']), DoctorController.updateDoctorProfile);

export default router;
