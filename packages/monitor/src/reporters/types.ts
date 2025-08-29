import type { ErrorInfo } from '../types';

// Abstraction for reporting transports (DIP)
export interface ReporterTransport {
  report(error: ErrorInfo): boolean;
  reportBatch(errors: ErrorInfo[]): boolean;
}


