import { initDatabase, db } from '../src/db/connection';
import { AuthService } from '../src/services/auth.service';
import { AppointmentService } from '../src/services/appointment.service';
import { LeaveService } from '../src/services/leave.service';

describe('Doctor Leave Conflict & Patient Notification Tests', () => {
  let doctorId: string;
  let patientId: string;
  const leaveDate = '2026-10-15';

  beforeAll(async () => {
    initDatabase();

    const doc = await AuthService.register({
      name: 'Dr. Leave Tester',
      email: `doc.leave.${Date.now()}@careflow.com`,
      password: 'password123',
      role: 'DOCTOR',
      specialization: 'Pediatrics',
    });
    doctorId = doc.user.id;

    const patient = await AuthService.register({
      name: 'Leave Test Patient',
      email: `patient.leave.${Date.now()}@test.com`,
      password: 'password123',
      role: 'PATIENT',
    });
    patientId = patient.user.id;
  });

  test('Booking an appointment on a day prior to leave being scheduled succeeds', async () => {
    const appt = await AppointmentService.bookAppointment({
      doctorId,
      patientId,
      slotStart: `${leaveDate}T10:00:00.000Z`,
      slotEnd: `${leaveDate}T10:30:00.000Z`,
      symptoms: 'Annual pediatric checkup',
    });

    expect(appt.status).toBe('CONFIRMED');
  });

  test('Scheduling doctor leave cancels conflicting appointments and queues patient alerts', async () => {
    const result = await LeaveService.createLeave({
      doctorId,
      startDate: leaveDate,
      endDate: leaveDate,
      reason: 'Attending Medical Conference',
    });

    expect(result.leave).toBeDefined();
    expect(result.affectedCount).toBe(1);

    // Verify appointment status updated
    const appts = AppointmentService.getPatientAppointments(patientId);
    const affectedAppt = appts.find(a => a.slot_start.startsWith(leaveDate));
    expect(affectedAppt).toBeDefined();
    expect(affectedAppt?.status).toBe('CANCELLED_DUE_TO_LEAVE');

    // Verify email was queued in notification_queue
    const queuedItem = db.prepare(`
      SELECT * FROM notification_queue 
      WHERE type = 'DOCTOR_LEAVE_ALERT' 
        AND recipient_email = (SELECT email FROM users WHERE id = ?)
    `).get(patientId) as any;

    expect(queuedItem).toBeDefined();
    expect(queuedItem.subject).toContain('Important: Schedule Change');
  });

  test('Future bookings on the approved leave date are rejected', async () => {
    await expect(
      AppointmentService.bookAppointment({
        doctorId,
        patientId,
        slotStart: `${leaveDate}T14:00:00.000Z`,
        slotEnd: `${leaveDate}T14:30:00.000Z`,
        symptoms: 'Checkup',
      })
    ).rejects.toThrow(/leave/);
  });
});
