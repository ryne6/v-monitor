import { Monitor, MonitorErrorType } from '@monitor/sdk';

declare const __APP_VERSION__: string;
declare const __PROJECT_ID__: string;

let monitor: Monitor | null = null;

export function getMonitor() {
  if (monitor) return monitor;
  monitor = new Monitor({
    report: {
      url: 'http://localhost:3001/api/v1/errors/report',
      transport: { type: 'auto' },
      aggregator: { windowMs: 3000, maxBatch: 10, rateLimitPerMinute: 120 },
      retry: { enabled: true, maxAttempts: 3, initialDelayMs: 1000 },
    },
    network: { enabled: true, monitorFetch: true, monitorXHR: true, excludePatterns: ['/errors/report'] },
    js: { enabled: true },
    resource: { enabled: true },
    performance: { enabled: true, monitorWebVitals: true },
    projectId: __PROJECT_ID__,
    version: __APP_VERSION__,
  } as any);
  return monitor;
}

export { MonitorErrorType };
