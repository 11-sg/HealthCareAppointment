import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';

const router = Router();

router.get('/status', CalendarController.getStatus);
router.get('/auth-url', CalendarController.getAuthUrl);
router.get('/callback', CalendarController.handleCallback);

export default router;
