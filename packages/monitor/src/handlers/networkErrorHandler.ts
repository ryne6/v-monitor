import { MonitorErrorType, type ErrorInfo } from '../types';

export class NetworkErrorHandler {
  private errorCallback: (error: ErrorInfo) => void;
  private originalFetch: typeof fetch;
  private originalXMLHttpRequest: typeof XMLHttpRequest;

  constructor(errorCallback: (error: ErrorInfo) => void) {
    this.errorCallback = errorCallback;
    this.originalFetch = window.fetch;
    this.originalXMLHttpRequest = window.XMLHttpRequest;
    this.init();
  }

  // 初始化网络错误捕获
  private init() {
    this.interceptFetch();
    this.interceptXMLHttpRequest();
  }

  // 拦截 fetch 请求
  private interceptFetch() {
    const originalFetch = this.originalFetch;
    const self = this;

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      // 提取请求信息
      const requestDetails = self.extractRequestDetails(url, init);

      try {
        const response = await originalFetch.call(window, input, init);
        const duration = Date.now() - startTime;

        // 检查 HTTP 状态错误
        if (!response.ok) {
          // 尝试读取响应内容
          const responseDetails = await self.extractResponseDetails(response.clone());
          
          self.reportNetworkError({
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            duration,
            type: 'fetch',
            message: `HTTP ${response.status}: ${response.statusText}`,
            ...requestDetails,
            ...responseDetails
          });
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // 网络级别错误（连接失败、超时等）
        self.reportNetworkError({
          url,
          method,
          status: 0,
          statusText: 'Network Error',
          duration,
          type: 'fetch',
          message: error instanceof Error ? error.message : 'Network request failed',
          error: error instanceof Error ? error : undefined,
          ...requestDetails
        });

        throw error; // 重新抛出错误，保持原有行为
      }
    };
  }

  // 拦截 XMLHttpRequest
  private interceptXMLHttpRequest() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const networkHandler = this; // 保存 this 引用

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
      // 保存请求信息
      (this as any)._monitor = {
        method,
        url: url.toString(),
        startTime: 0,
        requestDetails: networkHandler.extractXHRRequestDetails(url.toString())
      };

      return originalOpen.call(this, method, url, !!async, user, password);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const monitor = (this as any)._monitor;
      if (monitor) {
        monitor.startTime = Date.now();
        monitor.requestDetails.requestBody = networkHandler.serializeBody(body);

        // 监听各种事件
        this.addEventListener('error', () => {
          const duration = Date.now() - monitor.startTime;
          networkHandler.reportNetworkError({
            url: monitor.url,
            method: monitor.method,
            status: this.status || 0,
            statusText: this.statusText || 'Network Error',
            duration,
            type: 'xhr',
            message: 'XMLHttpRequest failed',
            ...monitor.requestDetails
          });
        });

        this.addEventListener('timeout', () => {
          const duration = Date.now() - monitor.startTime;
          networkHandler.reportNetworkError({
            url: monitor.url,
            method: monitor.method,
            status: this.status || 0,
            statusText: 'Timeout',
            duration,
            type: 'xhr',
            message: 'XMLHttpRequest timeout',
            ...monitor.requestDetails
          });
        });

        this.addEventListener('load', () => {
          const duration = Date.now() - monitor.startTime;
          
          // 检查 HTTP 状态错误
          if (this.status >= 400) {
            // 尝试获取 XHR 响应内容
            let responseBody: any;
            try {
              const contentType = this.getResponseHeader('content-type') || '';
              if (contentType.includes('application/json')) {
                responseBody = JSON.parse(this.responseText);
              } else if (contentType.includes('text/')) {
                responseBody = this.responseText.length > 1000 
                  ? this.responseText.substring(0, 1000) + '...' 
                  : this.responseText;
              } else {
                responseBody = `[${contentType || 'Unknown'}: ${this.responseText.length} chars]`;
              }
            } catch {
              responseBody = this.responseText || '[No response body]';
            }

            // 提取响应头 (XHR 只能获取部分响应头)
            const responseHeaders: Record<string, string> = {};
            try {
              const headerString = this.getAllResponseHeaders();
              if (headerString) {
                headerString.split('\r\n').forEach(line => {
                  const [key, value] = line.split(': ');
                  if (key && value) {
                    responseHeaders[key.toLowerCase()] = value;
                  }
                });
              }
            } catch {
              // 忽略响应头提取错误
            }

            networkHandler.reportNetworkError({
              url: monitor.url,
              method: monitor.method,
              status: this.status,
              statusText: this.statusText,
              duration,
              type: 'xhr',
              message: `HTTP ${this.status}: ${this.statusText}`,
              ...monitor.requestDetails,
              responseBody,
              responseHeaders
            });
          }
        });
      }

