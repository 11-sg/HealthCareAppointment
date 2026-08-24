import { env } from '../config/env';
import { PreVisitSummary, PostVisitSummary, UrgencyLevel } from '../types';

export class LLMService {
  /**
   * Generates a pre-visit symptom summary and urgency assessment
   * Prompt specified in spec:
   * "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"
   */
  static async generatePreVisitSummary(symptoms: string): Promise<PreVisitSummary> {
    const nowIso = new Date().toISOString();

    if (!symptoms || symptoms.trim().length === 0) {
      return {
        urgency_level: 'Low',
        chief_complaint: 'Routine wellness check / unspecified consultation',
        suggested_questions: [
          'What is the primary reason for your visit today?',
          'Have you experienced any changes in your health recently?',
          'Are you currently taking any prescription or over-the-counter medications?'
        ],
        generated_at: nowIso,
        is_fallback: true,
      };
    }

    if (env.GEMINI_API_KEY) {
      try {
        const systemPrompt = `You are a medical AI assistant. Your task is to analyze the patient symptoms provided and return a JSON object with EXACTLY this structure:
{
  "urgency_level": "Low" | "Medium" | "High",
  "chief_complaint": "Clear, concise 1-sentence description of the main issue",
  "suggested_questions": [
    "Suggested question 1 for the doctor to ask the patient",
    "Suggested question 2 for the doctor to ask the patient",
    "Suggested question 3 for the doctor to ask the patient"
  ]
}
Do NOT include markdown formatting or backticks around the JSON. Return only the raw valid JSON string.`;

        const userPrompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            
            let urgency: UrgencyLevel = 'Medium';
            if (['Low', 'Medium', 'High'].includes(parsed.urgency_level)) {
              urgency = parsed.urgency_level;
            }

            return {
              urgency_level: urgency,
              chief_complaint: parsed.chief_complaint || 'Symptom evaluation',
              suggested_questions: Array.isArray(parsed.suggested_questions) && parsed.suggested_questions.length > 0
                ? parsed.suggested_questions.slice(0, 3)
                : [
                    'How long have these symptoms persisted?',
                    'Are there specific triggers or relief factors?',
                    'Do you have any related medical history or allergies?'
                  ],
              generated_at: nowIso,
              is_fallback: false,
            };
          }
        }
      } catch (error) {
        console.warn('[LLMService] Gemini API call failed, gracefully falling back to clinical heuristic parser:', error);
      }
    }

    // Graceful Clinical Heuristic Fallback
    return this.fallbackPreVisitSummary(symptoms);
  }

  /**
   * Generates a patient-friendly post-visit summary from clinical notes & prescription
   * Prompt specified in spec:
   * "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"
   */
  static async generatePostVisitSummary(clinicalNotes: string, diagnosis?: string): Promise<PostVisitSummary> {
    const nowIso = new Date().toISOString();

    if (!clinicalNotes || clinicalNotes.trim().length === 0) {
      return {
        patient_friendly_summary: 'Consultation concluded. Please follow standard healthy living guidelines and take prescribed medications as directed.',
        medication_schedule: [],
        follow_up_steps: ['Schedule a follow-up visit if symptoms persist or worsen.'],
        warning_signs_to_watch: ['Sudden severe pain', 'Difficulty breathing', 'High persistent fever'],
        generated_at: nowIso,
        is_fallback: true,
      };
    }

    if (env.GEMINI_API_KEY) {
      try {
        const systemPrompt = `You are a compassionate medical communicator. Convert clinical physician notes into an empowering, patient-friendly consultation summary. Return a JSON object with EXACTLY this structure:
{
  "patient_friendly_summary": "Clear, empathetic explanation of the diagnosis, what was found, and overall recovery plan in plain English",
  "medication_schedule": [
    {
      "medication": "Name of drug",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "time_of_day": "e.g. Morning and Evening with meals",
      "instructions": "Special precautions e.g. Complete full course"
    }
  ],
  "follow_up_steps": [
    "Step 1 (e.g. Rest for 3 days and drink plenty of fluids)",
    "Step 2 (e.g. Recheck blood pressure in 2 weeks)"
  ],
  "warning_signs_to_watch": [
    "Warning symptom 1",
    "Warning symptom 2"
  ]
}
Return only raw JSON without backticks.`;

        const fullNotes = diagnosis ? `Diagnosis: ${diagnosis}\nClinical Notes:\n${clinicalNotes}` : clinicalNotes;
        const userPrompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${fullNotes}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            return {
              patient_friendly_summary: parsed.patient_friendly_summary || 'Your doctor has provided the treatment plan below.',
              medication_schedule: Array.isArray(parsed.medication_schedule) ? parsed.medication_schedule : [],
              follow_up_steps: Array.isArray(parsed.follow_up_steps) ? parsed.follow_up_steps : ['Follow up with doctor as recommended.'],
              warning_signs_to_watch: Array.isArray(parsed.warning_signs_to_watch) ? parsed.warning_signs_to_watch : ['Seek immediate care if symptoms abruptly worsen.'],
              generated_at: nowIso,
              is_fallback: false,
            };
          }
        }
      } catch (error) {
        console.warn('[LLMService] Gemini API call failed for post-visit summary, falling back to clinical parser:', error);
      }
    }

    // Graceful Clinical Heuristic Fallback
    return this.fallbackPostVisitSummary(clinicalNotes, diagnosis);
  }

  /**
   * Rule-based clinical triage parser for offline / fallback scenarios
   */
  private static fallbackPreVisitSummary(symptoms: string): PreVisitSummary {
    const text = symptoms.toLowerCase();

    // High urgency red flag keywords
    const highUrgencyKeywords = [
      'chest pain', 'shortness of breath', 'difficulty breathing', 'severe bleeding',
      'unconscious', 'seizure', 'paralysis', 'stroke', 'vision loss', 'high fever',
      'extreme pain', 'vomiting blood', 'suicidal', 'anaphylaxis', 'choking'
    ];

    // Medium urgency keywords
    const mediumUrgencyKeywords = [
      'fever', 'persistent cough', 'migraine', 'vomiting', 'diarrhea', 'rash',
      'swelling', 'infection', 'ear pain', 'abdominal pain', 'burn', 'sprain',
      'flu', 'dizziness', 'asthma', 'palpitations'
    ];

    let urgency_level: UrgencyLevel = 'Low';
    if (highUrgencyKeywords.some(kw => text.includes(kw))) {
      urgency_level = 'High';
    } else if (mediumUrgencyKeywords.some(kw => text.includes(kw))) {
      urgency_level = 'Medium';
    }

    // Chief complaint extraction
    let chief_complaint = symptoms.trim();
    if (chief_complaint.length > 120) {
      chief_complaint = chief_complaint.slice(0, 117) + '...';
    }

    // Contextual questions
    const questions: string[] = [];
    if (text.includes('pain')) {
      questions.push('On a scale of 1 to 10, how severe is the pain and does it radiate to other areas?');
    } else {
      questions.push('When did you first notice these symptoms, and have they progressed over time?');
    }

    if (text.includes('fever') || text.includes('cough') || text.includes('cold') || text.includes('throat')) {
      questions.push('Have you measured your body temperature or noticed any chills or respiratory distress?');
    } else {
      questions.push('Have you tried any home remedies or over-the-counter medications for relief?');
    }

    questions.push('Do you have any known allergies or relevant medical conditions the doctor should know about?');

    return {
      urgency_level,
      chief_complaint: `Patient presents with: ${chief_complaint}`,
      suggested_questions: questions.slice(0, 3),
      generated_at: new Date().toISOString(),
      is_fallback: true,
    };
  }

  /**
   * Rule-based clinical note converter for offline / fallback scenarios
   */
  private static fallbackPostVisitSummary(notes: string, diagnosis?: string): PostVisitSummary {
    const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);
    const diag = diagnosis ? diagnosis.trim() : 'Health Assessment';

    return {
      patient_friendly_summary: `During your consultation for ${diag}, the doctor reviewed your condition and outlined the treatment plan. Summary of notes: ${notes.slice(0, 300)}${notes.length > 300 ? '...' : ''}. Please follow the recommendations closely to ensure a speedy and full recovery.`,
      medication_schedule: [
        {
          medication: 'Prescribed medication',
          dosage: 'As indicated on prescription label',
          frequency: 'Follow prescribed dosage schedule',
          time_of_day: 'Take with a glass of water after meals',
          instructions: 'Complete full course even if feeling better',
        }
      ],
      follow_up_steps: [
        'Adhere strictly to the medication schedule and get adequate rest.',
        'Hydrate well and monitor any changes in your symptoms daily.',
        'Book a follow-up appointment in 7-10 days if symptoms do not improve.',
      ],
      warning_signs_to_watch: [
        'Sudden elevation in fever or severe chills.',
        'Difficulty breathing, chest tightness, or severe dizziness.',
        'Allergic reaction (swelling of lips/face, severe skin rash).',
      ],
      generated_at: new Date().toISOString(),
      is_fallback: true,
    };
  }
}
