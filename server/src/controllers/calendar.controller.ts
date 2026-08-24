import { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { env } from '../config/env';
import { CalendarService } from '../services/calendar.service';

export class CalendarController {
  static getStatus(req: Request, res: Response) {
    const isConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
    res.status(200).json({
      configured: isConfigured,
      hasClientId: Boolean(env.GOOGLE_CLIENT_ID),
      hasClientSecret: Boolean(env.GOOGLE_CLIENT_SECRET),
      hasRefreshToken: Boolean(env.GOOGLE_REFRESH_TOKEN),
      redirectUri: env.GOOGLE_REDIRECT_URI,
      message: isConfigured 
        ? 'Google Calendar API OAuth 2.0 active and synced'
        : 'Running in zero-config mode with automated direct Google Calendar links & iCal generator'
    });
  }

  static getAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const url = CalendarService.getAuthUrl();
      if (!url) {
        res.status(400).json({
          error: 'Google OAuth credentials not configured in environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)'
        });
        return;
      }
      res.status(200).json({ authUrl: url });
    } catch (err) {
      next(err);
    }
  }

  static async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).send('Authorization code missing');
        return;
      }

      const oAuth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );

      const { tokens } = await oAuth2Client.getToken(code);

      res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #0d9488;">Google Calendar Connected Successfully!</h2>
            <p>Your Refresh Token is:</p>
            <textarea style="width: 80%; height: 100px; padding: 10px;" readonly>${tokens.refresh_token || 'Token received. (If refresh_token is missing, revoke app access and re-authenticate with prompt=consent)'}</textarea>
            <p>Copy this refresh token to your <code>.env</code> file under <code>GOOGLE_REFRESH_TOKEN</code> to persist sync across restarts.</p>
          </body>
        </html>
      `);
    } catch (err) {
      next(err);
    }
  }
}
