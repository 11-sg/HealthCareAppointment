import { Request, Response, NextFunction } from 'express';
import { PrescriptionService } from '../services/prescription.service';

export class PrescriptionController {
  static getMyPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const prescriptions = PrescriptionService.getPatientPrescriptions(req.user.id);
      res.status(200).json({ prescriptions });
    } catch (err) {
      next(err);
    }
  }

  static getTodayReminders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { date } = req.query;
      const reminders = PrescriptionService.getTodayReminders(
        req.user.id,
        typeof date === 'string' ? date : undefined
      );

      res.status(200).json({ reminders });
    } catch (err) {
      next(err);
    }
  }

  static acknowledgeReminder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const id = req.params.id as string;
      const success = PrescriptionService.acknowledgeReminder(id, req.user.id);

      res.status(200).json({ success, message: success ? 'Dose marked as taken' : 'Reminder not found' });
    } catch (err) {
      next(err);
    }
  }

  static getAppointmentPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const appointmentId = req.params.appointmentId as string;
      const prescriptions = PrescriptionService.getAppointmentPrescriptions(appointmentId);
      res.status(200).json({ prescriptions });
    } catch (err) {
      next(err);
    }
  }
}
