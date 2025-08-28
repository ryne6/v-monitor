export enum MonitorErrorType {
  JS = 'js',
  RESOURCE = 'resource',
  NETWORK = 'network',
  PERFORMANCE = 'performance',
}

// 错误信息接口
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
  // 网络请求相关字段
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
  // 其他扩展字段
  [key: string]: any;
}
