import type { ErrorInfo } from '../types';
import { BaseTransport } from './baseTransport';

export class XHRReporter extends BaseTransport {
  protected sendReport(error: ErrorInfo): Promise<boolean> {
    return new Promise((resolve) => {
      const url = this.config.report?.url;
      if (!url) return resolve(false);

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        // Add custom headers
        const customHeaders = this.config.report?.transport?.headers;
        if (customHeaders) {
          Object.entries(customHeaders).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }

        xhr.onload = () => {
          resolve(xhr.status >= 200 && xhr.status < 300);
        };

        xhr.onerror = () => {
          resolve(false);
        };

        xhr.send(JSON.stringify(this.buildPayload(error)));
      } catch {
        resolve(false);
      }
    });
  }

  protected sendBatchReport(errors: ErrorInfo[]): Promise<boolean> {
    return new Promise((resolve) => {
      if (!errors.length) return resolve(false);
      const url = this.config.report?.url;
      if (!url) return resolve(false);

      try {
        const xhr = new XMLHttpRequest();
        const batchUrl = url.endsWith('/batch') ? url : (url.endsWith('/report') ? `${url}/batch` : `${url}/batch`);
        xhr.open('POST', batchUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        // Add custom headers
        const customHeaders = this.config.report?.transport?.headers;
        if (customHeaders) {
          Object.entries(customHeaders).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }

        xhr.onload = () => {
          resolve(xhr.status >= 200 && xhr.status < 300);
        };

        xhr.onerror = () => {
          resolve(false);
        };

        const payload = {
          timestamp: Date.now(),
          count: errors.length,
          projectId: this.config.projectId,
          version: this.config.version,
          errors: errors.map(e => this.buildPayload(e))
        };
        
        xhr.send(JSON.stringify(payload));
      } catch {
        resolve(false);
      }
    });
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
      ...error,
      projectId: this.config.projectId,
      version: this.config.version,
    };
  }
}


