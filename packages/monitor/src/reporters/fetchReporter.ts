import type { ErrorInfo, MonitorConfig } from '../types';
import type { ReporterTransport } from './types';

type FetchReporterOptions = MonitorConfig & { url?: string };

export class FetchReporter implements ReporterTransport {
  private options: FetchReporterOptions;

  constructor(options: FetchReporterOptions = {}) {
    this.options = options;
  }

  report(error: ErrorInfo): boolean {
    const url = (this.options as any).url as string | undefined;
    if (!url) return false;
    try {
      // fire-and-forget; do not await
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildPayload(error)),
        keepalive: true
      });
      return true;
    } catch {
      return false;
    }
  }

  reportBatch(errors: ErrorInfo[]): boolean {
    if (!errors.length) return false;
    const url = (this.options as any).url as string | undefined;
    if (!url) return false;
    try {
      const payload = {
        timestamp: Date.now(),
        count: errors.length,
        errors: errors.map(e => this.buildPayload(e))
      };
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
      return true;
    } catch {
      return false;
    }
  }

  private buildPayload(error: ErrorInfo) {
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


