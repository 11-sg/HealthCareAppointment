import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LeaveService } from '../services/leave.service';

const createLeaveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  reason: z.string().min(2, 'Please provide a reason for leave'),
  doctorId: z.string().optional(), // Required if Admin creates on behalf of a doctor
});

export class LeaveController {
  static async createLeave(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || (req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN')) {
        res.status(403).json({ error: 'Only doctors and admins can submit leave requests' });
        return;
      }

      const validated = createLeaveSchema.parse(req.body);
      const doctorId = req.user.role === 'ADMIN' ? (validated.doctorId || req.user.id) : req.user.id;

      if (validated.startDate > validated.endDate) {
        res.status(400).json({ error: 'Start date cannot be after end date' });
        return;
      }

      const result = await LeaveService.createLeave({
        doctorId,
        startDate: validated.startDate,
        endDate: validated.endDate,
        reason: validated.reason,
      });

      res.status(201).json({
        message: `Leave recorded successfully. ${result.affectedCount} existing booking(s) were automatically updated and affected patients notified.`,
        leave: result.leave,
        affectedCount: result.affectedCount,
        affectedAppointments: result.affectedAppointments,
      });
    } catch (err) {
      next(err);
    }
  }

  static getDoctorLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.params.doctorId as string;
      const leaves = LeaveService.getDoctorLeaves(doctorId);
      res.status(200).json({ leaves });
    } catch (err) {
      next(err);
    }
  }

  static getAllLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const leaves = LeaveService.getAllLeaves();
      res.status(200).json({ leaves });
    } catch (err) {
      next(err);
    }
  }

  static deleteLeave(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || (req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN')) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const success = LeaveService.deleteLeave(id, req.user.id, req.user.role);

      res.status(200).json({ success, message: success ? 'Leave cancelled' : 'Leave not found' });
    } catch (err) {
      next(err);
    }
  }
}
