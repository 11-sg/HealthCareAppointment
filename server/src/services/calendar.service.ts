import { google } from 'googleapis';
import { env } from '../config/env';

export class CalendarService {
  private static getOAuth2Client() {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return null;
    }

    const oAuth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    if (env.GOOGLE_REFRESH_TOKEN) {
      oAuth2Client.setCredentials({
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
      });
    }

    return oAuth2Client;
  }

  /**
   * Generates Google OAuth 2.0 consent URL for clinic admin or doctor
   */
  static getAuthUrl(): string | null {
    const oAuth2Client = this.getOAuth2Client();
    if (!oAuth2Client) return null;

    return oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
    });
  }

  /**
   * Creates a Google Calendar event for both patient and doctor
   */
  static async createAppointmentEvent(params: {
    appointmentNumber: string;
    patientName: string;
    patientEmail: string;
    doctorName: string;
    doctorEmail?: string;
    specialization: string;
    slotStart: string;
    slotEnd: string;
    symptoms: string;
  }): Promise<{ eventId?: string; calendarLink: string; icsContent: string }> {
    const directLink = this.generateDirectGoogleCalendarLink({
      title: `CareFlow Medical Appointment: Dr. ${params.doctorName} & ${params.patientName}`,
      description: `Appointment #${params.appointmentNumber}\nSpecialization: ${params.specialization}\nDoctor: Dr. ${params.doctorName}\nPatient: ${params.patientName}\nSymptoms: ${params.symptoms}`,
      slotStart: params.slotStart,
      slotEnd: params.slotEnd,
      location: 'CareFlow Health Clinic & Virtual Consultation',
    });

    const icsContent = this.generateIcsFileContent({
      uid: `careflow-${params.appointmentNumber}@careflow-health.com`,
      title: `Appointment with Dr. ${params.doctorName} (#${params.appointmentNumber})`,
      description: `CareFlow Health Appointment\nDoctor: Dr. ${params.doctorName} (${params.specialization})\nPatient: ${params.patientName}\nSymptoms: ${params.symptoms}`,
      slotStart: params.slotStart,
      slotEnd: params.slotEnd,
      location: 'CareFlow Health Clinic',
    });

    const auth = this.getOAuth2Client();
    if (!auth || !env.GOOGLE_REFRESH_TOKEN) {
      // Return direct link & ICS payload if OAuth is not configured
      return { calendarLink: directLink, icsContent };
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const attendees = [{ email: params.patientEmail, displayName: params.patientName }];
      if (params.doctorEmail) {
        attendees.push({ email: params.doctorEmail, displayName: `Dr. ${params.doctorName}` });
      }

      const event = await calendar.events.insert({
        calendarId: 'primary',
        sendUpdates: 'all',
        requestBody: {
          summary: `Medical Consultation: Dr. ${params.doctorName} / ${params.patientName}`,
          description: `CareFlow Appointment #${params.appointmentNumber}\nDoctor: Dr. ${params.doctorName} (${params.specialization})\nPatient: ${params.patientName}\nChief Symptoms: ${params.symptoms}`,
          location: 'CareFlow Health Center / Telehealth',
          start: {
            dateTime: params.slotStart,
            timeZone: 'UTC',
          },
          end: {
            dateTime: params.slotEnd,
            timeZone: 'UTC',
          },
          attendees,
          conferenceData: {
            createRequest: {
              requestId: `meet-${params.appointmentNumber}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        },
      });

      return {
        eventId: event.data.id || undefined,
        calendarLink: event.data.htmlLink || directLink,
        icsContent,
      };
    } catch (error: any) {
      console.warn('[CalendarService] Google Calendar API event creation failed, falling back to direct link:', error.message);
      return { calendarLink: directLink, icsContent };
    }
  }

  /**
   * Updates an existing Google Calendar event on reschedule
   */
  static async updateAppointmentEvent(params: {
    eventId: string;
    slotStart: string;
    slotEnd: string;
  }): Promise<boolean> {
    const auth = this.getOAuth2Client();
    if (!auth || !env.GOOGLE_REFRESH_TOKEN || !params.eventId) return false;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.patch({
        calendarId: 'primary',
        eventId: params.eventId,
        sendUpdates: 'all',
        requestBody: {
          start: { dateTime: params.slotStart, timeZone: 'UTC' },
          end: { dateTime: params.slotEnd, timeZone: 'UTC' },
        },
      });
      return true;
    } catch (error: any) {
      console.warn('[CalendarService] Failed to patch Google Calendar event:', error.message);
      return false;
    }
  }

  /**
   * Deletes a Google Calendar event on appointment cancellation
   */
  static async deleteAppointmentEvent(eventId: string): Promise<boolean> {
    const auth = this.getOAuth2Client();
    if (!auth || !env.GOOGLE_REFRESH_TOKEN || !eventId) return false;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });
      return true;
    } catch (error: any) {
      console.warn('[CalendarService] Failed to delete Google Calendar event:', error.message);
      return false;
    }
  }

  /**
   * Generates direct Google Calendar Web URL
   */
  static generateDirectGoogleCalendarLink(params: {
    title: string;
    description: string;
    slotStart: string;
    slotEnd: string;
    location: string;
  }): string {
    const formatTime = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const start = formatTime(params.slotStart);
    const end = formatTime(params.slotEnd);

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', params.title);
    url.searchParams.set('dates', `${start}/${end}`);
    url.searchParams.set('details', params.description);
    url.searchParams.set('location', params.location);

    return url.toString();
  }

  /**
   * Generates standard RFC-5545 iCalendar (.ics) string
   */
  static generateIcsFileContent(params: {
    uid: string;
    title: string;
    description: string;
    slotStart: string;
    slotEnd: string;
    location: string;
  }): string {
    const formatTime = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const start = formatTime(params.slotStart);
    const end = formatTime(params.slotEnd);
    const now = formatTime(new Date().toISOString());

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CareFlow Health//Healthcare Appointment Manager//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${params.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${params.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${params.location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}
