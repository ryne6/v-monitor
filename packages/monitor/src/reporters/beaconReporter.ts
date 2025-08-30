import type { ErrorInfo } from '../types';

/**
 * BeaconReporter 用于在页面卸载时发送最后的错误报告
 * 不继承自 BaseTransport 因为它不需要重试机制
 */
export class BeaconReporter {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * 使用 Beacon API 发送单个错误
   * 主要用于页面卸载时的最后发送尝试
   */
  public sendReport(error: ErrorInfo): boolean {
    if (!this.url || !navigator.sendBeacon) return false;

    try {
      const blob = new Blob(
        [JSON.stringify(this.buildPayload(error))],
        { type: 'application/json' }
      );

      return navigator.sendBeacon(this.url, blob);
    } catch {
      return false;
    }
  }

  /**
   * 使用 Beacon API 批量发送错误
   * 主要用于页面卸载时的最后发送尝试
   */
  public sendBatchReport(errors: ErrorInfo[]): boolean {
    if (!errors.length || !this.url || !navigator.sendBeacon) return false;

    try {
      const payload = {
        timestamp: Date.now(),
        count: errors.length,
        errors: errors.map(e => this.buildPayload(e))
      };

      const blob = new Blob(
        [JSON.stringify(payload)],
        { type: 'application/json' }
      );

      return navigator.sendBeacon(this.url, blob);
    } catch {
      return false;
    }
  }

  /**
   * 检查浏览器是否支持 Beacon API
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.sendBeacon;
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
