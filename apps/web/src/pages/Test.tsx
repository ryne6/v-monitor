import React, { useState } from 'react';
import { getMonitor, MonitorErrorType } from '../sdk/monitor';

export default function Test() {
  const [logs, setLogs] = useState<string[]>([]);

  function log(msg: string) {
    setLogs(prev => [new Date().toLocaleTimeString() + ' ' + msg, ...prev]);
  }

  const triggerJsError = () => {
    log('Trigger JS error');
    // @ts-ignore
    (window as any).notDefined.method();
  };

  const triggerResourceError = () => {
    log('Trigger Resource error (broken image)');
    const img = new Image();
    img.src = '/__not_exists__/broken.png?_=' + Date.now();
    document.body.appendChild(img);
  };

  const triggerNetworkError = async () => {
    log('Trigger Network error (404 fetch)');
    try {
      await fetch('/api/v1/__not_exists__?t=' + Date.now());
    } catch (e) {
      // ignore
    }
  };

  const triggerManualReport = () => {
    log('Trigger manual report');
    const monitor = getMonitor();
    monitor.reportError({
      type: MonitorErrorType.JS,
      message: 'Manual report from Test page',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    } as any);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">SDK Test Page</h1>
        <p className="text-sm text-gray-500">Trigger different errors to verify reporting.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button className="px-4 py-2 rounded-md bg-red-500 text-white" onClick={triggerJsError}>
          JS Error
        </button>
        <button className="px-4 py-2 rounded-md bg-amber-500 text-white" onClick={triggerResourceError}>
          Resource Error
        </button>
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={triggerNetworkError}>
          Network Error
        </button>
        <button className="px-4 py-2 rounded-md bg-gray-800 text-white" onClick={triggerManualReport}>
          Manual Report
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2">Local Logs</h2>
        <div className="text-xs bg-gray-50 border rounded p-3 space-y-1 max-h-64 overflow-auto">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}


