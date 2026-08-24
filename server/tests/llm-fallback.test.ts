import { LLMService } from '../src/services/llm.service';

describe('LLM Symptom Triage & Post-Visit Summary Resilience Tests', () => {
  test('Pre-visit symptom triage generates structured urgency, chief complaint, and 3 questions', async () => {
    const symptoms = 'Severe acute chest pain radiating to left shoulder with shortness of breath';
    const summary = await LLMService.generatePreVisitSummary(symptoms);

    expect(summary).toBeDefined();
    expect(['Low', 'Medium', 'High']).toContain(summary.urgency_level);
    expect(summary.urgency_level).toBe('High');
    expect(summary.chief_complaint).toBeDefined();
    expect(summary.suggested_questions).toHaveLength(3);
  });

  test('Post-visit summary converts clinical notes into patient-friendly plan', async () => {
    const notes = 'Patient presents with acute pharyngitis. Throat swab positive for Strep A. Prescribed Amoxicillin 500mg TID for 10 days. Advised warm saline gargles.';
    const diagnosis = 'Streptococcal Pharyngitis';

    const summary = await LLMService.generatePostVisitSummary(notes, diagnosis);

    expect(summary).toBeDefined();
    expect(summary.patient_friendly_summary).toBeDefined();
    expect(summary.patient_friendly_summary.length).toBeGreaterThan(20);
    expect(summary.follow_up_steps.length).toBeGreaterThan(0);
    expect(summary.warning_signs_to_watch.length).toBeGreaterThan(0);
  });

  test('Empty inputs gracefully return valid fallback structures without throwing', async () => {
    const emptyPre = await LLMService.generatePreVisitSummary('');
    expect(emptyPre.urgency_level).toBe('Low');
    expect(emptyPre.suggested_questions.length).toBe(3);

    const emptyPost = await LLMService.generatePostVisitSummary('');
    expect(emptyPost.patient_friendly_summary).toBeDefined();
    expect(emptyPost.follow_up_steps.length).toBeGreaterThan(0);
  });
});
