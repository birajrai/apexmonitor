import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database';

/**
 * Settings attributes interface
 */
export interface SettingsAttributes {
  id: number;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Settings creation attributes
 */
export interface SettingsCreationAttributes extends Optional<SettingsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * Settings model
 * Key-value store for application settings
 */
export class Settings extends Model<SettingsAttributes, SettingsCreationAttributes> implements SettingsAttributes {
  public id!: number;
  public key!: string;
  public value!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  /**
   * Get a setting value by key
   */
  static async getValue(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await Settings.findOne({ where: { key } });
    return setting?.value ?? defaultValue;
  }

  /**
   * Set a setting value by key
   */
  static async setValue(key: string, value: string): Promise<Settings> {
    const [setting] = await Settings.upsert({ key, value });
    return setting;
  }

  /**
   * Get multiple settings as an object
   */
  static async getMultiple(keys: string[]): Promise<Record<string, string>> {
    const settings = await Settings.findAll({
      where: { key: keys },
    });
    
    const result: Record<string, string> = {};
    for (const key of keys) {
      const setting = settings.find(s => s.key === key);
      result[key] = setting?.value ?? '';
    }
    return result;
  }

  /**
   * Set multiple settings at once
   */
  static async setMultiple(values: Record<string, string>): Promise<void> {
    const entries = Object.entries(values);
    await Promise.all(entries.map(([key, value]) => Settings.upsert({ key, value })));
  }
}

Settings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'settings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['key'],
      },
    ],
  }
);

/**
 * Setting keys used in the application
 */
export const SETTING_KEYS = {
  // Notifications
  DISCORD_WEBHOOK_URL: 'discord_webhook_url',
  DISCORD_ENABLED: 'discord_enabled',
  
  // General
  SITE_NAME: 'site_name',
  CHECK_RETENTION_DAYS: 'check_retention_days',
  SCHEDULER_INTERVAL_SECONDS: 'scheduler_interval_seconds',
  CONSECUTIVE_FAILURES_THRESHOLD: 'consecutive_failures_threshold',
  INCIDENT_COOLDOWN_MINUTES: 'incident_cooldown_minutes',
} as const;
