import { MonitorErrorType, type ErrorInfo, type MonitorConfig } from '../types';

export class NetworkErrorHandler {
  private errorCallback: (error: ErrorInfo) => void;
  private originalFetch: typeof fetch;
  private originalXMLHttpRequest: typeof XMLHttpRequest;
  private shouldTrackRequest: (url: string) => boolean;
  private config: MonitorConfig['network'];

  constructor(
    errorCallback: (error: ErrorInfo) => void,
    config?: MonitorConfig['network']
  ) {
    this.errorCallback = errorCallback;
    this.config = {
      enabled: true,
      monitorFetch: true,
      monitorXHR: true,
      excludePatterns: [],
      maxResponseLength: 1000,
      detailed: true,
      ...config,
    };

    this.originalFetch = window.fetch;
    this.originalXMLHttpRequest = window.XMLHttpRequest;

    // Create request filter based on configuration
    this.shouldTrackRequest = this.createRequestFilter();

    if (this.config.enabled) {
      this.init();
    }
  }

  // Create request filter based on configuration
  private createRequestFilter(): (url: string) => boolean {
    const patterns = this.config?.excludePatterns || [];

    return (url: string) => {
      // If no exclusion patterns, monitor all requests
      if (patterns.length === 0) {
        return true;
      }

      // Check if URL matches any exclusion pattern
      for (const pattern of patterns) {
        if (typeof pattern === 'string') {
          if (url.includes(pattern)) {
            return false;
          }
        } else if (pattern instanceof RegExp) {
          if (pattern.test(url)) {
            return false;
          }
        }
      }

      return true;
    };
  }

  // Initialize network error capture
  private init() {
    if (this.config?.monitorFetch) {
      this.interceptFetch();
    }
    if (this.config?.monitorXHR) {
      this.interceptXMLHttpRequest();
    }
  }

  // Intercept fetch requests
  private interceptFetch() {
    const originalFetch = this.originalFetch;
    const self = this;

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input.toString();

      // Filter requests that don't need monitoring
      if (!self.shouldTrackRequest(url)) {
        return originalFetch.call(window, input, init);
      }

      const startTime = Date.now();
      const method = init?.method || 'GET';

      // Extract request details
      const requestDetails = self.extractRequestDetails(url, init);

      try {
        const response = await originalFetch.call(window, input, init);
        const duration = Date.now() - startTime;

        // Check HTTP status errors
        if (!response.ok) {
          // Try to read response content
          const responseDetails = await self.extractResponseDetails(
            response.clone()
          );

          self.reportNetworkError({
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            duration,
            type: 'fetch',
            message: `HTTP ${response.status}: ${response.statusText}`,
            ...requestDetails,
            ...responseDetails,
          });
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Network level errors (connection failure, timeout, etc.)
        self.reportNetworkError({
          url,
          method,
          status: 0,
          statusText: 'Network Error',
          duration,
          type: 'fetch',
          message:
            error instanceof Error ? error.message : 'Network request failed',
          error: error instanceof Error ? error : undefined,
          ...requestDetails,
        });

        throw error; // Re-throw error to maintain original behavior
      }
    };
  }

  // Intercept XMLHttpRequest
  private interceptXMLHttpRequest() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const networkHandler = this; // Save this reference

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      user?: string | null,
      password?: string | null
    ) {
      const urlString = url.toString();

      // Filter requests that don't need monitoring
      if (networkHandler.shouldTrackRequest(urlString)) {
        // Save request information
        (this as any)._monitor = {
          method,
          url: urlString,
          startTime: 0,
          requestDetails: networkHandler.extractXHRRequestDetails(urlString),
        };
      }

      return originalOpen.call(this, method, url, !!async, user, password);
    };

    XMLHttpRequest.prototype.send = function (
      body?: Document | XMLHttpRequestBodyInit | null
    ) {
      const monitor = (this as any)._monitor;
      if (monitor) {
        monitor.startTime = Date.now();
        monitor.requestDetails.requestBody = networkHandler.serializeBody(body);

        // Listen to various events
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
            ...monitor.requestDetails,
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
            ...monitor.requestDetails,
          });
        });

        this.addEventListener('load', () => {
          const duration = Date.now() - monitor.startTime;

          // Check HTTP status errors
          if (this.status >= 400) {
            // Try to get XHR response content
            let responseBody: any;
            try {
              const contentType = this.getResponseHeader('content-type') || '';
              if (contentType.includes('application/json')) {
                responseBody = JSON.parse(this.responseText);
              } else if (contentType.includes('text/')) {
                const maxLength =
                  networkHandler.config?.maxResponseLength || 1000;
                responseBody =
                  this.responseText.length > maxLength
                    ? this.responseText.substring(0, maxLength) + '...'
                    : this.responseText;
              } else {
                responseBody = `[${contentType || 'Unknown'}: ${this.responseText.length} chars]`;
              }
            } catch {
              responseBody = this.responseText || '[No response body]';
            }

            // Extract response headers (XHR can only get partial response headers)
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
              // Ignore response header extraction errors
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
              responseHeaders,
            });
          }
        });
      }

      return originalSend.call(this, body);
    };
  }

  // Extract fetch request details
  private extractRequestDetails(url: string, init?: RequestInit) {
    const urlObj = new URL(url, window.location.href);

    return {
      requestQuery: urlObj.search,
      requestBody: this.serializeBody(init?.body),
      requestHeaders: this.extractHeaders(init?.headers),
    };
  }

  // Extract XHR request details
  private extractXHRRequestDetails(url: string) {
    const urlObj = new URL(url, window.location.href);

    return {
      requestQuery: urlObj.search,
      requestBody: undefined, // Will be set in send
      requestHeaders: {}, // XHR headers are difficult to get, leave empty for now
    };
  }

  // Serialize request body
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

  // Extract request headers
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

  // Extract response details
  private async extractResponseDetails(response: Response) {
    try {
      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Try to read response body
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
          const maxLength = this.config?.maxResponseLength || 1000;
          responseBody =
            text.length > maxLength
              ? text.substring(0, maxLength) + '...'
              : text;
        } catch {
          responseBody = '[Unable to read text response]';
        }
      } else {
        responseBody = `[${contentType || 'Unknown content type'}: ${response.headers.get('content-length') || 'unknown'} bytes]`;
      }

      return {
        responseBody,
        responseHeaders,
      };
    } catch (error) {
      return {
        responseBody: '[Unable to extract response]',
        responseHeaders: {},
      };
    }
  }

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
      // Network request specific information
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
      stack: details.error?.stack,
    };

    this.errorCallback(errorInfo);
  }

  // Destroy interceptor
  destroy() {
    // Restore original methods
    window.fetch = this.originalFetch;
    window.XMLHttpRequest = this.originalXMLHttpRequest;
  }
}
