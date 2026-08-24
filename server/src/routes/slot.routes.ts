import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SlotController } from '../controllers/slot.controller';
import { requireAuth, requireRole, AuthUserPayload } from '../middleware/auth.middleware';
import { env } from '../config/env';

const router = Router();

// Optional auth middleware for slots endpoint
function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
      req.user = decoded;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

router.get('/doctor/:doctorId', optionalAuth, SlotController.getSlotsForDoctor);
router.post('/hold', requireAuth, requireRole(['PATIENT']), SlotController.holdSlot);
router.post('/release', requireAuth, SlotController.releaseHold);

export default router;
