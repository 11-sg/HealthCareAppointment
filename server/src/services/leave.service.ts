import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { DoctorLeave } from '../types';
import { CalendarService } from './calendar.service';
import { EmailService } from './email.service';
import { env } from '../config/env';

export class LeaveService {
  /**
   * Records a doctor leave and automatically cancels/notifies affected patients
   */
  static async createLeave(params: {
    doctorId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    reason: string;
  }): Promise<{ leave: DoctorLeave; affectedCount: number; affectedAppointments: any[] }> {
    const leaveId = uuidv4();
    const nowIso = new Date().toISOString();

    const startIso = `${params.startDate}T00:00:00.000Z`;
    const endIso = `${params.endDate}T23:59:59.999Z`;

    // 1. Query all active conflicting appointments
    const affectedAppointments = db.prepare(`
      SELECT 
        a.id, a.appointment_number, a.slot_start, a.slot_end, a.google_calendar_event_id,
        p.id as patient_id, p.name as patient_name, p.email as patient_email,
        d.name as doctor_name
      FROM appointments a
      JOIN users p ON p.id = a.patient_id
      JOIN users d ON d.id = a.doctor_id
      WHERE a.doctor_id = ? 
        AND a.status IN ('CONFIRMED', 'PENDING')
        AND a.slot_start >= ? 
        AND a.slot_start <= ?
    `).all(params.doctorId, startIso, endIso) as any[];

    // 2. Atomic Transaction: Record Leave & Update Affected Bookings
    const executeLeave = db.transaction(() => {
      // Insert leave
      db.prepare(`
        INSERT INTO doctor_leaves (id, doctor_id, start_date, end_date, reason, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'APPROVED', ?)
      `).run(
        leaveId,
        params.doctorId,
        params.startDate,
        params.endDate,
        params.reason.trim(),
        nowIso
      );

      // Cancel affected appointments
      if (affectedAppointments.length > 0) {
        const cancelReason = `Doctor on scheduled leave: ${params.reason.trim()}`;
        const stmt = db.prepare(`
          UPDATE appointments 
          SET status = 'CANCELLED_DUE_TO_LEAVE', cancellation_reason = ?, updated_at = ?
          WHERE id = ?
        `);

        for (const appt of affectedAppointments) {
          stmt.run(cancelReason, nowIso, appt.id);
        }
      }
    });

    executeLeave();

    // 3. Process Calendar Deletions & Patient Email Notifications
    for (const appt of affectedAppointments) {
      if (appt.google_calendar_event_id) {
        CalendarService.deleteAppointmentEvent(appt.google_calendar_event_id);
      }

      if (appt.patient_email) {
        const rescheduleUrl = `${env.CLIENT_URL}/patient/book?doctorId=${params.doctorId}&rescheduleApptId=${appt.id}`;

        EmailService.enqueueEmail({
          recipient_email: appt.patient_email,
          recipient_name: appt.patient_name,
          recipient_role: 'PATIENT',
          type: 'DOCTOR_LEAVE_ALERT',
          subject: `Important: Schedule Change for Dr. ${appt.doctor_name} (#${appt.appointment_number})`,
          body_html: EmailService.generateDoctorLeaveAlertHtml({
            patientName: appt.patient_name,
            doctorName: appt.doctor_name,
            appointmentNumber: appt.appointment_number,
            slotStart: appt.slot_start,
            leaveReason: params.reason,
            rescheduleLink: rescheduleUrl,
          }),
        });
      }
    }

    const leave = db.prepare(`
      SELECT dl.*, u.name as doctor_name
      FROM doctor_leaves dl
      JOIN users u ON u.id = dl.doctor_id
      WHERE dl.id = ?
    `).get(leaveId) as DoctorLeave;

    return {
      leave: { ...leave, affected_appointments_count: affectedAppointments.length },
      affectedCount: affectedAppointments.length,
      affectedAppointments,
    };
  }

  /**
   * Gets all leaves for a doctor
   */
  static getDoctorLeaves(doctorId: string): DoctorLeave[] {
    const rows = db.prepare(`
      SELECT dl.*, u.name as doctor_name
      FROM doctor_leaves dl
      JOIN users u ON u.id = dl.doctor_id
      WHERE dl.doctor_id = ?
      ORDER BY dl.start_date DESC
    `).all(doctorId) as any[];

    return rows;
  }

  /**
   * Admin: Gets all clinic leaves
   */
  static getAllLeaves(): DoctorLeave[] {
    const rows = db.prepare(`
      SELECT dl.*, u.name as doctor_name
      FROM doctor_leaves dl
      JOIN users u ON u.id = dl.doctor_id
      ORDER BY dl.start_date DESC
    `).all() as any[];

    return rows;
  }

  /**
   * Deletes/cancels a leave
   */
  static deleteLeave(leaveId: string, doctorId: string, userRole: string): boolean {
    let stmt;
    if (userRole === 'ADMIN') {
      stmt = db.prepare('DELETE FROM doctor_leaves WHERE id = ?');
      return stmt.run(leaveId).changes > 0;
    } else {
      stmt = db.prepare('DELETE FROM doctor_leaves WHERE id = ? AND doctor_id = ?');
      return stmt.run(leaveId, doctorId).changes > 0;
    }
  }
}
