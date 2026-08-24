import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { env } from '../config/env';
import { User, UserRole, DoctorProfile } from '../types';

export class AuthService {
  static async register(params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    specialization?: string;
    bio?: string;
    experience_years?: number;
    consultation_fee?: number;
    slot_duration_minutes?: number;
  }): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(params.email.toLowerCase().trim());
    if (existing) {
      const err = new Error('A user with this email already exists');
      (err as any).status = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(params.password, salt);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const insertUser = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        params.name.trim(),
        params.email.toLowerCase().trim(),
        password_hash,
        params.role,
        params.phone || null,
        now,
        now
      );

      if (params.role === 'DOCTOR') {
        const profileId = uuidv4();
        const defaultHours = {
          monday: { start: '09:00', end: '17:00', is_available: true },
          tuesday: { start: '09:00', end: '17:00', is_available: true },
          wednesday: { start: '09:00', end: '17:00', is_available: true },
          thursday: { start: '09:00', end: '17:00', is_available: true },
          friday: { start: '09:00', end: '17:00', is_available: true },
          saturday: { start: '10:00', end: '14:00', is_available: false },
          sunday: { start: '10:00', end: '14:00', is_available: false },
        };

        db.prepare(`
          INSERT INTO doctor_profiles (
            id, user_id, specialization, bio, experience_years, 
            consultation_fee, slot_duration_minutes, working_hours, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          profileId,
          userId,
          params.specialization || 'General Medicine',
          params.bio || 'Experienced healthcare specialist dedicated to patient wellness.',
          params.experience_years || 5,
          params.consultation_fee || 50.0,
          params.slot_duration_minutes || 30,
          JSON.stringify(defaultHours),
          now,
          now
        );
      }
    });

    insertUser();

    const userRecord = db.prepare('SELECT id, name, email, role, phone, avatar_url, created_at, updated_at FROM users WHERE id = ?').get(userId) as Omit<User, 'password_hash'>;

    const token = jwt.sign(
      { id: userRecord.id, email: userRecord.email, role: userRecord.role, name: userRecord.name },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { user: userRecord, token };
  }

  static async login(params: {
    email: string;
    password: string;
  }): Promise<{ user: Omit<User, 'password_hash'> & { doctorProfile?: DoctorProfile }; token: string }> {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(params.email.toLowerCase().trim()) as User | undefined;

    if (!user) {
      const err = new Error('Invalid email or password');
      (err as any).status = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(params.password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      (err as any).status = 401;
      throw err;
    }

    let doctorProfile: DoctorProfile | undefined;
    if (user.role === 'DOCTOR') {
      const row = db.prepare('SELECT * FROM doctor_profiles WHERE user_id = ?').get(user.id) as any;
      if (row) {
        doctorProfile = {
          ...row,
          working_hours: JSON.parse(row.working_hours),
          is_active: Boolean(row.is_active),
        };
      }
    }

    const { password_hash, ...safeUser } = user;

    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email, role: safeUser.role, name: safeUser.name },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { user: { ...safeUser, doctorProfile }, token };
  }

  static getUserById(id: string): (Omit<User, 'password_hash'> & { doctorProfile?: DoctorProfile }) | null {
    const user = db.prepare('SELECT id, name, email, role, phone, avatar_url, created_at, updated_at FROM users WHERE id = ?').get(id) as Omit<User, 'password_hash'> | undefined;
    if (!user) return null;

    let doctorProfile: DoctorProfile | undefined;
    if (user.role === 'DOCTOR') {
      const row = db.prepare('SELECT * FROM doctor_profiles WHERE user_id = ?').get(user.id) as any;
      if (row) {
        doctorProfile = {
          ...row,
          working_hours: JSON.parse(row.working_hours),
          is_active: Boolean(row.is_active),
        };
      }
    }

    return { ...user, doctorProfile };
  }
}
