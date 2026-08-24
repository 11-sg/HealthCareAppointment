import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { PrescriptionService } from '../services/prescription.service';
import { SlotService } from '../services/slot.service';
import { BackgroundWorkerManager } from '../workers';

const createDoctorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  specialization: z.string().min(2, 'Specialization is required'),
  bio: z.string().optional(),
  experience_years: z.number().default(5),
  consultation_fee: z.number().default(50.0),
  slot_duration_minutes: z.number().default(30),
  working_hours: z.record(z.any()).optional(),
});

const updateDoctorSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  bio: z.string().optional(),
  experience_years: z.number().optional(),
  consultation_fee: z.number().optional(),
  slot_duration_minutes: z.number().optional(),
  working_hours: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

export class AdminController {
  static getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayStart = `${todayStr}T00:00:00.000Z`;
      const todayEnd = `${todayStr}T23:59:59.999Z`;

      const totalAppointments = (db.prepare('SELECT COUNT(*) as count FROM appointments').get() as any).count;
      const todayAppointments = (db.prepare('SELECT COUNT(*) as count FROM appointments WHERE slot_start >= ? AND slot_start <= ?').get(todayStart, todayEnd) as any).count;
      const completedAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'COMPLETED'").get() as any).count;
      const cancelledAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status LIKE 'CANCELLED%'").get() as any).count;
      
      const totalDoctors = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'DOCTOR'").get() as any).count;
      const totalPatients = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'PATIENT'").get() as any).count;
      
      const activeLeaves = (db.prepare("SELECT COUNT(*) as count FROM doctor_leaves WHERE status = 'APPROVED' AND ? >= start_date AND ? <= end_date").get(todayStr, todayStr) as any).count;

      const emailStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
        FROM notification_queue
      `).get() as any;

      res.status(200).json({
        stats: {
          totalAppointments,
          todayAppointments,
          completedAppointments,
          cancelledAppointments,
          totalDoctors,
          totalPatients,
          activeLeaves,
          emailQueue: {
            total: emailStats.total || 0,
            sent: emailStats.sent || 0,
            pending: emailStats.pending || 0,
            failed: emailStats.failed || 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createDoctorSchema.parse(req.body);
      const result = await AuthService.register({
        name: validated.name,
        email: validated.email,
        password: validated.password,
        role: 'DOCTOR',
        phone: validated.phone,
        specialization: validated.specialization,
        bio: validated.bio,
        experience_years: validated.experience_years,
        consultation_fee: validated.consultation_fee,
        slot_duration_minutes: validated.slot_duration_minutes,
      });

      if (validated.working_hours) {
        db.prepare(`
          UPDATE doctor_profiles 
          SET working_hours = ? 
          WHERE user_id = ?
        `).run(JSON.stringify(validated.working_hours), result.user.id);
      }

      res.status(201).json({ message: 'Doctor created successfully', doctor: result.user });
    } catch (err) {
      next(err);
    }
  }

  static updateDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateDoctorSchema.parse(req.body);
      const nowIso = new Date().toISOString();

      if (validated.name || validated.phone) {
        db.prepare(`
          UPDATE users 
          SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = ?
          WHERE id = ?
        `).run(validated.name || null, validated.phone || null, nowIso, id);
      }

      db.prepare(`
        UPDATE doctor_profiles
        SET 
          specialization = COALESCE(?, specialization),
          bio = COALESCE(?, bio),
          experience_years = COALESCE(?, experience_years),
          consultation_fee = COALESCE(?, consultation_fee),
          slot_duration_minutes = COALESCE(?, slot_duration_minutes),
          working_hours = COALESCE(?, working_hours),
          is_active = COALESCE(?, is_active),
          updated_at = ?
        WHERE user_id = ? OR id = ?
      `).run(
        validated.specialization || null,
        validated.bio || null,
        validated.experience_years !== undefined ? validated.experience_years : null,
        validated.consultation_fee !== undefined ? validated.consultation_fee : null,
        validated.slot_duration_minutes !== undefined ? validated.slot_duration_minutes : null,
        validated.working_hours ? JSON.stringify(validated.working_hours) : null,
        validated.is_active !== undefined ? (validated.is_active ? 1 : 0) : null,
        nowIso,
        id,
        id
      );

      res.status(200).json({ message: 'Doctor updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static getEmailQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, limit = 50 } = req.query;

      let query = 'SELECT * FROM notification_queue WHERE 1=1';
      const params: any[] = [];

      if (status && typeof status === 'string') {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(Number(limit));

      const items = db.prepare(query).all(...params);
      res.status(200).json({ queue: items });
    } catch (err) {
      next(err);
    }
  }

  static async retryEmailQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const success = await EmailService.processQueueItem(id);
      res.status(200).json({ success, message: success ? 'Email sent successfully' : 'Retry failed' });
    } catch (err) {
      next(err);
    }
  }

  static async triggerWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { worker } = req.body;
      let result: any = {};

      if (worker === 'email_queue') {
        result = await EmailService.processPendingQueue(20);
      } else if (worker === 'medication_reminders') {
        const sent = await PrescriptionService.processDueMedicationReminders();
        result = { sentReminders: sent };
      } else if (worker === 'slot_hold_cleanup') {
        const cleaned = SlotService.cleanupExpiredHolds();
        result = { cleanedHolds: cleaned };
      } else if (worker === 'appointment_reminders') {
        const sent = await BackgroundWorkerManager.dispatchUpcomingAppointmentReminders();
        result = { sentReminders: sent };
      } else {
        res.status(400).json({ error: 'Unknown worker identifier' });
        return;
      }

      res.status(200).json({ message: `Worker '${worker}' executed`, result });
    } catch (err) {
      next(err);
    }
  }
}
