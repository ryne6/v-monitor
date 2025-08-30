import type { ErrorInfo, MonitorConfig } from '../types';
import { BaseTransport } from './baseTransport';
import { FetchReporter } from './fetchReporter';

export class BeaconReporter extends BaseTransport {
  private fallbackReporter: FetchReporter;
  private isUnloading: boolean = false;

  constructor(config: MonitorConfig) {
    super(config);
    this.fallbackReporter = new FetchReporter(config);
    
    // 监听页面卸载事件
    if (typeof window !== 'undefined') {
      window.addEventListener('unload', () => {
        this.isUnloading = true;
      });
      window.addEventListener('beforeunload', () => {
        this.isUnloading = true;
      });
    }
  }

  protected async sendReport(error: ErrorInfo): Promise<boolean> {
    const url = this.config.report?.url;
    if (!url) return false;

    // 在页面卸载时使用 sendBeacon
    if (this.isUnloading) {
      try {
        return navigator.sendBeacon(url, JSON.stringify(this.buildPayload(error)));
      } catch {
        return false;
      }
    }

    // 在正常情况下使用 fetch，以便支持重试
    return this.fallbackReporter.report(error);
  }

  protected async sendBatchReport(errors: ErrorInfo[]): Promise<boolean> {
    if (!errors.length) return false;
    const url = this.config.report?.url;
    if (!url) return false;

    // 在页面卸载时使用 sendBeacon
    if (this.isUnloading) {
      try {
        const batch = {
          timestamp: Date.now(),
          count: errors.length,
          errors: errors.map(e => this.buildPayload(e))
        };
        return navigator.sendBeacon(url, JSON.stringify(batch));
      } catch {
        return false;
      }
    }

    // 在正常情况下使用 fetch，以便支持重试
    return this.fallbackReporter.reportBatch(errors);
  }

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
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


