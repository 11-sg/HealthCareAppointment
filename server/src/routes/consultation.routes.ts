import { Router } from 'express';
import { ConsultationController } from '../controllers/consultation.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/preview-summary', requireAuth, requireRole(['DOCTOR', 'ADMIN']), ConsultationController.previewPostVisitSummary);
router.post('/complete', requireAuth, requireRole(['DOCTOR', 'ADMIN']), ConsultationController.completeConsultation);

export default router;
