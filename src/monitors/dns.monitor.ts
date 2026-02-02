import dns from 'dns';
import { promisify } from 'util';
import { MonitorPlugin, CheckResult } from './types';
import { DnsMonitorConfig } from '../models';

// Promisified DNS resolution functions
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveCname = promisify(dns.resolveCname);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

/**
 * DNS Monitor Plugin
 * Checks DNS resolution for a hostname
 */
export const dnsMonitor: MonitorPlugin = {
  type: 'dns',

  async check(config: DnsMonitorConfig): Promise<CheckResult> {
    const { hostname, recordType = 'A', expectedValue } = config;
    const startTime = Date.now();

    try {
      let records: string[] = [];

      // Resolve based on record type
      switch (recordType) {
        case 'A':
          records = await resolve4(hostname);
          break;
        case 'AAAA':
          records = await resolve6(hostname);
          break;
        case 'CNAME':
          records = await resolveCname(hostname);
          break;
        case 'MX':
          const mxRecords = await resolveMx(hostname);
          records = mxRecords.map((r) => `${r.priority} ${r.exchange}`);
          break;
        case 'TXT':
          const txtRecords = await resolveTxt(hostname);
          records = txtRecords.map((r) => r.join(''));
          break;
        default:
          throw new Error(`Unsupported record type: ${recordType}`);
      }

      const responseTimeMs = Date.now() - startTime;

      // Check if we got any records
      if (records.length === 0) {
        return {
          status: 'DOWN',
          responseTimeMs,
          error: `No ${recordType} records found for ${hostname}`,
        };
      }

      // If expectedValue is specified, check if it matches
      if (expectedValue) {
        const found = records.some(
          (record) => record.toLowerCase() === expectedValue.toLowerCase()
        );

        if (!found) {
          return {
            status: 'DOWN',
            responseTimeMs,
            error: `Expected value "${expectedValue}" not found in records: ${records.join(', ')}`,
          };
        }
      }

      return {
        status: 'UP',
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      let errorMessage = 'DNS resolution failed';

      if (error instanceof Error) {
        // Provide more friendly error messages for common DNS errors
        if (error.message.includes('ENOTFOUND')) {
          errorMessage = `Hostname not found: ${hostname}`;
        } else if (error.message.includes('ETIMEOUT')) {
          errorMessage = 'DNS query timed out';
        } else if (error.message.includes('ENODATA')) {
          errorMessage = `No ${recordType} records found for ${hostname}`;
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
