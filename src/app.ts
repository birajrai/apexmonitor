import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import path from 'path';

import { config } from './config';
import { sequelize, initializeDatabase, closeDatabase } from './database';
import { authRoutes, adminRoutes, statusRoutes } from './routes';
import { scheduler } from './core';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    adminId: string;
    adminUsername: string;
  }
}

/**
 * Initialize and start the application
 */
async function main() {
  // Create Express app
  const app = express();

  // Trust proxy for secure cookies behind reverse proxy
  app.set('trust proxy', 1);

  // View engine setup
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Body parsing middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Connect to PostgreSQL
  console.log('[App] Connecting to PostgreSQL...');
  await initializeDatabase();
  console.log('[App] Connected to PostgreSQL');

  // Session middleware with PostgreSQL store
  const PgStore = pgSession(session);
  
  // Create connection string for session store
  const connectionString = `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;
  
  app.use(
    session({
      store: new PgStore({
        conString: connectionString,
        tableName: 'sessions',
        createTableIfMissing: true,
      }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax',
      },
    })
  );

  // Routes
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/', statusRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).render('error', {
      title: 'Not Found',
      message: 'The page you are looking for does not exist.',
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('[App] Unhandled error:', err);

    res.status(500).render('error', {
      title: 'Error',
      message: config.nodeEnv === 'production' 
        ? 'An unexpected error occurred.' 
        : err.message,
    });
  });

  // Start the scheduler
  scheduler.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[App] Shutting down...');
    scheduler.stop();
    await closeDatabase();
    console.log('[App] Goodbye!');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[App] Received SIGTERM, shutting down...');
    scheduler.stop();
    await closeDatabase();
    process.exit(0);
  });

  // Start server
  app.listen(config.port, () => {
    console.log(`[App] ApexMonitor running on http://localhost:${config.port}`);
    console.log(`[App] Status page: http://localhost:${config.port}/`);
    console.log(`[App] Admin panel: http://localhost:${config.port}/admin`);
  });
}

// Run the application
main().catch((error) => {
  console.error('[App] Failed to start:', error);
  process.exit(1);
});
