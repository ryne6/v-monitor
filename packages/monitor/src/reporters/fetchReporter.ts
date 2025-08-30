import type { ErrorInfo } from '../types';
import { BaseTransport } from './baseTransport';

export class FetchReporter extends BaseTransport {
  protected async sendReport(error: ErrorInfo): Promise<boolean> {
    const url = this.config.report?.url;
    if (!url) return false;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.report?.transport?.headers
        },
        body: JSON.stringify(this.buildPayload(error)),
        keepalive: true
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  protected async sendBatchReport(errors: ErrorInfo[]): Promise<boolean> {
    if (!errors.length) return false;
    const url = this.config.report?.url;
    if (!url) return false;

    try {
      const payload = {
        timestamp: Date.now(),
        count: errors.length,
        errors: errors.map(e => this.buildPayload(e))
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.report?.transport?.headers
        },
        body: JSON.stringify(payload),
        keepalive: true
      });

      return response.ok;
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


