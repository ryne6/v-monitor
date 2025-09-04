// 导出主要的 Monitor 类
export { Monitor } from './main';

// 导出错误类型枚举
export { MonitorErrorType } from './types';

// 导出配置类型
export type { MonitorConfig, ReportConfig, ErrorInfo } from './types';

// 导出 Reporter 类
export { Reporter, FetchReporter, XHRReporter } from './reporters';

// 导出传输层类型
export type { ReporterTransport } from './reporters/types';

// 导出性能监控类型
export type { PerformanceHandlerConfig, PerformanceMetrics } from './handlers/performanceHandler';

// 导出错误处理器
export { JSErrorHandler } from './handlers/jsErrorHandler';
export { ResourceErrorHandler } from './handlers/resourceErrorHandler';
export { NetworkErrorHandler } from './handlers/networkErrorHandler';
export { PerformanceHandler } from './handlers/performanceHandler';
export { SessionReplayHandler } from './handlers/replayHandler';
export type { SessionReplayConfig, ReplaySnapshot } from './handlers/replayHandler';
