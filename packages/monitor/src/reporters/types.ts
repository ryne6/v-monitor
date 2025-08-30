import type { ErrorInfo, MonitorConfig } from '../types';

// Abstraction for reporting transports (DIP)
export interface ReporterTransport {
  report(error: ErrorInfo): boolean | Promise<boolean>;
  reportBatch(errors: ErrorInfo[]): boolean | Promise<boolean>;
  getConfig?(): MonitorConfig;
}


