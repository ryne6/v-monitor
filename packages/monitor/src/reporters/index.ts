import type { ErrorInfo, MonitorConfig } from '../types';
import { BeaconReporter } from './beaconReporter';
import type { ReporterTransport } from './types';
export { FetchReporter } from './fetchReporter';
export { XHRReporter } from './xhrReporter';
export { ReporterAggregator } from './aggregator';

export interface ReportFacadeOptions extends MonitorConfig {
  url?: string;
}

export class Reporter {
  private transport: ReporterTransport | null = null;

  constructor(options: ReportFacadeOptions = {}) {
    if (BeaconReporter.isSupported()) {
      this.transport = new BeaconReporter(options);
      (this as any).config = options;
    }
  }

  report(error: ErrorInfo): boolean {
    return this.transport ? this.transport.report(error) : false;
  }

  reportBatch(errors: ErrorInfo[]): boolean {
    return this.transport ? this.transport.reportBatch(errors) : false;
  }

  // Allow injecting a custom transport (DIP)
  setTransport(transport: ReporterTransport) {
    this.transport = transport;
  }
}

export type { ReporterTransport } from './types';


