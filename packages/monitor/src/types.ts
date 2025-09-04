import type { PerformanceHandlerConfig } from './handlers/performanceHandler';

export enum MonitorErrorType {
  JS = 'js',
  RESOURCE = 'resource',
  NETWORK = 'network',
  PERFORMANCE = 'performance',
}

// Report configuration interface
export interface ReportConfig {
  // Report endpoint URL
  url: string;
  // Transport configuration
  transport?: {
    // Specify transport type, 'auto' will automatically choose the best available transport
    type?: 'auto' | 'fetch' | 'xhr';
    // Custom headers
    headers?: Record<string, string>;
    // Fallback options when using 'auto'
    fallback?: {
      // Whether to allow fallback to next available transport
      enabled?: boolean;
      // Custom priority order
      priority?: Array<'fetch' | 'xhr'>;
    };
  };
  // Error aggregation configuration
  aggregator?: {
    // Aggregation window time in milliseconds
    windowMs?: number;
    // Maximum batch size
    maxBatch?: number;
    // Deduplication time window in milliseconds
    dedupeTtlMs?: number;
    // Maximum number of deduplication keys
    dedupeMaxKeys?: number;
    // Rate limit per minute
    rateLimitPerMinute?: number;
  };

  // Retry configuration
  retry?: {
    enabled?: boolean;
    // Maximum number of retry attempts
    maxAttempts?: number;
    // Initial retry delay in milliseconds
    initialDelayMs?: number;
    // Maximum retry delay in milliseconds
    maxDelayMs?: number;
    // Exponential backoff factor
    backoffFactor?: number;
    // Add random jitter to prevent thundering herd
    jitter?: boolean;
    // Retry on specific HTTP status codes
    retryableStatuses?: number[];
    // Retry on network errors
    retryNetworkError?: boolean;
    // Retry conditions for different error types
    retryConditions?: {
      // Function to determine if a network error should be retried
      networkError?: (error: Error) => boolean;
      // Function to determine if a response should be retried based on status
      httpError?: (status: number, response: any) => boolean;
    };
    // Persistent storage key for retry queue
    persistKey?: string;
    // Queue configuration for failed reports
    queue?: {
      // Maximum queue size
      maxSize?: number;
      // Time to live for queued items in milliseconds
      ttlMs?: number;
      // Whether to persist queue across page reloads
      persistent?: boolean;
    };
  };
}

// Monitor configuration interface
export interface MonitorConfig {
  // Report configuration
  report?: ReportConfig;
  
  // Project identification
  projectId?: string;
  version?: string;
  
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
  // Performance monitoring configuration
  performance?: PerformanceHandlerConfig;
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
