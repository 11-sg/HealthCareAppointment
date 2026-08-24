import { app } from './app';
import { env, auditSecurityEnvironment } from './config/env';
import { initDatabase } from './db/connection';
import { BackgroundWorkerManager } from './workers';

async function bootstrap() {
  try {
    console.log('====================================================');
    console.log('   CareFlow Healthcare Appointment & Care Manager   ');
    console.log('====================================================');

    // 1. Audit Security Posture
    const security = auditSecurityEnvironment();
    if (security.warnings.length > 0) {
      console.log('[Security Audit]');
      security.warnings.forEach((w) => console.warn(`  ⚠️  ${w}`));
    } else {
      console.log('[Security Audit] All core security parameters verified.');
    }

    // 2. Initialize SQLite Database Schema
    console.log('[Database] Initializing database schema at:', env.DATABASE_FILE);
    initDatabase();

    // 3. Start Background Workers & Cron Jobs
    BackgroundWorkerManager.startWorkers();

    // 4. Start Express Server
    const server = app.listen(env.PORT, () => {
      console.log(`[Server] API listening on http://localhost:${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV} | Client URL: ${env.CLIENT_URL}`);
      console.log(`[Server] Email Service Mode: ${env.EMAIL_SERVICE_MODE}`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('\n[Server] Shutting down gracefully...');
      BackgroundWorkerManager.stopWorkers();
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[Server] Fatal bootstrap error:', error);
    process.exit(1);
  }
}

bootstrap();
