import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { env } from '../config/env';
import { NotificationQueueItem, NotificationType, UserRole } from '../types';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (env.EMAIL_SERVICE_MODE === 'smtp' && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    // Automatically initialize Ethereal test account for seamless testing
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[EmailService] Ethereal test mailbox active: ${testAccount.user}`);
    } catch (err) {
      console.warn('[EmailService] Failed to create Ethereal account, falling back to mock json transport');
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  return transporter;
}

export class EmailService {
  /**
   * Enqueues an email into the database notification queue
   */
  static enqueueEmail(params: {
    recipient_email: string;
    recipient_name: string;
    recipient_role: UserRole;
    type: NotificationType;
    subject: string;
    body_html: string;
    body_text?: string;
    metadata?: Record<string, any>;
  }): string {
    const queueId = uuidv4();
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO notification_queue (
        id, recipient_email, recipient_name, recipient_role, type,
        subject, body_html, body_text, status, retry_count, max_retries,
        next_retry_at, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, 3, ?, ?, ?)
    `).run(
      queueId,
      params.recipient_email,
      params.recipient_name,
      params.recipient_role,
      params.type,
      params.subject,
      params.body_html,
      params.body_text || '',
      nowIso,
      params.metadata ? JSON.stringify(params.metadata) : null,
      nowIso
    );

    // Trigger immediate asynchronous dispatch attempt
    this.processQueueItem(queueId).catch(err => {
      console.warn(`[EmailService] Async initial dispatch for ${queueId} deferred to retry worker:`, err.message);
    });

    return queueId;
  }

  /**
   * Processes a single queued email item
   */
  static async processQueueItem(queueId: string): Promise<boolean> {
    const item = db.prepare('SELECT * FROM notification_queue WHERE id = ?').get(queueId) as any;
    if (!item || item.status === 'SENT') return true;

    const currentRetry = item.retry_count || 0;
    const maxRetries = item.max_retries || 3;

    try {
      const mailTransporter = await getTransporter();

      const info = await mailTransporter.sendMail({
        from: env.EMAIL_FROM,
        to: `"${item.recipient_name}" <${item.recipient_email}>`,
        subject: item.subject,
        text: item.body_text || '',
        html: item.body_html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      const sentAt = new Date().toISOString();

      db.prepare(`
        UPDATE notification_queue
        SET status = 'SENT', sent_at = ?, last_error = ?
        WHERE id = ?
      `).run(sentAt, previewUrl ? `Preview: ${previewUrl}` : null, queueId);

      if (previewUrl) {
        console.log(`[EmailService] Email sent (${item.type}) to ${item.recipient_email} | Ethereal Preview: ${previewUrl}`);
      } else {
        console.log(`[EmailService] Email sent (${item.type}) to ${item.recipient_email}`);
      }

      return true;
    } catch (error: any) {
      const nextRetryCount = currentRetry + 1;
      const isFinalFail = nextRetryCount >= maxRetries;
      
      // Exponential backoff: 1min, 5min, 15min
      const backoffMinutes = [1, 5, 15][Math.min(currentRetry, 2)] || 15;
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

      db.prepare(`
        UPDATE notification_queue
        SET status = ?, retry_count = ?, last_error = ?, next_retry_at = ?
        WHERE id = ?
      `).run(
        isFinalFail ? 'FAILED' : 'PENDING',
        nextRetryCount,
        error.message || 'Send error',
        nextRetryAt,
        queueId
      );

      console.error(`[EmailService] Failed sending queue ${queueId} (attempt ${nextRetryCount}/${maxRetries}):`, error.message);
      return false;
    }
  }

  /**
   * Worker job: Processes pending/retrying emails in the queue
   */
  static async processPendingQueue(batchSize: number = 10): Promise<{ processed: number; succeeded: number }> {
    const nowIso = new Date().toISOString();
    const pendingItems = db.prepare(`
      SELECT id FROM notification_queue
      WHERE status = 'PENDING' AND next_retry_at <= ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(nowIso, batchSize) as { id: string }[];

    let succeeded = 0;
    for (const item of pendingItems) {
      const ok = await this.processQueueItem(item.id);
      if (ok) succeeded++;
    }

    return { processed: pendingItems.length, succeeded };
  }

  // ============================================================================
  // HTML Email Templates
  // ============================================================================

  static templateHeader(title: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #0d9488, #0f766e); padding: 28px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 28px; font-size: 15px; line-height: 1.6; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .badge-high { background: #fee2e2; color: #b91c1c; }
          .badge-med { background: #fef3c7; color: #b45309; }
          .badge-low { background: #dcfce7; color: #15803d; }
          .card { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #0d9488; }
          .button { display: inline-block; background: #0d9488; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; text-align: center; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CareFlow Health</h1>
            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${title}</p>
          </div>
          <div class="content">
    `;
  }

  static templateFooter(): string {
    return `
          </div>
          <div class="footer">
            <p>CareFlow Clinic Healthcare Management Platform</p>
            <p>This is an automated operational notification. For emergency assistance, please dial your local emergency services.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Booking confirmation template
   */
  static generateBookingConfirmationHtml(params: {
    recipientName: string;
    doctorName: string;
    specialization: string;
    slotStart: string;
    slotEnd: string;
    appointmentNumber: string;
    symptoms: string;
    urgencyLevel: string;
    googleCalendarLink?: string;
  }): string {
    const startFormatted = new Date(params.slotStart).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const badgeClass =
      params.urgencyLevel === 'High' ? 'badge-high' : params.urgencyLevel === 'Medium' ? 'badge-med' : 'badge-low';

    return `
      ${this.templateHeader('Appointment Confirmation')}
        <p>Dear <strong>${params.recipientName}</strong>,</p>
        <p>Your appointment has been successfully scheduled and confirmed.</p>
        
        <div class="card">
          <p style="margin: 0 0 8px 0;"><strong>Appointment Reference:</strong> <code>#${params.appointmentNumber}</code></p>
          <p style="margin: 0 0 8px 0;"><strong>Doctor:</strong> Dr. ${params.doctorName} (${params.specialization})</p>
          <p style="margin: 0 0 8px 0;"><strong>Date & Time:</strong> ${startFormatted}</p>
          <p style="margin: 0;"><strong>Triage Urgency:</strong> <span class="badge ${badgeClass}">${params.urgencyLevel}</span></p>
        </div>

        <p><strong>Reported Symptoms:</strong></p>
        <blockquote style="margin: 0 0 16px 0; padding-left: 12px; border-left: 3px solid #cbd5e1; color: #475569;">
          ${params.symptoms}
        </blockquote>

        ${
          params.googleCalendarLink
            ? `<div style="text-align: center;">
                <a href="${params.googleCalendarLink}" target="_blank" class="button">📅 Add to Google Calendar</a>
               </div>`
            : ''
        }

        <p>If you need to reschedule or cancel your appointment, please visit your patient portal at least 2 hours in advance.</p>
      ${this.templateFooter()}
    `;
  }

  /**
   * Doctor leave alert template (for affected patients)
   */
  static generateDoctorLeaveAlertHtml(params: {
    patientName: string;
    doctorName: string;
    appointmentNumber: string;
    slotStart: string;
    leaveReason: string;
    rescheduleLink: string;
  }): string {
    const startFormatted = new Date(params.slotStart).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      ${this.templateHeader('Urgent: Schedule Update Regarding Your Appointment')}
        <p>Dear <strong>${params.patientName}</strong>,</p>
        <p>We are writing to inform you that <strong>Dr. ${params.doctorName}</strong> is unexpectedly on approved medical/personal leave and is unavailable on <strong>${startFormatted}</strong>.</p>
        
        <div class="card" style="border-left-color: #f59e0b; background-color: #fffbeb;">
          <p style="margin: 0 0 8px 0; color: #92400e;"><strong>Affected Appointment:</strong> #${params.appointmentNumber}</p>
          <p style="margin: 0 0 8px 0; color: #92400e;"><strong>Original Time:</strong> ${startFormatted}</p>
          <p style="margin: 0; color: #92400e;"><strong>Notice Reason:</strong> ${params.leaveReason || 'Doctor unavailability / Leave'}</p>
        </div>

        <p>To ensure continuity of your care, your slot has been placed on priority reschedule status. You can instantly select a new convenient time slot or an alternate specialist below:</p>

        <div style="text-align: center;">
          <a href="${params.rescheduleLink}" class="button" style="background: #0284c7;">🔄 Priority Reschedule Now</a>
        </div>

        <p>We sincerely apologize for any inconvenience caused and are here to support your health journey.</p>
      ${this.templateFooter()}
    `;
  }

  /**
   * Medication reminder template
   */
  static generateMedicationReminderHtml(params: {
    patientName: string;
    medicationName: string;
    dosage: string;
    timeOfDay: string;
    instructions: string;
  }): string {
    return `
      ${this.templateHeader('Medication Reminder')}
        <p>Dear <strong>${params.patientName}</strong>,</p>
        <p>This is your friendly reminder from CareFlow Health to take your prescribed medication:</p>
        
        <div class="card" style="border-left-color: #6366f1;">
          <h3 style="margin: 0 0 8px 0; color: #4338ca;">💊 ${params.medicationName} (${params.dosage})</h3>
          <p style="margin: 0 0 6px 0;"><strong>Scheduled Time:</strong> ${params.timeOfDay}</p>
          ${params.instructions ? `<p style="margin: 0;"><strong>Instructions:</strong> ${params.instructions}</p>` : ''}
        </div>

        <p>Taking your medications on schedule is essential for the effectiveness of your treatment plan. Please mark this dose as taken in your CareFlow Patient Tracker.</p>
      ${this.templateFooter()}
    `;
  }

  /**
   * Post-visit summary template
   */
  static generatePostVisitSummaryHtml(params: {
    patientName: string;
    doctorName: string;
    appointmentNumber: string;
    diagnosis: string;
    patientFriendlySummary: string;
    followUpSteps: string[];
  }): string {
    const stepsList = params.followUpSteps.map(s => `<li>${s}</li>`).join('');

    return `
      ${this.templateHeader('Post-Visit Care Plan & Summary')}
        <p>Dear <strong>${params.patientName}</strong>,</p>
        <p>Thank you for visiting Dr. <strong>${params.doctorName}</strong>. Below is your patient-friendly consultation summary and post-visit action plan.</p>
        
        <div class="card">
          <p style="margin: 0 0 8px 0;"><strong>Appointment:</strong> #${params.appointmentNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Diagnosis:</strong> ${params.diagnosis || 'Clinical evaluation'}</p>
          <p style="margin: 0;"><strong>Doctor's Notes & Summary:</strong></p>
          <p style="margin: 6px 0 0 0; color: #334155;">${params.patientFriendlySummary}</p>
        </div>

        ${
          params.followUpSteps.length > 0
            ? `<h3>Recommended Follow-up Steps:</h3>
               <ul style="padding-left: 20px; line-height: 1.8;">${stepsList}</ul>`
            : ''
        }

        <p>Log in to your patient portal anytime to view your full prescription details, medication schedule, and reminder checklist.</p>
      ${this.templateFooter()}
    `;
  }
}
