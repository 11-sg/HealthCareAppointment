import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler.middleware';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import slotRoutes from './routes/slot.routes';
import appointmentRoutes from './routes/appointment.routes';
import consultationRoutes from './routes/consultation.routes';
import leaveRoutes from './routes/leave.routes';
import prescriptionRoutes from './routes/prescription.routes';
import adminRoutes from './routes/admin.routes';
import calendarRoutes from './routes/calendar.routes';

export const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for local assets and API consumption
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Secure CORS configuration
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`CORS Error: Origin ${origin} is not allowed by policy.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Payload size limiting to prevent payload flooding attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    service: 'CareFlow Healthcare Appointment & Follow-up Manager API',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendar', calendarRoutes);

// Global Error Handler
app.use(errorHandler);
