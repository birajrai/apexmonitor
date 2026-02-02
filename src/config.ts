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

  // MongoDB connection
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/apexmonitor',

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
