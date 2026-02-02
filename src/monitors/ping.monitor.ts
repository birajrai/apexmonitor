import ping from 'ping';
import { MonitorPlugin, CheckResult } from './types';
import { PingMonitorConfig } from '../models';

/**
 * Ping Monitor Plugin
 * Checks host availability using ICMP ping
 */
export const pingMonitor: MonitorPlugin = {
  type: 'ping',

  async check(config: PingMonitorConfig): Promise<CheckResult> {
    const { host, timeoutMs = 5000 } = config;
    const startTime = Date.now();

    try {
      // Convert timeout to seconds for ping library
      const timeoutSeconds = Math.ceil(timeoutMs / 1000);

      const result = await ping.promise.probe(host, {
        timeout: timeoutSeconds,
      });

      const responseTimeMs = Date.now() - startTime;

      if (result.alive) {
        // Use the actual ping time if available, otherwise use our measured time
        const actualResponseTime = result.time !== 'unknown' 
          ? parseFloat(String(result.time)) 
          : responseTimeMs;

        return {
          status: 'UP',
          responseTimeMs: Math.round(actualResponseTime),
        };
      } else {
        return {
          status: 'DOWN',
          responseTimeMs,
          error: 'Host unreachable',
        };
      }
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      let errorMessage = 'Ping failed';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        status: 'DOWN',
        responseTimeMs,
        error: errorMessage,
      };
    }
  },
};
