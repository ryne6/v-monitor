import type { ErrorInfo, MonitorConfig } from './types';
import { JSErrorHandler } from './handlers/jsErrorHandler';
import { ResourceErrorHandler } from './handlers/resourceErrorHandler';
import { NetworkErrorHandler } from './handlers/networkErrorHandler';

// Export types and enums
export * from './types';

export class Monitor {
  private errorHandlers: ((error: ErrorInfo) => void)[] = [];
  private jsErrorHandler: JSErrorHandler;
  private resourceErrorHandler: ResourceErrorHandler;
  private networkErrorHandler: NetworkErrorHandler;
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
      }
    };

    this.jsErrorHandler = new JSErrorHandler(this.triggerError.bind(this));
    this.resourceErrorHandler = new ResourceErrorHandler(this.triggerError.bind(this));
    this.networkErrorHandler = new NetworkErrorHandler(this.triggerError.bind(this), this.config.network);
  }

  onError(handler: (error: ErrorInfo) => void) {
    this.errorHandlers.push(handler);
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