      return originalSend.call(this, body);
    };
  }

  // 提取 fetch 请求详情
  private extractRequestDetails(url: string, init?: RequestInit) {
    const urlObj = new URL(url, window.location.href);
    
    return {
      requestQuery: urlObj.search,
      requestBody: this.serializeBody(init?.body),
      requestHeaders: this.extractHeaders(init?.headers)
    };
  }

  // 提取 XHR 请求详情
  private extractXHRRequestDetails(url: string) {
    const urlObj = new URL(url, window.location.href);
    
    return {
      requestQuery: urlObj.search,
      requestBody: undefined, // 会在 send 时设置
      requestHeaders: {} // XHR 的 headers 较难获取，暂时留空
    };
  }

  // 序列化请求体
  private serializeBody(body: any): any {
    if (!body) return undefined;
    
    try {
      if (typeof body === 'string') return body;
      if (body instanceof FormData) {
        const obj: Record<string, any> = {};
        for (const [key, value] of body.entries()) {
          obj[key] = value;
        }
        return obj;
      }
      if (body instanceof URLSearchParams) {
        return Object.fromEntries(body.entries());
      }
      if (body instanceof Blob) {
        return `[Blob: ${body.type}, size: ${body.size}]`;
      }
      if (body instanceof ArrayBuffer) {
        return `[ArrayBuffer: size: ${body.byteLength}]`;
      }
      return String(body);
    } catch (error) {
      return '[Unable to serialize body]';
    }
  }

  // 提取请求头
  private extractHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    
    try {
      if (headers instanceof Headers) {
        const obj: Record<string, string> = {};
        headers.forEach((value, key) => {
          obj[key] = value;
        });
        return obj;
      }
      if (Array.isArray(headers)) {
        const obj: Record<string, string> = {};
        headers.forEach(([key, value]) => {
          obj[key] = value;
        });
        return obj;
      }
      return headers as Record<string, string>;
    } catch (error) {
      return {};
    }
  }

  // 提取响应详情
  private async extractResponseDetails(response: Response) {
    try {
      // 提取响应头
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // 尝试读取响应体
      let responseBody: any;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = '[Invalid JSON Response]';
        }
      } else if (contentType.includes('text/')) {
        try {
          const text = await response.text();
          responseBody = text.length > 1000 ? text.substring(0, 1000) + '...' : text;
        } catch {
          responseBody = '[Unable to read text response]';
        }
      } else {
        responseBody = `[${contentType || 'Unknown content type'}: ${response.headers.get('content-length') || 'unknown'} bytes]`;
      }

      return {
        responseBody,
        responseHeaders
      };
    } catch (error) {
      return {
        responseBody: '[Unable to extract response]',
        responseHeaders: {}
      };
    }
  }

  // 将 reportNetworkError 设为公开方法，供 XMLHttpRequest 事件处理器调用
  public reportNetworkError(details: {
    url: string;
    method: string;
    status: number;
    statusText: string;
    duration: number;
    type: 'fetch' | 'xhr';
    message: string;
    error?: Error;
    requestQuery?: string;
    requestBody?: any;
    requestHeaders?: Record<string, string>;
    responseBody?: any;
    responseHeaders?: Record<string, string>;
  }) {
    const errorInfo: ErrorInfo = {
      type: MonitorErrorType.NETWORK,
      message: `${details.type.toUpperCase()} ${details.method} ${details.url} - ${details.message}`,
      filename: details.url,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      // 网络请求特有信息
      requestMethod: details.method,
      requestUrl: details.url,
      responseStatus: details.status,
      responseStatusText: details.statusText,
      requestDuration: details.duration,
      requestType: details.type,
      requestQuery: details.requestQuery,
      requestBody: details.requestBody,
      requestHeaders: details.requestHeaders,
      responseBody: details.responseBody,
      responseHeaders: details.responseHeaders,
      stack: details.error?.stack
    };

    this.errorCallback(errorInfo);
  }



  // 销毁拦截器
  destroy() {
    // 恢复原始方法
    window.fetch = this.originalFetch;
    window.XMLHttpRequest = this.originalXMLHttpRequest;
  }
}
