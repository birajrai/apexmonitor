import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database';

/**
 * Monitor types supported by the system
 */
export type MonitorType = 'http' | 'ping' | 'dns';

/**
 * HTTP monitor configuration
 */
export interface HttpMonitorConfig {
  url: string;
  method?: 'GET' | 'POST' | 'HEAD';
  expectedStatusCode?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * Ping monitor configuration
 */
export interface PingMonitorConfig {
  host: string;
  timeoutMs?: number;
}

/**
 * DNS monitor configuration
 */
export interface DnsMonitorConfig {
  hostname: string;
  recordType?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  expectedValue?: string;
}

/**
 * Union type for all monitor configurations
 */
export type MonitorConfig = HttpMonitorConfig | PingMonitorConfig | DnsMonitorConfig;

/**
 * Service attributes interface
 */
export interface ServiceAttributes {
  id: number;
  name: string;
  group: string;
  monitorType: MonitorType;
  monitorConfig: MonitorConfig;
  isActive: boolean;
  showOnStatusPage: boolean;
  statusPageLabel?: string;
  statusPageOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service creation attributes (id and timestamps are auto-generated)
 */
export interface ServiceCreationAttributes extends Optional<ServiceAttributes, 'id' | 'group' | 'isActive' | 'showOnStatusPage' | 'statusPageOrder' | 'createdAt' | 'updatedAt'> {}

/**
 * Service model
 * Represents a monitored service
 */
export class Service extends Model<ServiceAttributes, ServiceCreationAttributes> implements ServiceAttributes {
  public id!: number;
  public name!: string;
  public group!: string;
  public monitorType!: MonitorType;
  public monitorConfig!: MonitorConfig;
  public isActive!: boolean;
  public showOnStatusPage!: boolean;
  public statusPageLabel?: string;
  public statusPageOrder!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Service.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    group: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Default',
    },
    monitorType: {
      type: DataTypes.ENUM('http', 'ping', 'dns'),
      allowNull: false,
    },
    monitorConfig: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    showOnStatusPage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    statusPageLabel: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    statusPageOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    tableName: 'services',
    timestamps: true,
    indexes: [
      {
        fields: ['isActive'],
      },
      {
        fields: ['showOnStatusPage', 'statusPageOrder'],
      },
    ],
  }
);
