import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SlotService } from '../services/slot.service';

const holdSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  slotStart: z.string().min(1, 'Slot start is required'),
  slotEnd: z.string().min(1, 'Slot end is required'),
});

const releaseSchema = z.object({
  holdToken: z.string().min(1, 'Hold token is required'),
});

export class SlotController {
  static getSlotsForDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.params.doctorId as string;
      const { date } = req.query;

      if (!date || typeof date !== 'string') {
        res.status(400).json({ error: 'Query parameter "date" (YYYY-MM-DD) is required' });
        return;
      }

      const patientId = req.user?.id;
      const result = SlotService.getSlotsForDoctorAndDate(doctorId, date, patientId);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static holdSlot(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'PATIENT') {
        res.status(403).json({ error: 'Only registered patients can place a hold on a slot' });
        return;
      }

      const validated = holdSchema.parse(req.body);
      const result = SlotService.holdSlot({
        doctorId: validated.doctorId,
        patientId: req.user.id,
        slotStart: validated.slotStart,
        slotEnd: validated.slotEnd,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static releaseHold(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validated = releaseSchema.parse(req.body);
      const success = SlotService.releaseHold(validated.holdToken, req.user.id);

      res.status(200).json({ success, message: success ? 'Hold released' : 'No active hold found' });
    } catch (err) {
      next(err);
    }
  }
}
