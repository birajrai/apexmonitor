import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration loaded from environment variables
 */
export const config = {
  // Server settings
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // PostgreSQL connection
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'apexmonitor',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  // Session configuration
  sessionSecret: process.env.SESSION_SECRET || 'change-this-in-production',

  // Discord webhook for notifications
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',

  // Data retention settings (in days)
  checkRetentionDays: parseInt(process.env.CHECK_RETENTION_DAYS || '30', 10),

  // Scheduler settings
  schedulerIntervalMs: 60 * 1000, // 60 seconds

  // Incident settings
  consecutiveFailuresThreshold: 3, // 3 failures to trigger DOWN
  incidentCooldownMinutes: 10, // 10 minutes cooldown between notifications
};
