import { Sequelize } from 'sequelize';
import { config } from './config';

/**
 * Sequelize instance for PostgreSQL connection
 */
export const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    dialectOptions: {
      ssl: config.database.ssl ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
    pool: {
      max: 3,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

/**
 * Initialize database connection and sync models
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Database] PostgreSQL connection established');

    // Sync all models (creates tables if they don't exist)
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    console.log('[Database] Models synchronized');
  } catch (error) {
    console.error('[Database] Unable to connect to PostgreSQL:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  await sequelize.close();
  console.log('[Database] Connection closed');
}
