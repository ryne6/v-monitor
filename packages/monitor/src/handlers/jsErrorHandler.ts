import { MonitorErrorType, type ErrorInfo } from '../types';

export class JSErrorHandler {
  private errorCallback: (error: ErrorInfo) => void;

  constructor(errorCallback: (error: ErrorInfo) => void) {
    this.errorCallback = errorCallback;
    this.init();
  }

  // Initialize JavaScript error capture
  private init() {
    // Capture synchronous errors
    window.onerror = this.handleError;

    // Capture Promise rejection errors
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  // Destroy listeners
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
    return false; // Don't prevent default error handling
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
