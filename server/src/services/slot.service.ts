import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { env } from '../config/env';
import { DoctorProfile, SlotAvailability, SlotHold, WorkingHoursSchedule } from '../types';

export class SlotService {
  /**
   * Cleans up expired slot holds
   */
  static cleanupExpiredHolds(): number {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE slot_holds 
      SET status = 'EXPIRED' 
      WHERE status = 'ACTIVE' AND expires_at < ?
    `).run(now);
    return result.changes;
  }

  /**
   * Generates all available slots for a given doctor on a given date (YYYY-MM-DD)
   */
  static getSlotsForDoctorAndDate(
    doctorId: string,
    dateStr: string, // "YYYY-MM-DD"
    currentPatientId?: string
  ): { slots: SlotAvailability[]; doctor: DoctorProfile; isLeaveDay: boolean; leaveReason?: string } {
    // 1. First trigger a quick lazy cleanup of expired holds
    this.cleanupExpiredHolds();

    // 2. Fetch doctor profile
    const profileRow = db.prepare(`
      SELECT dp.*, u.name, u.email, u.phone, u.avatar_url
      FROM doctor_profiles dp
      JOIN users u ON u.id = dp.user_id
      WHERE dp.user_id = ? AND dp.is_active = 1
    `).get(doctorId) as any;

    if (!profileRow) {
      const err = new Error('Doctor profile not found or inactive');
      (err as any).status = 404;
      throw err;
    }

    const workingHours: WorkingHoursSchedule = JSON.parse(profileRow.working_hours);
    const slotDuration = profileRow.slot_duration_minutes || 30;

    const doctorProfile: DoctorProfile = {
      ...profileRow,
      working_hours: workingHours,
      is_active: Boolean(profileRow.is_active),
    };

    // 3. Check if doctor is on leave on this date
    const leaveRow = db.prepare(`
      SELECT * FROM doctor_leaves
      WHERE doctor_id = ? 
        AND status = 'APPROVED'
        AND ? >= start_date 
        AND ? <= end_date
    `).get(doctorId, dateStr, dateStr) as any;

    if (leaveRow) {
      return {
        slots: [],
        doctor: doctorProfile,
        isLeaveDay: true,
        leaveReason: leaveRow.reason || 'Doctor is on scheduled leave',
      };
    }

    // 4. Determine day of week
    const targetDate = new Date(`${dateStr}T00:00:00Z`);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayNames[targetDate.getUTCDay()];

    const daySchedule = workingHours[dayOfWeek];
    if (!daySchedule || !daySchedule.is_available) {
      return {
        slots: [],
        doctor: doctorProfile,
        isLeaveDay: false,
      };
    }

    // 5. Generate daily slot intervals
    const [startH, startM] = daySchedule.start.split(':').map(Number);
    const [endH, endM] = daySchedule.end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // 6. Fetch existing confirmed/pending appointments for this date
    const dayStartIso = `${dateStr}T00:00:00.000Z`;
    const dayEndIso = `${dateStr}T23:59:59.999Z`;

    const existingAppointments = db.prepare(`
      SELECT slot_start, slot_end 
      FROM appointments
      WHERE doctor_id = ? 
        AND status IN ('CONFIRMED', 'PENDING')
        AND slot_start >= ? 
        AND slot_start <= ?
    `).all(doctorId, dayStartIso, dayEndIso) as { slot_start: string; slot_end: string }[];

    const bookedSlotsSet = new Set(existingAppointments.map(a => a.slot_start));

    // 7. Fetch active slot holds
    const nowIso = new Date().toISOString();
    const activeHolds = db.prepare(`
      SELECT slot_start, patient_id, expires_at
      FROM slot_holds
      WHERE doctor_id = ?
        AND status = 'ACTIVE'
        AND expires_at > ?
        AND slot_start >= ?
        AND slot_start <= ?
    `).all(doctorId, nowIso, dayStartIso, dayEndIso) as { slot_start: string; patient_id: string; expires_at: string }[];

    const holdsMap = new Map<string, { patient_id: string; expires_at: string }>();
    for (const h of activeHolds) {
      holdsMap.set(h.slot_start, { patient_id: h.patient_id, expires_at: h.expires_at });
    }

    // 8. Construct slot list
    const slots: SlotAvailability[] = [];

    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      const slotH = Math.floor(m / 60);
      const slotMin = m % 60;
      const endSlotH = Math.floor((m + slotDuration) / 60);
      const endSlotMin = (m + slotDuration) % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const slotStartStr = `${dateStr}T${pad(slotH)}:${pad(slotMin)}:00.000Z`;
      const slotEndStr = `${dateStr}T${pad(endSlotH)}:${pad(endSlotMin)}:00.000Z`;

      const isBooked = bookedSlotsSet.has(slotStartStr);
      const hold = holdsMap.get(slotStartStr);

      let isAvailable = true;
      let status: SlotAvailability['status'] = 'AVAILABLE';
      let heldByCurrentUser = false;
      let holdExpiresAt: string | undefined;

      if (isBooked) {
        isAvailable = false;
        status = 'BOOKED';
      } else if (hold) {
        if (currentPatientId && hold.patient_id === currentPatientId) {
          isAvailable = true;
          status = 'HELD';
          heldByCurrentUser = true;
          holdExpiresAt = hold.expires_at;
        } else {
          isAvailable = false;
          status = 'HELD';
          heldByCurrentUser = false;
          holdExpiresAt = hold.expires_at;
        }
      }

      slots.push({
        slot_start: slotStartStr,
        slot_end: slotEndStr,
        is_available: isAvailable,
        status,
        held_by_current_user: heldByCurrentUser,
        hold_expires_at: holdExpiresAt,
      });
    }

    return {
      slots,
      doctor: doctorProfile,
      isLeaveDay: false,
    };
  }

  /**
   * Places an atomic temporary hold on a slot (TTL = SLOT_HOLD_DURATION_MINUTES)
   */
  static holdSlot(params: {
    doctorId: string;
    patientId: string;
    slotStart: string;
    slotEnd: string;
  }): { holdToken: string; expiresAt: string; holdId: string } {
    this.cleanupExpiredHolds();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.SLOT_HOLD_DURATION_MINUTES * 60 * 1000).toISOString();
    const holdToken = uuidv4();
    const holdId = uuidv4();

    // Use transactional immediate check-and-insert to prevent race conditions
    const performHold = db.transaction(() => {
      // 1. Check if doctor is on leave
      const datePart = params.slotStart.split('T')[0];
      const onLeave = db.prepare(`
        SELECT id FROM doctor_leaves
        WHERE doctor_id = ? 
          AND status = 'APPROVED'
          AND ? >= start_date 
          AND ? <= end_date
      `).get(params.doctorId, datePart, datePart);

      if (onLeave) {
        const err = new Error('Cannot hold slot: Doctor is on approved leave for this date');
        (err as any).status = 409;
        throw err;
      }

      // 2. Check if already booked
      const existingAppt = db.prepare(`
        SELECT id FROM appointments
        WHERE doctor_id = ? 
          AND slot_start = ?
          AND status IN ('CONFIRMED', 'PENDING')
      `).get(params.doctorId, params.slotStart);

      if (existingAppt) {
        const err = new Error('Slot conflict: This slot has already been booked by another patient');
        (err as any).status = 409;
        throw err;
      }

      // 3. Check if currently held by someone else
      const activeHold = db.prepare(`
        SELECT id, patient_id, expires_at FROM slot_holds
        WHERE doctor_id = ?
          AND slot_start = ?
          AND status = 'ACTIVE'
          AND expires_at > ?
      `).get(params.doctorId, params.slotStart, now.toISOString()) as any;

      if (activeHold) {
        if (activeHold.patient_id === params.patientId) {
          // If held by the same patient, extend or return existing hold
          db.prepare(`
            UPDATE slot_holds 
            SET expires_at = ?, hold_token = ?
            WHERE id = ?
          `).run(expiresAt, holdToken, activeHold.id);

          return { holdToken, expiresAt, holdId: activeHold.id };
        } else {
          const err = new Error('Slot conflict: This slot is currently being held by another patient. Please choose a different slot or wait a few minutes.');
          (err as any).status = 409;
          throw err;
        }
      }

      // 4. Release any existing holds by this patient for other slots to be courteous
      db.prepare(`
        UPDATE slot_holds 
        SET status = 'RELEASED'
        WHERE patient_id = ? AND status = 'ACTIVE'
      `).run(params.patientId);

      // 5. Insert new hold
      db.prepare(`
        INSERT INTO slot_holds (id, doctor_id, patient_id, slot_start, slot_end, hold_token, expires_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
      `).run(
        holdId,
        params.doctorId,
        params.patientId,
        params.slotStart,
        params.slotEnd,
        holdToken,
        expiresAt,
        now.toISOString()
      );

      return { holdToken, expiresAt, holdId };
    });

    return performHold();
  }

  /**
   * Releases an active hold
   */
  static releaseHold(holdToken: string, patientId: string): boolean {
    const result = db.prepare(`
      UPDATE slot_holds 
      SET status = 'RELEASED'
      WHERE hold_token = ? AND patient_id = ? AND status = 'ACTIVE'
    `).run(holdToken, patientId);

    return result.changes > 0;
  }
}
