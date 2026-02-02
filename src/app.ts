import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import path from 'path';

import { config } from './config';
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

  // Body parsing middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Connect to MongoDB
  console.log('[App] Connecting to MongoDB...');
  await mongoose.connect(config.mongodbUri);
  console.log('[App] Connected to MongoDB');

  // Session middleware with MongoDB store
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: config.mongodbUri,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 1 day
      }),
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
    await mongoose.connection.close();
    console.log('[App] Goodbye!');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[App] Received SIGTERM, shutting down...');
    scheduler.stop();
    await mongoose.connection.close();
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
