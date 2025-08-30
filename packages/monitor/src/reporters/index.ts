import type { ErrorInfo, MonitorConfig } from '../types';
import { FetchReporter } from './fetchReporter';
import { XHRReporter } from './xhrReporter';
import type { ReporterTransport } from './types';
export { FetchReporter } from './fetchReporter';
export { XHRReporter } from './xhrReporter';
export { ReporterAggregator } from './aggregator';

export class Reporter {
  private transport: ReporterTransport | null = null;

  constructor(options: MonitorConfig = {}) {
    this.transport = this.createTransport(options);
  }

  private createTransport(options: MonitorConfig): ReporterTransport | null {
    const transportType = options.report?.transport?.type || 'auto';
    const fallbackEnabled = options.report?.transport?.fallback?.enabled ?? true;
    const customPriority = options.report?.transport?.fallback?.priority;

    if (transportType !== 'auto') {
      // 直接使用指定的 transport
      return this.createSpecificTransport(transportType, options);
    }

    // 默认优先级顺序
    const defaultPriority = ['fetch', 'xhr'] as const;
    const priority = customPriority || defaultPriority;

    // 按优先级尝试创建 transport
    for (const type of priority) {
      const transport = this.createSpecificTransport(type, options);
      if (transport && fallbackEnabled) {
        return transport;
      }
    }

    return null;
  }

  private createSpecificTransport(type: 'fetch' | 'xhr', options: MonitorConfig): ReporterTransport | null {
    switch (type) {
      case 'fetch':
        return typeof fetch !== 'undefined' ? new FetchReporter(options) : null;
      case 'xhr':
        return typeof XMLHttpRequest !== 'undefined' ? new XHRReporter(options) : null;
      default:
        return null;
    }
  }

  report(error: ErrorInfo): boolean | Promise<boolean> {
    return this.transport ? this.transport.report(error) : false;
  }

  reportBatch(errors: ErrorInfo[]): boolean | Promise<boolean> {
    return this.transport ? this.transport.reportBatch(errors) : false;
  }

  setTransport(transport: ReporterTransport) {
    this.transport = transport;
  }
}

export type { ReporterTransport } from './types';


