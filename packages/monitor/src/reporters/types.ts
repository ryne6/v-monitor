import type { ErrorInfo, MonitorConfig } from '../types';

/**
 * 聚合器配置
 */
export interface AggregatorConfig {
  // 聚合窗口时间（毫秒）
  windowMs?: number;
  // 最大批量大小
  maxBatch?: number;
  // 错误去重时间（毫秒）
  dedupeTtlMs?: number;
  // 去重缓存最大容量
  dedupeMaxKeys?: number;
  // 每分钟最大上报量
  rateLimitPerMinute?: number;
  // 致命错误判断（绕过聚合直接上报）
  fatalBypass?: (error: ErrorInfo) => boolean;
}

/**
 * 传输层接口定义
 */
export interface ReporterTransport {
  // 上报单个错误
  report(error: ErrorInfo): Promise<boolean>;
  // 批量上报错误
  reportBatch(errors: ErrorInfo[]): Promise<boolean>;
  // 获取配置
  getConfig?(): MonitorConfig;
  // 资源清理
  destroy?(): void;
}


