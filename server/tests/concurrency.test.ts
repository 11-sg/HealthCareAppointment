import { initDatabase, db } from '../src/db/connection';
import { AuthService } from '../src/services/auth.service';
import { SlotService } from '../src/services/slot.service';
import { AppointmentService } from '../src/services/appointment.service';

describe('Concurrency & Double-Booking Prevention Tests', () => {
  let doctorId: string;
  let patient1Id: string;
  let patient2Id: string;
  const testSlotStart = '2026-09-10T09:00:00.000Z';
  const testSlotEnd = '2026-09-10T09:30:00.000Z';

  beforeAll(async () => {
    initDatabase();

    // Create doctor
    const doc = await AuthService.register({
      name: 'Test Concurrency Doctor',
      email: `doc.test.${Date.now()}@careflow.com`,
      password: 'password123',
      role: 'DOCTOR',
      specialization: 'Internal Medicine',
    });
    doctorId = doc.user.id;

    // Create patient 1
    const p1 = await AuthService.register({
      name: 'Patient One',
      email: `p1.${Date.now()}@test.com`,
      password: 'password123',
      role: 'PATIENT',
    });
    patient1Id = p1.user.id;

    // Create patient 2
    const p2 = await AuthService.register({
      name: 'Patient Two',
      email: `p2.${Date.now()}@test.com`,
      password: 'password123',
      role: 'PATIENT',
    });
    patient2Id = p2.user.id;
  });

  test('Patient 1 can acquire a temporary slot hold', () => {
    const hold = SlotService.holdSlot({
      doctorId,
      patientId: patient1Id,
      slotStart: testSlotStart,
      slotEnd: testSlotEnd,
    });

    expect(hold).toBeDefined();
    expect(hold.holdToken).toBeDefined();
    expect(new Date(hold.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('Patient 2 is blocked from holding or booking the same slot simultaneously', async () => {
    // Patient 2 attempts to hold the same slot
    expect(() => {
      SlotService.holdSlot({
        doctorId,
        patientId: patient2Id,
        slotStart: testSlotStart,
        slotEnd: testSlotEnd,
      });
    }).toThrow(/Slot conflict/);

    // Patient 2 attempts direct booking on the held slot
    await expect(
      AppointmentService.bookAppointment({
        doctorId,
        patientId: patient2Id,
        slotStart: testSlotStart,
        slotEnd: testSlotEnd,
        symptoms: 'Mild cold symptoms',
      })
    ).rejects.toThrow(/temporarily held/);
  });

  test('Patient 1 converts hold into confirmed appointment', async () => {
    const appt = await AppointmentService.bookAppointment({
      doctorId,
      patientId: patient1Id,
      slotStart: testSlotStart,
      slotEnd: testSlotEnd,
      symptoms: 'Routine checkup and blood pressure monitoring',
    });

    expect(appt).toBeDefined();
    expect(appt.status).toBe('CONFIRMED');
    expect(appt.appointment_number).toMatch(/^CF-2026-/);
  });

  test('Double booking is strictly prevented once appointment is confirmed', async () => {
    await expect(
      AppointmentService.bookAppointment({
        doctorId,
        patientId: patient2Id,
        slotStart: testSlotStart,
        slotEnd: testSlotEnd,
        symptoms: 'Headache',
      })
    ).rejects.toThrow(/already been booked/);
  });
});
