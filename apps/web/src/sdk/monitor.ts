import { Monitor, MonitorErrorType } from '@monitor/sdk';

declare const __APP_VERSION__: string;
declare const __PROJECT_ID__: string;

let monitor: Monitor | null = null;

export function getMonitor() {
  if (monitor) return monitor;
  monitor = new Monitor({
    report: { url: 'http://localhost:3001/api/v1/errors/report' },
    projectId: __PROJECT_ID__,
    version: __APP_VERSION__,
    replay: { useRrweb: false },
  } as any);
  return monitor;
}

export { MonitorErrorType };
