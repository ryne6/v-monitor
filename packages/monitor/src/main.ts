import type { ErrorInfo, MonitorConfig } from './types';
import { MonitorErrorType } from './types';
import { JSErrorHandler } from './handlers/jsErrorHandler';
import { ResourceErrorHandler } from './handlers/resourceErrorHandler';
import { NetworkErrorHandler } from './handlers/networkErrorHandler';
import { PerformanceHandler } from './handlers/performanceHandler';
import { Reporter } from './reporters';
import { SessionReplayHandler } from './handlers/replayHandler';
import type { ReporterTransport } from './reporters/types';
export * from './reporters';

// Export types and enums
export * from './types';

export class Monitor {
  private errorHandlers: ((error: ErrorInfo) => void)[] = [];
  private jsErrorHandler: JSErrorHandler;
  private resourceErrorHandler: ResourceErrorHandler;
  private networkErrorHandler: NetworkErrorHandler;
  private performanceHandler!: PerformanceHandler;
  private replayHandler!: SessionReplayHandler;
  private reporter: Reporter | null = null;
  private config: MonitorConfig;

  constructor(config: MonitorConfig = {}) {
    this.config = {
      network: {
        enabled: true,
        monitorFetch: true,
        monitorXHR: true,
        excludePatterns: ['logstores', 'sockjs', '/monitor', '/tracker'],
        maxResponseLength: 1000,
        detailed: true,
        ...config.network
      },
      js: {
        enabled: true,
        ...config.js
      },
      replay: {
        enabled: true,
        compress: true,
        ...config.replay
      },
      resource: {
        enabled: true,
        ...config.resource
      },
      ...config
    };

    this.jsErrorHandler = new JSErrorHandler(this.triggerError.bind(this));
    this.resourceErrorHandler = new ResourceErrorHandler(this.triggerError.bind(this));
    this.networkErrorHandler = new NetworkErrorHandler(this.triggerError.bind(this), this.config.network);
    // Only enable performance monitoring on first visit (per project/version)
    const shouldEnablePerf = (() => {
      try {
        if (typeof window === 'undefined') return true;
        const storage = window.localStorage || window.sessionStorage;
        const pid = (this.config as any).projectId || 'default';
        const ver = (this.config as any).version || '0';
        const key = `__monitor_perf_inited__:${pid}:${ver}`;
        const existed = storage.getItem(key);
        if (existed) return false;
        storage.setItem(key, String(Date.now()));
        return true;
      } catch {
        return true;
      }
    })();
    this.performanceHandler = new PerformanceHandler(
      this.triggerError.bind(this),
      { ...this.config.performance, enabled: shouldEnablePerf }
    );
    this.replayHandler = new SessionReplayHandler(this.config.replay as any);
    
    // 初始化 Reporter
    if (this.config.report?.url) {
      this.reporter = new Reporter(this.config);
    }
  }

  onError(handler: (error: ErrorInfo) => void) {
    this.errorHandlers.push(handler);
  }

  // 手动上报错误
  reportError(error: ErrorInfo) {
    // 触发错误处理器
    this.triggerError(error);
  }

  // 设置 Reporter
  setReporter(reporter: ReporterTransport) {
    if (this.reporter) {
      this.reporter.setTransport(reporter);
    } else {
      // 如果没有 reporter，创建一个新的
      this.reporter = new Reporter();
      this.reporter.setTransport(reporter);
    }
  }

  // Trigger error handlers
  private triggerError(error: ErrorInfo) {
    // attach replay snapshot only for JS errors to reduce payload size
    try {
      if (this.replayHandler && error?.type === MonitorErrorType.JS) {
        const snap = this.replayHandler.snapshot();
        if (snap) {
          (error as any).metadata = {
            ...(error as any).metadata,
            replay: snap,
          };
        }
      }
    } catch {}
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });

    // 自动上报：任何被捕获的错误都会尝试通过 reporter 上报
    if (this.reporter) {
      try {
        this.reporter.report(error);
      } catch (e) {
        // 避免上报过程影响捕获流程
        console.error('Auto report failed:', e);
      }
    }
  }

  // Get current configuration
  getConfig(): MonitorConfig {
    return this.config;
  }

  // Update configuration
  updateConfig(newConfig: Partial<MonitorConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      network: {
        ...this.config.network,
        ...newConfig.network
      },
      js: {
        ...this.config.js,
        ...newConfig.js
      },
      resource: {
        ...this.config.resource,
        ...newConfig.resource
      }
    };
  }

  // Destroy monitor
  destroy() {
    this.jsErrorHandler.destroy();
    this.resourceErrorHandler.destroy();
    this.networkErrorHandler.destroy();
    this.performanceHandler.destroy();
    this.replayHandler?.destroy();
  }
}