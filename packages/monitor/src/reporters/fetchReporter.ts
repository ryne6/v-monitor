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

    // 如果是单条上报路径，如 /errors/report，则批量上报改为 /errors/report/batch
    const batchUrl = url.endsWith('/batch')
      ? url
      : (url.endsWith('/report') ? `${url}/batch` : `${url}/batch`);

    try {
      const payload = {
        timestamp: Date.now(),
        count: errors.length,
        errors: errors.map(e => this.buildPayload(e))
      };

      const response = await fetch(batchUrl, {
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
    // 将 SDK 内部的类型（小写）映射为服务端 DTO 枚举（大写）
    const typeMap: Record<string, string> = {
      js: 'JS',
      resource: 'RESOURCE',
      network: 'NETWORK',
      performance: 'PERFORMANCE'
    };
    const mappedType = (typeMap as any)[(error as any).type] || (error as any).type;
    return {
      filename: error.filename,
      line: error.line,
      column: error.column,
      type: mappedType,
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
      // 展开剩余字段，但避免覆盖上面已经标准化的字段
      message: error.message,
      stack: error.stack,
      timestamp: error.timestamp,
      url: error.url,
      userAgent: error.userAgent
    };
  }
}


