import type { ErrorInfo, MonitorConfig } from '../types';
import type { ReporterTransport } from './types';

export class BeaconReporter implements ReporterTransport {
  private config: MonitorConfig;

  constructor(config: MonitorConfig) {
    this.config = {
      network: {
        enabled: true,
        monitorFetch: true,
        monitorXHR: true,
        excludePatterns: [],
        maxResponseLength: 1000,
        detailed: true,
        ...config.network
      },
      ...config
    };
  }

  report(error: ErrorInfo): boolean {
    if (!this.config.network?.enabled) return false;
    try {
      const url = (this as any).config?.url as string | undefined;
      if (!url) return false;
      return navigator.sendBeacon(url, JSON.stringify(this.buildReportData(error)));
    } catch {
      return false;
    }
  }

  reportBatch(errors: ErrorInfo[]): boolean {
    if (!this.config.network?.enabled || errors.length === 0) return false;
    try {
      const url = (this as any).config?.url as string | undefined;
      if (!url) return false;
      const batch = {
        timestamp: Date.now(),
        count: errors.length,
        errors: errors.map(e => this.buildReportData(e))
      };
      return navigator.sendBeacon(url, JSON.stringify(batch));
    } catch {
      return false;
    }
  }

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
  }

  private buildReportData(error: ErrorInfo) {
    return {
      filename: error.filename,
      line: error.line,
      column: error.column,
      ...(error.type === 'network' && {
        requestMethod: error.requestMethod,
        requestUrl: error.requestUrl,
        responseStatus: error.responseStatus,
        responseStatusText: error.responseStatusText,
        requestDuration: error.requestDuration,
        requestType: error.requestType,
        requestQuery: error.requestQuery,
        requestBody: error.requestBody,
        requestHeaders: error.requestHeaders,
        responseBody: error.responseBody,
        responseHeaders: error.responseHeaders
      }),
      ...error
    };
  }
}


