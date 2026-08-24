import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './connection';

async function seed() {
  console.log('[Seed] Starting database seed with real Indian doctors and clinical specialists...');
  initDatabase();

  // Clear existing records
  db.exec(`
    DELETE FROM notification_queue;
    DELETE FROM medication_reminders;
    DELETE FROM prescriptions;
    DELETE FROM appointments;
    DELETE FROM slot_holds;
    DELETE FROM doctor_leaves;
    DELETE FROM doctor_profiles;
    DELETE FROM users;
  `);

  const salt = await bcrypt.genSalt(10);
  const now = new Date();
  const nowIso = now.toISOString();

  // Helper to format ISO
  const addDays = (d: number) => {
    const target = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    return target.toISOString().split('T')[0];
  };

  // 1. Create Admin
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash('admin123', salt);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
    VALUES (?, 'Clinic Administrator', 'admin@careflow.com', ?, 'ADMIN', '+91 98100 12345', ?, ?)
  `).run(adminId, adminHash, nowIso, nowIso);

  // 2. Create Indian Specialists matching the real photographs
  const defaultSchedule = {
    monday: { start: '09:00', end: '17:00', is_available: true },
    tuesday: { start: '09:00', end: '17:00', is_available: true },
    wednesday: { start: '09:00', end: '17:00', is_available: true },
    thursday: { start: '09:00', end: '17:00', is_available: true },
    friday: { start: '09:00', end: '16:00', is_available: true },
    saturday: { start: '10:00', end: '14:00', is_available: false },
    sunday: { start: '10:00', end: '14:00', is_available: false },
  };

  const doctorHash = await bcrypt.hash('doctor123', salt);

  const doctorsData = [
    {
      id: uuidv4(),
      name: 'Rajesh Sharma',
      email: 'dr.sharma@careflow.com',
      phone: '+91 98234 56781',
      specialization: 'Cardiology',
      bio: 'Senior Consultant Cardiologist (MD, DM Cardiology - AIIMS New Delhi) with 15+ years experience in preventive heart health, hypertension, and arrhythmia management.',
      experience: 15,
      fee: 1200.0,
      duration: 30,
      avatar: '/images/doc_1.png',
    },
    {
      id: uuidv4(),
      name: 'Arvind Patel',
      email: 'dr.patel@careflow.com',
      phone: '+91 98345 67892',
      specialization: 'Neurology',
      bio: 'Lead Neurologist (MD, DM Neurology - NIMHANS Bengaluru) specializing in migraine therapies, neuropathy management, vertigo, and cognitive neuro-wellness.',
      experience: 12,
      fee: 1000.0,
      duration: 30,
      avatar: '/images/doc_2.png',
    },
    {
      id: uuidv4(),
      name: 'Suresh Menon',
      email: 'dr.menon@careflow.com',
      phone: '+91 98567 89014',
      specialization: 'Orthopedics',
      bio: 'Chief Orthopedic Surgeon (MS Ortho, MCh) specializing in knee & hip joint preservation, sports injury recovery, and arthroscopy.',
      experience: 18,
      fee: 1500.0,
      duration: 45,
      avatar: '/images/doc_3.png',
    },
    {
      id: uuidv4(),
      name: 'Amit Verma',
      email: 'dr.verma@careflow.com',
      phone: '+91 98678 90125',
      specialization: 'General Medicine',
      bio: 'Senior Physician & Diabetologist (MBBS, MD Medicine) focusing on comprehensive adult primary care, diabetes reversal programs, and lifestyle disease management.',
      experience: 10,
      fee: 800.0,
      duration: 30,
      avatar: '/images/doc_4.jpg',
    },
    {
      id: uuidv4(),
      name: 'Soumya Swaminathan',
      email: 'dr.swaminathan@careflow.com',
      phone: '+91 98789 01236',
      specialization: 'Pediatrics',
      bio: 'Distinguished Clinical Pediatrician & Pulmonology Fellow (MD Pediatrics, DNB) specializing in childhood respiratory allergies, asthma care, and child wellness.',
      experience: 20,
      fee: 1400.0,
      duration: 30,
      avatar: '/images/doc_soumya_swaminathan.jpg',
    },
    {
      id: uuidv4(),
      name: 'Devi Shetty',
      email: 'dr.shetty@careflow.com',
      phone: '+91 98890 12347',
      specialization: 'Cardiac Surgery',
      bio: 'Pioneering Cardiothoracic Surgeon (MS, FRCS) specializing in coronary bypass, valve repair, complex pediatric cardiac surgery, and cardiovascular wellness.',
      experience: 25,
      fee: 2000.0,
      duration: 45,
      avatar: '/images/doc_devi_shetty.jpg',
    },
    {
      id: uuidv4(),
      name: 'Randeep Guleria',
      email: 'dr.guleria@careflow.com',
      phone: '+91 98901 23458',
      specialization: 'Pulmonology',
      bio: 'Senior Pulmonologist (MD, DM Pulmonary Medicine - AIIMS) specializing in chronic obstructive pulmonary disease (COPD), sleep apnea, and environmental lung health.',
      experience: 22,
      fee: 1600.0,
      duration: 30,
      avatar: '/images/doc_randeep_guleria.jpg',
    },
    {
      id: uuidv4(),
      name: 'Arvinder Singh Soin',
      email: 'dr.soin@careflow.com',
      phone: '+91 99012 34569',
      specialization: 'Gastroenterology',
      bio: 'Chief Hepatobiliary & Liver Transplant Surgeon (MS, FRCS) renowned for advanced liver disease treatments, cirrhosis management, and digestive health.',
      experience: 24,
      fee: 1800.0,
      duration: 45,
      avatar: '/images/doc_as_soin.jpg',
    },
    {
      id: uuidv4(),
      name: 'Ashok Seth',
      email: 'dr.seth@careflow.com',
      phone: '+91 99123 45670',
      specialization: 'Cardiology',
      bio: 'Renowned Interventional Cardiologist (MD, FRCP) specializing in complex angioplasty, bioabsorbable stents, structural heart disease, and hypertension.',
      experience: 26,
      fee: 1800.0,
      duration: 30,
      avatar: '/images/doc_ashok_seth.jpg',
    },
    {
      id: uuidv4(),
      name: 'D. Nageshwar Reddy',
      email: 'dr.nageshwar@careflow.com',
      phone: '+91 99234 56781',
      specialization: 'Gastroenterology',
      bio: 'Senior Consultant Gastroenterologist & Therapeutic Endoscopist (MD, DM, DSc) specializing in GI bleeding, pancreatitis, and gastrointestinal oncology.',
      experience: 28,
      fee: 1700.0,
      duration: 30,
      avatar: '/images/doc_nageshwar_reddy.jpg',
    },
  ];

  for (const doc of doctorsData) {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'DOCTOR', ?, ?, ?, ?)
    `).run(doc.id, doc.name, doc.email, doctorHash, doc.phone, doc.avatar, nowIso, nowIso);

    db.prepare(`
      INSERT INTO doctor_profiles (
        id, user_id, specialization, bio, experience_years,
        consultation_fee, slot_duration_minutes, working_hours, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      uuidv4(),
      doc.id,
      doc.specialization,
      doc.bio,
      doc.experience,
      doc.fee,
      doc.duration,
      JSON.stringify(defaultSchedule),
      nowIso,
      nowIso
    );
  }

  // 3. Create Indian Patients
  const patientHash = await bcrypt.hash('patient123', salt);
  const patientsData = [
    {
      id: uuidv4(),
      name: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      phone: '+91 99111 22334',
    },
    {
      id: uuidv4(),
      name: 'Sneha Kapoor',
      email: 'sneha.kapoor@example.com',
      phone: '+91 99222 33445',
    },
    {
      id: uuidv4(),
      name: 'Rohan Gupta',
      email: 'rohan.gupta@example.com',
      phone: '+91 99333 44556',
    },
  ];

  for (const pat of patientsData) {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'PATIENT', ?, ?, ?)
    `).run(pat.id, pat.name, pat.email, patientHash, pat.phone, nowIso, nowIso);
  }

  // 4. Create Sample Doctor Leave (Dr. Suresh Menon on leave in 3 days)
  const leaveId = uuidv4();
  const leaveStart = addDays(3);
  const leaveEnd = addDays(4);
  db.prepare(`
    INSERT INTO doctor_leaves (id, doctor_id, start_date, end_date, reason, status, created_at)
    VALUES (?, ?, ?, ?, 'Attending Indian Orthopedic Association (IOA) Annual Conference in New Delhi', 'APPROVED', ?)
  `).run(leaveId, doctorsData[2].id, leaveStart, leaveEnd, nowIso);

  // 5. Create Sample Appointments
  // Appointment 1: Completed visit with Dr. Rajesh Sharma (Aarav Mehta)
  const appt1Id = uuidv4();
  const pastDateStr = addDays(-3);
  const appt1PreSummary = {
    urgency_level: 'Medium',
    chief_complaint: 'Patient reports mild chest tightness after climbing stairs and occasional palpitations after morning tea.',
    suggested_questions: [
      'How often do the palpitations occur and how long do they last?',
      'Is the chest tightness relieved by resting?',
      'Do you have any family history of early heart disease or diabetes?'
    ],
    generated_at: `${pastDateStr}T08:30:00.000Z`,
    is_fallback: false,
  };

  const appt1PostSummary = {
    patient_friendly_summary: 'Dr. Sharma evaluated your cardiovascular health. Resting ECG showed mild sinus tachycardia with normal rhythm. Blood pressure was 134/86 mmHg. Initiated low-dose beta-blocker (Metoprolol 25mg) to regulate heart rate and support BP. Advised 30 mins brisk morning walk, low-sodium Indian diet, and reducing excessive chai/caffeine.',
    medication_schedule: [
      {
        medication: 'Metoprolol Tartrate (Betaloc)',
        dosage: '25mg',
        frequency: 'Twice daily',
        time_of_day: '08:00 and 20:00 after meals',
        instructions: 'Take after breakfast and dinner. Do not stop abruptly.',
      }
    ],
    follow_up_steps: [
      'Maintain a daily blood pressure chart for the next 2 weeks.',
      'Reduce fried snacks and salt in daily meals.',
      'Book a 3-week follow-up appointment with Dr. Sharma for BP re-assessment.'
    ],
    warning_signs_to_watch: [
      'Severe crushing chest pain radiating to left arm or jaw.',
      'Unexplained dizziness or acute breathlessness.',
    ],
    generated_at: `${pastDateStr}T10:00:00.000Z`,
    is_fallback: false,
  };

  db.prepare(`
    INSERT INTO appointments (
      id, appointment_number, patient_id, doctor_id,
      slot_start, slot_end, status, symptoms_raw,
      pre_visit_summary, clinical_notes, diagnosis, post_visit_summary,
      created_at, updated_at
    ) VALUES (?, 'CF-2026-1001', ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    appt1Id,
    patientsData[0].id,
    doctorsData[0].id,
    `${pastDateStr}T09:00:00.000Z`,
    `${pastDateStr}T09:30:00.000Z`,
    'Mild chest tightness while climbing metro stairs and occasional heart racing.',
    JSON.stringify(appt1PreSummary),
    'Patient presents with exertion-associated mild palpitations. BP 134/86 mmHg. Heart sounds S1/S2 regular, no murmurs. ECG showed normal sinus rhythm. Prescribed Betaloc 25mg BD.',
    'Stage 1 Essential Hypertension & Exertional Tachycardia',
    JSON.stringify(appt1PostSummary),
    nowIso,
    nowIso
  );

  // Prescription for Aarav Mehta
  const pres1Id = uuidv4();
  db.prepare(`
    INSERT INTO prescriptions (
      id, appointment_id, patient_id, doctor_id,
      medication_name, dosage, frequency, times_of_day,
      duration_days, start_date, end_date, special_instructions,
      is_active, created_at
    ) VALUES (?, ?, ?, ?, 'Metoprolol Tartrate (Betaloc)', '25mg', 'TWICE_DAILY', '["08:00","20:00"]', 14, ?, ?, 'Take with water after meals.', 1, ?)
  `).run(
    pres1Id,
    appt1Id,
    patientsData[0].id,
    doctorsData[0].id,
    pastDateStr,
    addDays(11),
    nowIso
  );

  // Reminders for today for Aarav Mehta
  const todayStr = addDays(0);
  db.prepare(`
    INSERT INTO medication_reminders (id, prescription_id, patient_id, scheduled_time, status, created_at)
    VALUES 
      (?, ?, ?, ?, 'SENT', ?),
      (?, ?, ?, ?, 'PENDING', ?)
  `).run(
    uuidv4(), pres1Id, patientsData[0].id, `${todayStr}T08:00:00.000Z`, nowIso,
    uuidv4(), pres1Id, patientsData[0].id, `${todayStr}T20:00:00.000Z`, nowIso
  );

  // Appointment 2: Upcoming Confirmed for Tomorrow with Dr. Arvind Patel (Sneha Kapoor)
  const tomorrowStr = addDays(1);
  const appt2Id = uuidv4();
  const appt2PreSummary = {
    urgency_level: 'Low',
    chief_complaint: 'Patient reports recurring tension headaches on temples after long screen work hours.',
    suggested_questions: [
      'How many hours per day do you work on computer screens?',
      'Does the headache improve after resting or neck stretching?',
      'Have you noticed any sensitivity to bright sunlight?'
    ],
    generated_at: nowIso,
    is_fallback: false,
  };

  db.prepare(`
    INSERT INTO appointments (
      id, appointment_number, patient_id, doctor_id,
      slot_start, slot_end, status, symptoms_raw,
      pre_visit_summary, created_at, updated_at
    ) VALUES (?, 'CF-2026-1002', ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)
  `).run(
    appt2Id,
    patientsData[1].id,
    doctorsData[1].id,
    `${tomorrowStr}T10:00:00.000Z`,
    `${tomorrowStr}T10:30:00.000Z`,
    'Tension headache and shoulder stiffness after long office screen hours.',
    JSON.stringify(appt2PreSummary),
    nowIso,
    nowIso
  );

  // Appointment 3: Upcoming for Today with Dr. Amit Verma (Aarav Mehta)
  const appt3Id = uuidv4();
  const appt3PreSummary = {
    urgency_level: 'High',
    chief_complaint: 'Severe acute left-sided migraine with nausea and light sensitivity.',
    suggested_questions: [
      'Did you notice any visual aura or flashing lights before the headache?',
      'How quickly did the headache peak?',
      'Have you taken any pain medication today?'
    ],
    generated_at: nowIso,
    is_fallback: false,
  };

  db.prepare(`
    INSERT INTO appointments (
      id, appointment_number, patient_id, doctor_id,
      slot_start, slot_end, status, symptoms_raw,
      pre_visit_summary, created_at, updated_at
    ) VALUES (?, 'CF-2026-1003', ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)
  `).run(
    appt3Id,
    patientsData[0].id,
    doctorsData[3].id,
    `${todayStr}T14:00:00.000Z`,
    `${todayStr}T14:30:00.000Z`,
    'Debilitating throbbing headache on left temple, severe sensitivity to bright light and screen glare, nausea.',
    JSON.stringify(appt3PreSummary),
    nowIso,
    nowIso
  );

  console.log('[Seed] Database successfully populated with 10 Indian doctors:');
  doctorsData.forEach(d => console.log(`  - ${d.name} (${d.specialization}): ${d.email} (Fee: ₹${d.fee})`));
  console.log('  - Admin: admin@careflow.com (pwd: admin123)');
  console.log('  - Patients: aarav.mehta@example.com, sneha.kapoor@example.com, rohan.gupta@example.com (pwd: patient123)');
}

seed().catch(err => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
