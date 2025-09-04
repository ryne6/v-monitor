import { Monitor, MonitorErrorType } from '@monitor/sdk';

let monitor: Monitor | null = null;

export function getMonitor() {
  if (monitor) return monitor;
  monitor = new Monitor({
    report: {
      url: '/api/v1/errors/report',
      transport: { type: 'auto' },
      aggregator: { windowMs: 3000, maxBatch: 10, rateLimitPerMinute: 120 },
      retry: { enabled: true, maxAttempts: 3, initialDelayMs: 1000 },
    },
    network: { enabled: true, monitorFetch: true, monitorXHR: true, excludePatterns: ['/errors/report'] },
    js: { enabled: true },
    resource: { enabled: true },
    performance: { enabled: true, monitorWebVitals: true },
  });
  return monitor;
}

export { MonitorErrorType };
