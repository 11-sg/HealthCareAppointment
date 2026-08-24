import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { DoctorProfile, WorkingHoursSchedule } from '../types';

export class DoctorController {
  static listDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const { specialization, search } = req.query;

      let query = `
        SELECT 
          dp.id, dp.user_id, dp.specialization, dp.bio, dp.experience_years,
          dp.consultation_fee, dp.slot_duration_minutes, dp.working_hours, dp.is_active,
          u.name, u.email, u.phone, u.avatar_url
        FROM doctor_profiles dp
        JOIN users u ON u.id = dp.user_id
        WHERE dp.is_active = 1
      `;
      const params: any[] = [];

      if (specialization && typeof specialization === 'string') {
        query += ` AND dp.specialization = ?`;
        params.push(specialization);
      }

      if (search && typeof search === 'string') {
        query += ` AND (u.name LIKE ? OR dp.specialization LIKE ? OR dp.bio LIKE ?)`;
        const wildcard = `%${search}%`;
        params.push(wildcard, wildcard, wildcard);
      }

      query += ` ORDER BY u.name ASC`;

      const rows = db.prepare(query).all(...params) as any[];

      const doctors: DoctorProfile[] = rows.map(r => ({
        ...r,
        working_hours: JSON.parse(r.working_hours),
        is_active: Boolean(r.is_active),
      }));

      res.status(200).json({ doctors });
    } catch (err) {
      next(err);
    }
  }

  static getDoctorById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const row = db.prepare(`
        SELECT 
          dp.id, dp.user_id, dp.specialization, dp.bio, dp.experience_years,
          dp.consultation_fee, dp.slot_duration_minutes, dp.working_hours, dp.is_active,
          u.name, u.email, u.phone, u.avatar_url
        FROM doctor_profiles dp
        JOIN users u ON u.id = dp.user_id
        WHERE dp.user_id = ? OR dp.id = ?
      `).get(id, id) as any;

      if (!row) {
        res.status(404).json({ error: 'Doctor not found' });
        return;
      }

      const doctor: DoctorProfile = {
        ...row,
        working_hours: JSON.parse(row.working_hours),
        is_active: Boolean(row.is_active),
      };

      res.status(200).json({ doctor });
    } catch (err) {
      next(err);
    }
  }

  static updateDoctorProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'DOCTOR') {
        res.status(403).json({ error: 'Only doctors can update their profile' });
        return;
      }

      const { bio, specialization, experience_years, consultation_fee, slot_duration_minutes, working_hours } = req.body;
      const nowIso = new Date().toISOString();

      const existing = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(req.user.id);
      if (!existing) {
        res.status(404).json({ error: 'Doctor profile not found' });
        return;
      }

      db.prepare(`
        UPDATE doctor_profiles
        SET 
          bio = COALESCE(?, bio),
          specialization = COALESCE(?, specialization),
          experience_years = COALESCE(?, experience_years),
          consultation_fee = COALESCE(?, consultation_fee),
          slot_duration_minutes = COALESCE(?, slot_duration_minutes),
          working_hours = COALESCE(?, working_hours),
          updated_at = ?
        WHERE user_id = ?
      `).run(
        bio !== undefined ? bio : null,
        specialization !== undefined ? specialization : null,
        experience_years !== undefined ? experience_years : null,
        consultation_fee !== undefined ? consultation_fee : null,
        slot_duration_minutes !== undefined ? slot_duration_minutes : null,
        working_hours !== undefined ? JSON.stringify(working_hours) : null,
        nowIso,
        req.user.id
      );

      res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static getSpecializations(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = db.prepare(`
        SELECT DISTINCT specialization 
        FROM doctor_profiles 
        WHERE is_active = 1
        ORDER BY specialization ASC
      `).all() as { specialization: string }[];

      res.status(200).json({ specializations: rows.map(r => r.specialization) });
    } catch (err) {
      next(err);
    }
  }
}
