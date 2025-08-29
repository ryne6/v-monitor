import type { ErrorInfo, MonitorConfig } from '../types';
import type { ReporterTransport } from './types';

type XHRReporterOptions = MonitorConfig & { url?: string };

export class XHRReporter implements ReporterTransport {
  private options: XHRReporterOptions;

  constructor(options: XHRReporterOptions = {}) {
    this.options = options;
  }

  report(error: ErrorInfo): boolean {
    const url = (this.options as any).url as string | undefined;
    if (!url) return false;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      // fire-and-forget; no handlers to avoid recursion with our interceptors
      xhr.send(JSON.stringify(this.buildPayload(error)));
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
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      const payload = {
        timestamp: Date.now(),
        count: errors.length,
        errors: errors.map(e => this.buildPayload(e))
      };
      xhr.send(JSON.stringify(payload));
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


