import type { ErrorInfo } from './types';
import { JSErrorHandler } from './handlers/jsErrorHandler';
import { ResourceErrorHandler } from './handlers/resourceErrorHandler';
import { NetworkErrorHandler } from './handlers/networkErrorHandler';

// 导出类型和枚举
export * from './types';

export class Monitor {
  private errorHandlers: ((error: ErrorInfo) => void)[] = [];
  private jsErrorHandler: JSErrorHandler;
  private resourceErrorHandler: ResourceErrorHandler;
  private networkErrorHandler: NetworkErrorHandler;

  constructor() {
    this.jsErrorHandler = new JSErrorHandler(this.triggerError.bind(this));
    this.resourceErrorHandler = new ResourceErrorHandler(this.triggerError.bind(this));
    this.networkErrorHandler = new NetworkErrorHandler(this.triggerError.bind(this));
  }

  onError(handler: (error: ErrorInfo) => void) {
    this.errorHandlers.push(handler);
  }

  // 触发错误处理器
  private triggerError(error: ErrorInfo) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });
  }

  // 销毁监控器
  destroy() {
    this.jsErrorHandler.destroy();
    this.resourceErrorHandler.destroy();
    this.networkErrorHandler.destroy();
  }
}