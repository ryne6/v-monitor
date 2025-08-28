export enum MonitorErrorType {
  JS = 'js',
  RESOURCE = 'resource',
  NETWORK = 'network',
  PERFORMANCE = 'performance',
}

// Monitor configuration interface
export interface MonitorConfig {
  // Network monitoring configuration
  network?: {
    // Whether to enable network monitoring
    enabled?: boolean;
    // Whether to monitor fetch requests
    monitorFetch?: boolean;
    // Whether to monitor XMLHttpRequest
    monitorXHR?: boolean;
    // Excluded URL patterns (supports string matching and regular expressions)
    excludePatterns?: (string | RegExp)[];
    // Maximum response body length
    maxResponseLength?: number;
    // Whether to collect detailed request information
    detailed?: boolean;
  };
  // JS error monitoring configuration
  js?: {
    enabled?: boolean;
  };
  // Resource error monitoring configuration
  resource?: {
    enabled?: boolean;
  };
}

// Error information interface
export interface ErrorInfo {
  type: MonitorErrorType;
  message: string;
  stack?: string;
  filename?: string;
  line?: number;
  column?: number;
  timestamp: number;
  url: string;
  userAgent: string;
  // Network request related fields
  requestMethod?: string;
  requestUrl?: string;
  responseStatus?: number;
  responseStatusText?: string;
  requestDuration?: number;
  requestType?: 'fetch' | 'xhr';
  requestQuery?: string;
  requestBody?: any;
  requestHeaders?: Record<string, string>;
  responseBody?: any;
  responseHeaders?: Record<string, string>;
  // Other extension fields
  [key: string]: any;
}
