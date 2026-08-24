import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import { LLMService } from '../services/llm.service';
import { PrescriptionService } from '../services/prescription.service';
import { EmailService } from '../services/email.service';
import { AppointmentService } from '../services/appointment.service';

const prescriptionItemSchema = z.object({
  medication_name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.enum([
    'ONCE_DAILY',
    'TWICE_DAILY',
    'THRICE_DAILY',
    'FOUR_TIMES_DAILY',
    'EVERY_8_HOURS',
    'EVERY_12_HOURS',
    'AS_NEEDED',
  ]),
  times_of_day: z.array(z.string()).min(1, 'At least one time of day is required'),
  duration_days: z.number().min(1).default(7),
  special_instructions: z.string().optional(),
});

const completeConsultationSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  clinicalNotes: z.string().min(3, 'Clinical notes must be at least 3 characters'),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  prescriptions: z.array(prescriptionItemSchema).optional().default([]),
});

const previewSummarySchema = z.object({
  clinicalNotes: z.string().min(1, 'Clinical notes are required'),
  diagnosis: z.string().optional(),
});

export class ConsultationController {
  static async previewPostVisitSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = previewSummarySchema.parse(req.body);
      const summary = await LLMService.generatePostVisitSummary(validated.clinicalNotes, validated.diagnosis);
      res.status(200).json({ summary });
    } catch (err) {
      next(err);
    }
  }

  static async completeConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || (req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN')) {
        res.status(403).json({ error: 'Only doctors can complete consultations' });
        return;
      }

      const validated = completeConsultationSchema.parse(req.body);
      const appt = AppointmentService.getAppointmentById(validated.appointmentId);

      if (!appt) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      if (req.user.role === 'DOCTOR' && appt.doctor_id !== req.user.id) {
        res.status(403).json({ error: 'Unauthorized to complete another doctor’s appointment' });
        return;
      }

      // 1. Generate patient-friendly post-visit summary via LLM (with graceful fallback)
      const postVisitSummary = await LLMService.generatePostVisitSummary(
        validated.clinicalNotes,
        validated.diagnosis
      );

      const nowIso = new Date().toISOString();

      // 2. Save Clinical Notes & Post Visit Summary to Appointment
      db.prepare(`
        UPDATE appointments
        SET 
          clinical_notes = ?,
          diagnosis = ?,
          post_visit_summary = ?,
          status = 'COMPLETED',
          updated_at = ?
        WHERE id = ?
      `).run(
        validated.clinicalNotes,
        validated.diagnosis,
        JSON.stringify(postVisitSummary),
        nowIso,
        validated.appointmentId
      );

      // 3. Create Prescriptions & Schedule Reminders
      let createdPrescriptions: any[] = [];
      if (validated.prescriptions && validated.prescriptions.length > 0) {
        createdPrescriptions = PrescriptionService.createPrescriptions({
          appointmentId: appt.id,
          patientId: appt.patient_id,
          doctorId: appt.doctor_id,
          items: validated.prescriptions,
        });
      }

      // 4. Enqueue Post-Visit Summary Email to Patient
      if (appt.patient_email) {
        EmailService.enqueueEmail({
          recipient_email: appt.patient_email,
          recipient_name: appt.patient_name || 'Patient',
          recipient_role: 'PATIENT',
          type: 'POST_VISIT_SUMMARY',
          subject: `Your Care Plan Summary: Consultation with Dr. ${appt.doctor_name}`,
          body_html: EmailService.generatePostVisitSummaryHtml({
            patientName: appt.patient_name || 'Patient',
            doctorName: appt.doctor_name || 'Doctor',
            appointmentNumber: appt.appointment_number,
            diagnosis: validated.diagnosis,
            patientFriendlySummary: postVisitSummary.patient_friendly_summary,
            followUpSteps: postVisitSummary.follow_up_steps,
          }),
        });
      }

      const updatedAppointment = AppointmentService.getAppointmentById(validated.appointmentId);

      res.status(200).json({
        message: 'Consultation concluded successfully',
        appointment: updatedAppointment,
        prescriptions: createdPrescriptions,
      });
    } catch (err) {
      next(err);
    }
  }
}
