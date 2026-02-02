import { MonitorConfig } from '../models';

/**
 * Result of a monitor check
 */
export interface CheckResult {
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  error?: string;
}

/**
 * Monitor Plugin Interface
 * All monitor types must implement this interface
 */
export interface MonitorPlugin {
  type: 'http' | 'ping' | 'dns';
  check(config: MonitorConfig): Promise<CheckResult>;
}
