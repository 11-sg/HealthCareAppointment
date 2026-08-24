import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { MedicationFrequency, MedicationReminder, Prescription } from '../types';
import { EmailService } from './email.service';

export class PrescriptionService {
  /**
   * Creates prescriptions and pre-calculates medication reminder schedule
   */
  static createPrescriptions(params: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    items: Array<{
      medication_name: string;
      dosage: string;
      frequency: MedicationFrequency;
      times_of_day: string[]; // e.g. ["08:00", "20:00"]
      duration_days: number;
      start_date?: string;
      special_instructions?: string;
    }>;
  }): Prescription[] {
    const nowIso = new Date().toISOString();
    const startDate = params.items[0]?.start_date || new Date().toISOString().split('T')[0];

    const createdList: Prescription[] = [];

    const executeInsert = db.transaction(() => {
      for (const item of params.items) {
        const presId = uuidv4();
        const duration = item.duration_days || 7;

        const startObj = new Date(startDate);
        const endObj = new Date(startObj.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
        const endDate = endObj.toISOString().split('T')[0];

        // 1. Insert Prescription
        db.prepare(`
          INSERT INTO prescriptions (
            id, appointment_id, patient_id, doctor_id,
            medication_name, dosage, frequency, times_of_day,
            duration_days, start_date, end_date, special_instructions,
            is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
          presId,
          params.appointmentId,
          params.patientId,
          params.doctorId,
          item.medication_name.trim(),
          item.dosage.trim(),
          item.frequency,
          JSON.stringify(item.times_of_day),
          duration,
          startDate,
          endDate,
          item.special_instructions || '',
          nowIso
        );

        // 2. Generate Medication Reminders for each day and time
        for (let d = 0; d < duration; d++) {
          const currentDayObj = new Date(startObj.getTime() + d * 24 * 60 * 60 * 1000);
          const currentDayStr = currentDayObj.toISOString().split('T')[0];

          for (const timeStr of item.times_of_day) {
            const reminderId = uuidv4();
            const scheduledIso = `${currentDayStr}T${timeStr}:00.000Z`;

            db.prepare(`
              INSERT INTO medication_reminders (
                id, prescription_id, patient_id, scheduled_time, status, created_at
              ) VALUES (?, ?, ?, ?, 'PENDING', ?)
            `).run(reminderId, presId, params.patientId, scheduledIso, nowIso);
          }
        }

        createdList.push({
          id: presId,
          appointment_id: params.appointmentId,
          patient_id: params.patientId,
          doctor_id: params.doctorId,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          times_of_day: item.times_of_day,
          duration_days: duration,
          start_date: startDate,
          end_date: endDate,
          special_instructions: item.special_instructions,
          is_active: true,
          created_at: nowIso,
        });
      }
    });

    executeInsert();
    return createdList;
  }

  /**
   * Gets prescriptions for a patient
   */
  static getPatientPrescriptions(patientId: string): Prescription[] {
    const rows = db.prepare(`
      SELECT p.*, d.name as doctor_name, dp.specialization as doctor_specialization
      FROM prescriptions p
      JOIN users d ON d.id = p.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = d.id
      WHERE p.patient_id = ?
      ORDER BY p.created_at DESC
    `).all(patientId) as any[];

    return rows.map(r => ({
      ...r,
      times_of_day: JSON.parse(r.times_of_day),
      is_active: Boolean(r.is_active),
    }));
  }

  /**
   * Gets prescriptions for an appointment
   */
  static getAppointmentPrescriptions(appointmentId: string): Prescription[] {
    const rows = db.prepare(`
      SELECT * FROM prescriptions
      WHERE appointment_id = ?
      ORDER BY created_at ASC
    `).all(appointmentId) as any[];

    return rows.map(r => ({
      ...r,
      times_of_day: JSON.parse(r.times_of_day),
      is_active: Boolean(r.is_active),
    }));
  }

  /**
   * Acknowledges a medication reminder
   */
  static acknowledgeReminder(reminderId: string, patientId: string): boolean {
    const result = db.prepare(`
      UPDATE medication_reminders
      SET status = 'ACKNOWLEDGED'
      WHERE id = ? AND patient_id = ?
    `).run(reminderId, patientId);

    return result.changes > 0;
  }

  /**
   * Gets today's reminders for a patient
   */
  static getTodayReminders(patientId: string, dateStr?: string): MedicationReminder[] {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const startIso = `${targetDate}T00:00:00.000Z`;
    const endIso = `${targetDate}T23:59:59.999Z`;

    const rows = db.prepare(`
      SELECT mr.*, p.medication_name, p.dosage, p.special_instructions
      FROM medication_reminders mr
      JOIN prescriptions p ON p.id = mr.prescription_id
      WHERE mr.patient_id = ?
        AND mr.scheduled_time >= ?
        AND mr.scheduled_time <= ?
      ORDER BY mr.scheduled_time ASC
    `).all(patientId, startIso, endIso) as any[];

    return rows;
  }

  /**
   * Background Job: Dispatches pending medication reminders due around current time
   */
  static async processDueMedicationReminders(): Promise<number> {
    const now = new Date();
    // Check reminders within +/- 30 minutes window
    const windowStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const dueReminders = db.prepare(`
      SELECT 
        mr.id as reminder_id, mr.scheduled_time,
        p.medication_name, p.dosage, p.special_instructions,
        u.id as patient_id, u.name as patient_name, u.email as patient_email
      FROM medication_reminders mr
      JOIN prescriptions p ON p.id = mr.prescription_id
      JOIN users u ON u.id = mr.patient_id
      WHERE mr.status = 'PENDING'
        AND mr.scheduled_time >= ?
        AND mr.scheduled_time <= ?
    `).all(windowStart, windowEnd) as any[];

    let sentCount = 0;
    const nowIso = new Date().toISOString();

    for (const item of dueReminders) {
      const timeOnly = item.scheduled_time.split('T')[1]?.slice(0, 5) || 'Now';

      if (item.patient_email) {
        EmailService.enqueueEmail({
          recipient_email: item.patient_email,
          recipient_name: item.patient_name,
          recipient_role: 'PATIENT',
          type: 'MEDICATION_REMINDER',
          subject: `Medication Reminder: Take ${item.medication_name} (${item.dosage})`,
          body_html: EmailService.generateMedicationReminderHtml({
            patientName: item.patient_name,
            medicationName: item.medication_name,
            dosage: item.dosage,
            timeOfDay: `${timeOnly} UTC`,
            instructions: item.special_instructions,
          }),
        });
      }

      db.prepare(`
        UPDATE medication_reminders
        SET status = 'SENT', sent_at = ?
        WHERE id = ?
      `).run(nowIso, item.reminder_id);

      sentCount++;
    }

    return sentCount;
  }
}
