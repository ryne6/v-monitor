import { MonitorErrorType, type ErrorInfo } from '../types';

export class JSErrorHandler {
  private errorCallback: (error: ErrorInfo) => void;

  constructor(errorCallback: (error: ErrorInfo) => void) {
    this.errorCallback = errorCallback;
    this.init();
  }

  // 初始化 JavaScript 错误捕获
  private init() {
    // 捕获同步错误
    window.onerror = this.handleError;

    // 捕获 Promise 拒绝错误
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  // 销毁监听器
  destroy() {
    window.onerror = null;
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleError = (message: string | Event, filename?: string, line?: number, column?: number, error?: Error) => {
    const errorInfo: ErrorInfo = {
      type: MonitorErrorType.JS,
      message: String(message),
      stack: error?.stack,
      filename,
      line,
      column,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.errorCallback(errorInfo);
    return false; // 不阻止默认错误处理
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    const errorInfo: ErrorInfo = {
      type: MonitorErrorType.JS,
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.errorCallback(errorInfo);
  };
}
