import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { Appointment, AppointmentStatus, PreVisitSummary } from '../types';
import { SlotService } from './slot.service';
import { LLMService } from './llm.service';
import { CalendarService } from './calendar.service';
import { EmailService } from './email.service';

export class AppointmentService {
  /**
   * Generates a human-friendly unique appointment reference code
   */
  private static generateAppointmentNumber(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CF-${new Date().getFullYear()}-${random}`;
  }

  /**
   * Books an appointment with atomic concurrency safety and LLM pre-visit analysis
   */
  static async bookAppointment(params: {
    patientId: string;
    doctorId: string;
    slotStart: string;
    slotEnd: string;
    symptoms: string;
    holdToken?: string;
  }): Promise<Appointment> {
    // 1. First trigger slot hold cleanup
    SlotService.cleanupExpiredHolds();

    const nowIso = new Date().toISOString();
    const apptId = uuidv4();
    const apptNumber = this.generateAppointmentNumber();

    // 2. Run LLM Pre-visit Symptom Analysis
    const preVisitSummary: PreVisitSummary = await LLMService.generatePreVisitSummary(params.symptoms);

    // 3. Atomic Database Transaction: Double-Booking Prevention
    const executeBooking = db.transaction(() => {
      // Check doctor leave
      const datePart = params.slotStart.split('T')[0];
      const onLeave = db.prepare(`
        SELECT id, reason FROM doctor_leaves
        WHERE doctor_id = ? 
          AND status = 'APPROVED'
          AND ? >= start_date 
          AND ? <= end_date
      `).get(params.doctorId, datePart, datePart) as any;

      if (onLeave) {
        const err = new Error(`Doctor is on leave on ${datePart} (${onLeave.reason || 'Unavailable'})`);
        (err as any).status = 409;
        throw err;
      }

      // Check existing active appointment (prevents double booking)
      const existingAppt = db.prepare(`
        SELECT id FROM appointments
        WHERE doctor_id = ? 
          AND slot_start = ?
          AND status IN ('CONFIRMED', 'PENDING')
      `).get(params.doctorId, params.slotStart);

      if (existingAppt) {
        const err = new Error('Slot conflict: This slot has already been booked by another patient.');
        (err as any).status = 409;
        throw err;
      }

      // Check slot hold
      if (params.holdToken) {
        const hold = db.prepare(`
          SELECT * FROM slot_holds
          WHERE hold_token = ? 
            AND doctor_id = ? 
            AND slot_start = ?
            AND status = 'ACTIVE'
            AND expires_at > ?
        `).get(params.holdToken, params.doctorId, params.slotStart, nowIso) as any;

        if (hold) {
          // Convert hold
          db.prepare(`
            UPDATE slot_holds 
            SET status = 'CONVERTED' 
            WHERE id = ?
          `).run(hold.id);
        }
      } else {
        // If no hold token provided, ensure no one else is currently holding this slot
        const otherHold = db.prepare(`
          SELECT id FROM slot_holds
          WHERE doctor_id = ?
            AND slot_start = ?
            AND status = 'ACTIVE'
            AND expires_at > ?
            AND patient_id != ?
        `).get(params.doctorId, params.slotStart, nowIso, params.patientId);

        if (otherHold) {
          const err = new Error('Slot is temporarily held by another patient. Please choose a different slot.');
          (err as any).status = 409;
          throw err;
        }
      }

      // Insert Appointment
      db.prepare(`
        INSERT INTO appointments (
          id, appointment_number, patient_id, doctor_id,
          slot_start, slot_end, status, symptoms_raw,
          pre_visit_summary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)
      `).run(
        apptId,
        apptNumber,
        params.patientId,
        params.doctorId,
        params.slotStart,
        params.slotEnd,
        params.symptoms,
        JSON.stringify(preVisitSummary),
        nowIso,
        nowIso
      );
    });

    executeBooking();

    // 4. Fetch full appointment details for calendar & email
    const appt = this.getAppointmentById(apptId);
    if (!appt) throw new Error('Appointment created but failed to load');

    // 5. Create Google Calendar Event
    const calendarResult = await CalendarService.createAppointmentEvent({
      appointmentNumber: appt.appointment_number,
      patientName: appt.patient_name || 'Patient',
      patientEmail: appt.patient_email || '',
      doctorName: appt.doctor_name || 'Doctor',
      doctorEmail: (appt as any).doctor_email,
      specialization: appt.doctor_specialization || 'Healthcare Specialist',
      slotStart: appt.slot_start,
      slotEnd: appt.slot_end,
      symptoms: appt.symptoms_raw,
    });

    // Update appointment with calendar details
    db.prepare(`
      UPDATE appointments 
      SET google_calendar_event_id = ?, google_calendar_link = ?
      WHERE id = ?
    `).run(calendarResult.eventId || null, calendarResult.calendarLink, apptId);

    appt.google_calendar_event_id = calendarResult.eventId;
    appt.google_calendar_link = calendarResult.calendarLink;

    // 6. Enqueue Email Notifications to both Patient and Doctor
    if (appt.patient_email) {
      EmailService.enqueueEmail({
        recipient_email: appt.patient_email,
        recipient_name: appt.patient_name || 'Patient',
        recipient_role: 'PATIENT',
        type: 'BOOKING_CONFIRMATION',
        subject: `Appointment Confirmed with Dr. ${appt.doctor_name} (#${appt.appointment_number})`,
        body_html: EmailService.generateBookingConfirmationHtml({
          recipientName: appt.patient_name || 'Patient',
          doctorName: appt.doctor_name || 'Doctor',
          specialization: appt.doctor_specialization || 'Specialist',
          slotStart: appt.slot_start,
          slotEnd: appt.slot_end,
          appointmentNumber: appt.appointment_number,
          symptoms: appt.symptoms_raw,
          urgencyLevel: preVisitSummary.urgency_level,
          googleCalendarLink: calendarResult.calendarLink,
        }),
      });
    }

    if ((appt as any).doctor_email) {
      EmailService.enqueueEmail({
        recipient_email: (appt as any).doctor_email,
        recipient_name: `Dr. ${appt.doctor_name}`,
        recipient_role: 'DOCTOR',
        type: 'BOOKING_CONFIRMATION',
        subject: `New Appointment: ${appt.patient_name} (#${appt.appointment_number})`,
        body_html: EmailService.generateBookingConfirmationHtml({
          recipientName: `Dr. ${appt.doctor_name}`,
          doctorName: appt.doctor_name || 'Doctor',
          specialization: appt.doctor_specialization || 'Specialist',
          slotStart: appt.slot_start,
          slotEnd: appt.slot_end,
          appointmentNumber: appt.appointment_number,
          symptoms: appt.symptoms_raw,
          urgencyLevel: preVisitSummary.urgency_level,
          googleCalendarLink: calendarResult.calendarLink,
        }),
      });
    }

    return appt;
  }

  /**
   * Reschedules an appointment to a new slot
   */
  static async rescheduleAppointment(params: {
    appointmentId: string;
    newSlotStart: string;
    newSlotEnd: string;
    userId: string;
    userRole: string;
  }): Promise<Appointment> {
    const existing = this.getAppointmentById(params.appointmentId);
    if (!existing) {
      const err = new Error('Appointment not found');
      (err as any).status = 404;
      throw err;
    }

    if (params.userRole === 'PATIENT' && existing.patient_id !== params.userId) {
      const err = new Error('Unauthorized to reschedule this appointment');
      (err as any).status = 403;
      throw err;
    }

    const nowIso = new Date().toISOString();

    const executeReschedule = db.transaction(() => {
      // Check if new slot has conflicting booking
      const conflict = db.prepare(`
        SELECT id FROM appointments
        WHERE doctor_id = ? 
          AND slot_start = ?
          AND id != ?
          AND status IN ('CONFIRMED', 'PENDING')
      `).get(existing.doctor_id, params.newSlotStart, existing.id);

      if (conflict) {
        const err = new Error('The selected new slot is already booked');
        (err as any).status = 409;
        throw err;
      }

      db.prepare(`
        UPDATE appointments
        SET slot_start = ?, slot_end = ?, status = 'CONFIRMED', updated_at = ?
        WHERE id = ?
      `).run(params.newSlotStart, params.newSlotEnd, nowIso, params.appointmentId);
    });

    executeReschedule();

    // Update Calendar event if exists
    if (existing.google_calendar_event_id) {
      CalendarService.updateAppointmentEvent({
        eventId: existing.google_calendar_event_id,
        slotStart: params.newSlotStart,
        slotEnd: params.newSlotEnd,
      });
    }

    const updated = this.getAppointmentById(params.appointmentId)!;

    // Enqueue Reschedule notification
    if (updated.patient_email) {
      EmailService.enqueueEmail({
        recipient_email: updated.patient_email,
        recipient_name: updated.patient_name || 'Patient',
        recipient_role: 'PATIENT',
        type: 'APPOINTMENT_RESCHEDULE',
        subject: `Appointment Rescheduled: Dr. ${updated.doctor_name} (#${updated.appointment_number})`,
        body_html: EmailService.generateBookingConfirmationHtml({
          recipientName: updated.patient_name || 'Patient',
          doctorName: updated.doctor_name || 'Doctor',
          specialization: updated.doctor_specialization || 'Specialist',
          slotStart: updated.slot_start,
          slotEnd: updated.slot_end,
          appointmentNumber: updated.appointment_number,
          symptoms: updated.symptoms_raw,
          urgencyLevel: updated.pre_visit_summary?.urgency_level || 'Medium',
          googleCalendarLink: updated.google_calendar_link,
        }),
      });
    }

    return updated;
  }

  /**
   * Cancels an appointment
   */
  static async cancelAppointment(params: {
    appointmentId: string;
    userId: string;
    userRole: string;
    reason?: string;
  }): Promise<Appointment> {
    const existing = this.getAppointmentById(params.appointmentId);
    if (!existing) {
      const err = new Error('Appointment not found');
      (err as any).status = 404;
      throw err;
    }

    let newStatus: AppointmentStatus = 'CANCELLED_BY_PATIENT';
    if (params.userRole === 'DOCTOR') newStatus = 'CANCELLED_BY_DOCTOR';
    if (params.userRole === 'ADMIN') newStatus = 'CANCELLED_BY_DOCTOR';

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE appointments
      SET status = ?, cancellation_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, params.reason || 'Cancelled by user request', nowIso, params.appointmentId);

    if (existing.google_calendar_event_id) {
      CalendarService.deleteAppointmentEvent(existing.google_calendar_event_id);
    }

    const updated = this.getAppointmentById(params.appointmentId)!;

    // Notify patient
    if (updated.patient_email) {
      EmailService.enqueueEmail({
        recipient_email: updated.patient_email,
        recipient_name: updated.patient_name || 'Patient',
        recipient_role: 'PATIENT',
        type: 'APPOINTMENT_CANCELLATION',
        subject: `Appointment Cancelled: #${updated.appointment_number}`,
        body_html: `
          ${EmailService.templateHeader('Appointment Cancelled')}
            <p>Dear <strong>${updated.patient_name}</strong>,</p>
            <p>Your appointment with Dr. <strong>${updated.doctor_name}</strong> scheduled for <strong>${new Date(updated.slot_start).toLocaleString()}</strong> has been cancelled.</p>
            <p><strong>Reason:</strong> ${params.reason || 'Cancelled upon request'}</p>
            <p>You may book a new slot anytime through your patient portal.</p>
          ${EmailService.templateFooter()}
        `,
      });
    }

    return updated;
  }

  /**
   * Retrieves single appointment with parsed summaries
   */
  static getAppointmentById(id: string): Appointment | null {
    const row = db.prepare(`
      SELECT 
        a.*,
        p.name as patient_name,
        p.email as patient_email,
        p.phone as patient_phone,
        d.name as doctor_name,
        d.email as doctor_email,
        dp.specialization as doctor_specialization
      FROM appointments a
      JOIN users p ON p.id = a.patient_id
      JOIN users d ON d.id = a.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = d.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!row) return null;

    return this.mapAppointmentRow(row);
  }

  /**
   * Gets appointments for a patient
   */
  static getPatientAppointments(patientId: string): Appointment[] {
    const rows = db.prepare(`
      SELECT 
        a.*,
        p.name as patient_name,
        p.email as patient_email,
        p.phone as patient_phone,
        d.name as doctor_name,
        d.email as doctor_email,
        dp.specialization as doctor_specialization
      FROM appointments a
      JOIN users p ON p.id = a.patient_id
      JOIN users d ON d.id = a.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = d.id
      WHERE a.patient_id = ?
      ORDER BY a.slot_start DESC
    `).all(patientId) as any[];

    return rows.map(r => this.mapAppointmentRow(r));
  }

  /**
   * Gets appointments for a doctor
   */
  static getDoctorAppointments(doctorId: string, dateStr?: string): Appointment[] {
    let query = `
      SELECT 
        a.*,
        p.name as patient_name,
        p.email as patient_email,
        p.phone as patient_phone,
        d.name as doctor_name,
        d.email as doctor_email,
        dp.specialization as doctor_specialization
      FROM appointments a
      JOIN users p ON p.id = a.patient_id
      JOIN users d ON d.id = a.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = d.id
      WHERE a.doctor_id = ?
    `;
    const params: any[] = [doctorId];

    if (dateStr) {
      query += ` AND a.slot_start >= ? AND a.slot_start <= ?`;
      params.push(`${dateStr}T00:00:00.000Z`, `${dateStr}T23:59:59.999Z`);
    }

    query += ` ORDER BY a.slot_start ASC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => this.mapAppointmentRow(r));
  }

  /**
   * Admin: Gets all clinic appointments with optional filters
   */
  static getAllAppointments(filters?: { status?: string; doctorId?: string; date?: string }): Appointment[] {
    let query = `
      SELECT 
        a.*,
        p.name as patient_name,
        p.email as patient_email,
        p.phone as patient_phone,
        d.name as doctor_name,
        d.email as doctor_email,
        dp.specialization as doctor_specialization
      FROM appointments a
      JOIN users p ON p.id = a.patient_id
      JOIN users d ON d.id = a.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ` AND a.status = ?`;
      params.push(filters.status);
    }
    if (filters?.doctorId) {
      query += ` AND a.doctor_id = ?`;
      params.push(filters.doctorId);
    }
    if (filters?.date) {
      query += ` AND a.slot_start >= ? AND a.slot_start <= ?`;
      params.push(`${filters.date}T00:00:00.000Z`, `${filters.date}T23:59:59.999Z`);
    }

    query += ` ORDER BY a.slot_start DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => this.mapAppointmentRow(r));
  }

  private static mapAppointmentRow(row: any): Appointment {
    return {
      id: row.id,
      appointment_number: row.appointment_number,
      patient_id: row.patient_id,
      doctor_id: row.doctor_id,
      patient_name: row.patient_name,
      patient_email: row.patient_email,
      patient_phone: row.patient_phone,
      doctor_name: row.doctor_name,
      doctor_specialization: row.doctor_specialization,
      slot_start: row.slot_start,
      slot_end: row.slot_end,
      status: row.status,
      cancellation_reason: row.cancellation_reason,
      symptoms_raw: row.symptoms_raw,
      pre_visit_summary: row.pre_visit_summary ? JSON.parse(row.pre_visit_summary) : undefined,
      clinical_notes: row.clinical_notes,
      diagnosis: row.diagnosis,
      post_visit_summary: row.post_visit_summary ? JSON.parse(row.post_visit_summary) : undefined,
      google_calendar_event_id: row.google_calendar_event_id,
      google_calendar_link: row.google_calendar_link,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
