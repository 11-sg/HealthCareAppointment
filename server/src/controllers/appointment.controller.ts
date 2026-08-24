import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppointmentService } from '../services/appointment.service';
import { LLMService } from '../services/llm.service';
import { CalendarService } from '../services/calendar.service';

const bookSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  slotStart: z.string().min(1, 'Slot start is required'),
  slotEnd: z.string().min(1, 'Slot end is required'),
  symptoms: z.string().min(3, 'Please describe your symptoms in at least 3 characters'),
  holdToken: z.string().optional(),
});

const rescheduleSchema = z.object({
  newSlotStart: z.string().min(1, 'New slot start is required'),
  newSlotEnd: z.string().min(1, 'New slot end is required'),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

const previewSymptomSchema = z.object({
  symptoms: z.string().min(1, 'Symptoms text is required'),
});

export class AppointmentController {
  static async bookAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'PATIENT') {
        res.status(403).json({ error: 'Only patients can book appointments' });
        return;
      }

      const validated = bookSchema.parse(req.body);
      const appointment = await AppointmentService.bookAppointment({
        patientId: req.user.id,
        doctorId: validated.doctorId,
        slotStart: validated.slotStart,
        slotEnd: validated.slotEnd,
        symptoms: validated.symptoms,
        holdToken: validated.holdToken,
      });

      res.status(201).json({ appointment });
    } catch (err) {
      next(err);
    }
  }

  static async getMyAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      let appointments;
      if (req.user.role === 'PATIENT') {
        appointments = AppointmentService.getPatientAppointments(req.user.id);
      } else if (req.user.role === 'DOCTOR') {
        const { date } = req.query;
        appointments = AppointmentService.getDoctorAppointments(req.user.id, typeof date === 'string' ? date : undefined);
      } else {
        // Admin
        appointments = AppointmentService.getAllAppointments();
      }

      res.status(200).json({ appointments });
    } catch (err) {
      next(err);
    }
  }

  static async getAppointmentById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const id = req.params.id as string;
      const appointment = AppointmentService.getAppointmentById(id);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      // Check authorization
      const isOwnerPatient = req.user.role === 'PATIENT' && appointment.patient_id === req.user.id;
      const isDoctor = req.user.role === 'DOCTOR' && appointment.doctor_id === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isOwnerPatient && !isDoctor && !isAdmin) {
        res.status(403).json({ error: 'Unauthorized to view this appointment' });
        return;
      }

      res.status(200).json({ appointment });
    } catch (err) {
      next(err);
    }
  }

  static async rescheduleAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const id = req.params.id as string;
      const validated = rescheduleSchema.parse(req.body);

      const appointment = await AppointmentService.rescheduleAppointment({
        appointmentId: id,
        newSlotStart: validated.newSlotStart,
        newSlotEnd: validated.newSlotEnd,
        userId: req.user.id,
        userRole: req.user.role,
      });

      res.status(200).json({ appointment, message: 'Appointment rescheduled successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async cancelAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const id = req.params.id as string;
      const validated = cancelSchema.parse(req.body);

      const appointment = await AppointmentService.cancelAppointment({
        appointmentId: id,
        userId: req.user.id,
        userRole: req.user.role,
        reason: validated.reason,
      });

      res.status(200).json({ appointment, message: 'Appointment cancelled successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async downloadIcs(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const appointment = AppointmentService.getAppointmentById(id);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      const ics = CalendarService.generateIcsFileContent({
        uid: `careflow-${appointment.appointment_number}@careflow-health.com`,
        title: `Appointment with Dr. ${appointment.doctor_name} (#${appointment.appointment_number})`,
        description: `Doctor: Dr. ${appointment.doctor_name} (${appointment.doctor_specialization})\nPatient: ${appointment.patient_name}\nSymptoms: ${appointment.symptoms_raw}`,
        slotStart: appointment.slot_start,
        slotEnd: appointment.slot_end,
        location: 'CareFlow Health Clinic',
      });

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="appointment-${appointment.appointment_number}.ics"`);
      res.send(ics);
    } catch (err) {
      next(err);
    }
  }

  static async previewSymptomAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = previewSymptomSchema.parse(req.body);
      const summary = await LLMService.generatePreVisitSummary(validated.symptoms);
      res.status(200).json({ summary });
    } catch (err) {
      next(err);
    }
  }
}
