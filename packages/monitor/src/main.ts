import type { ErrorInfo, MonitorConfig } from './types';
import { JSErrorHandler } from './handlers/jsErrorHandler';
import { ResourceErrorHandler } from './handlers/resourceErrorHandler';
import { NetworkErrorHandler } from './handlers/networkErrorHandler';
import { Reporter } from './reporters';
import type { ReporterTransport } from './reporters/types';
export * from './reporters';

// Export types and enums
export * from './types';

export class Monitor {
  private errorHandlers: ((error: ErrorInfo) => void)[] = [];
  private jsErrorHandler: JSErrorHandler;
  private resourceErrorHandler: ResourceErrorHandler;
  private networkErrorHandler: NetworkErrorHandler;
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
      resource: {
        enabled: true,
        ...config.resource
      },
      ...config
    };

    this.jsErrorHandler = new JSErrorHandler(this.triggerError.bind(this));
    this.resourceErrorHandler = new ResourceErrorHandler(this.triggerError.bind(this));
    this.networkErrorHandler = new NetworkErrorHandler(this.triggerError.bind(this), this.config.network);
    
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
    
    // 如果有配置上报，则进行上报
    if (this.reporter) {
      this.reporter.report(error);
    }
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
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });
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
  }
}