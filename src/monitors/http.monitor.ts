import { MonitorPlugin, CheckResult } from './types';
import { HttpMonitorConfig } from '../models';

/**
 * HTTP Monitor Plugin
 * Checks HTTP/HTTPS endpoints for availability
 */
export const httpMonitor: MonitorPlugin = {
  type: 'http',

  async check(config: HttpMonitorConfig): Promise<CheckResult> {
    const {
      url,
      method = 'GET',
      expectedStatusCode = 200,
      timeoutMs = 30000,
      headers = {},
    } = config;

    const startTime = Date.now();

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'ApexMonitor/1.0',
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;

      // Check if status code matches expected
      if (response.status === expectedStatusCode) {
        return {
          status: 'UP',
          responseTimeMs,
        };
      } else {
        return {
          status: 'DOWN',
          responseTimeMs,
          error: `Expected status ${expectedStatusCode}, got ${response.status}`,
        };
      }
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Request timeout after ${timeoutMs}ms`;
        } else {
          errorMessage = error.message;
        }
      }

      return {
        status: 'DOWN',
        responseTimeMs,
        error: errorMessage,
      };
    }
  },
};
