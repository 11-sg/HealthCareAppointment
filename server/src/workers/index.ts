import cron from 'node-cron';
import { env } from '../config/env';
import { SlotService } from '../services/slot.service';
import { EmailService } from '../services/email.service';
import { PrescriptionService } from '../services/prescription.service';
import { db } from '../db/connection';

export class BackgroundWorkerManager {
  private static tasks: cron.ScheduledTask[] = [];

  static startWorkers(): void {
    console.log('[BackgroundWorker] Starting all background workers and cron jobs...');

    // 1. Slot Hold Cleanup (every minute)
    const holdTask = cron.schedule(env.SLOT_HOLD_CLEANUP_CRON, () => {
      try {
        const cleaned = SlotService.cleanupExpiredHolds();
        if (cleaned > 0) {
          console.log(`[SlotHoldWorker] Cleaned up ${cleaned} expired slot holds`);
        }
      } catch (err: any) {
        console.error('[SlotHoldWorker] Error during hold cleanup:', err.message);
      }
    });
    this.tasks.push(holdTask);

    // 2. Email Retry Queue (every 2 minutes)
    const emailTask = cron.schedule(env.EMAIL_RETRY_CRON, async () => {
      try {
        const { processed, succeeded } = await EmailService.processPendingQueue(10);
        if (processed > 0) {
          console.log(`[EmailRetryWorker] Processed ${processed} queued emails (${succeeded} succeeded)`);
        }
      } catch (err: any) {
        console.error('[EmailRetryWorker] Error processing email queue:', err.message);
      }
    });
    this.tasks.push(emailTask);

    // 3. Medication Reminders (every 15 minutes)
    const medicationTask = cron.schedule(env.MEDICATION_REMINDER_CRON, async () => {
      try {
        const sent = await PrescriptionService.processDueMedicationReminders();
        if (sent > 0) {
          console.log(`[MedicationReminderWorker] Dispatched ${sent} medication reminders`);
        }
      } catch (err: any) {
        console.error('[MedicationReminderWorker] Error dispatching reminders:', err.message);
      }
    });
    this.tasks.push(medicationTask);

    // 4. Appointment 24h Pre-Visit Reminders (Hourly)
    const appointmentReminderTask = cron.schedule(env.APPOINTMENT_REMINDER_CRON, async () => {
      try {
        await this.dispatchUpcomingAppointmentReminders();
      } catch (err: any) {
        console.error('[AppointmentReminderWorker] Error dispatching appointment reminders:', err.message);
      }
    });
    this.tasks.push(appointmentReminderTask);

    console.log('[BackgroundWorker] 4 background workers initialized successfully.');
  }

  static stopWorkers(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    console.log('[BackgroundWorker] All background workers stopped.');
  }

  /**
   * Scans for confirmed appointments 24h away and sends reminder emails
   */
  static async dispatchUpcomingAppointmentReminders(): Promise<number> {
    const now = new Date();
    // 24 hours from now (+/- 30 mins)
    const startWindow = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
    const endWindow = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();

    const upcoming = db.prepare(`
      SELECT 
        a.id, a.appointment_number, a.slot_start, a.slot_end, a.symptoms_raw,
        p.name as patient_name, p.email as patient_email,
        d.name as doctor_name, dp.specialization as doctor_specialization
      FROM appointments a
      JOIN users p ON p.id = a.patient_id
      JOIN users d ON d.id = a.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = d.id
      WHERE a.status = 'CONFIRMED'
        AND a.slot_start >= ?
        AND a.slot_start <= ?
    `).all(startWindow, endWindow) as any[];

    let sent = 0;
    for (const appt of upcoming) {
      if (appt.patient_email) {
        EmailService.enqueueEmail({
          recipient_email: appt.patient_email,
          recipient_name: appt.patient_name,
          recipient_role: 'PATIENT',
          type: 'APPOINTMENT_REMINDER',
          subject: `Reminder: Appointment Tomorrow with Dr. ${appt.doctor_name} (#${appt.appointment_number})`,
          body_html: `
            ${EmailService.templateHeader('Upcoming Appointment Reminder')}
              <p>Dear <strong>${appt.patient_name}</strong>,</p>
              <p>This is a friendly reminder that you have an upcoming consultation scheduled for tomorrow with <strong>Dr. ${appt.doctor_name}</strong> (${appt.doctor_specialization || 'Specialist'}).</p>
              
              <div class="card">
                <p><strong>Appointment:</strong> #${appt.appointment_number}</p>
                <p><strong>Time:</strong> ${new Date(appt.slot_start).toLocaleString()}</p>
                <p><strong>Location:</strong> CareFlow Health Center</p>
              </div>

              <p>Please arrive 10 minutes early. If you need to make changes, please reschedule via your patient portal.</p>
            ${EmailService.templateFooter()}
          `,
        });
        sent++;
      }
    }

    return sent;
  }
}
