import mongoose, { Schema, Document } from 'mongoose';

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
 * Service interface
 * Represents a monitored service
 */
export interface IService extends Document {
  name: string;
  group: string;
  monitorType: MonitorType;
  monitorConfig: MonitorConfig;
  isActive: boolean;
  showOnStatusPage: boolean;
  statusPageLabel?: string;
  statusPageOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    group: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      default: 'Default',
    },
    monitorType: {
      type: String,
      required: true,
      enum: ['http', 'ping', 'dns'],
    },
    monitorConfig: {
      type: Schema.Types.Mixed,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    showOnStatusPage: {
      type: Boolean,
      default: true,
    },
    statusPageLabel: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    statusPageOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of active services
ServiceSchema.index({ isActive: 1 });
// Index for status page queries
ServiceSchema.index({ showOnStatusPage: 1, statusPageOrder: 1 });

export const Service = mongoose.model<IService>('Service', ServiceSchema);
