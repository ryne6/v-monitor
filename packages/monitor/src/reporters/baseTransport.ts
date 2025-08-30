import type { ErrorInfo, MonitorConfig } from '../types';
import type { ReporterTransport } from './types';
import { BeaconReporter } from './beaconReporter';

export abstract class BaseTransport implements ReporterTransport {
  protected config: MonitorConfig;
  private retryQueue: Map<string, {
    error: ErrorInfo;
    attempts: number;
    nextRetryTime: number;
  }> = new Map();

  // 聚合相关
  private buckets: Map<string, {
    representative: ErrorInfo;
    count: number;
    firstTs: number;
    lastTs: number;
  }> = new Map();
  private dedupeTimestamps: Map<string, number> = new Map();
  private aggregateTimer: number | null = null;
  private rateWindowStart = Date.now();
  private rateCount = 0;

  // Beacon 支持
  private beaconReporter: BeaconReporter | null = null;
  private unloadHandler: () => void = () => {};

  constructor(config: MonitorConfig) {
    this.config = config;

    // 初始化 Beacon 支持
    if (BeaconReporter.isSupported()) {
      this.beaconReporter = new BeaconReporter(config.report?.url || '');
      
      // 页面卸载时发送未发送的错误
      this.unloadHandler = () => {
        this.flushWithBeacon();
      };
      
      window.addEventListener('unload', this.unloadHandler);
      window.addEventListener('beforeunload', this.unloadHandler);
    }
  }

  private flushWithBeacon(): void {
    if (!this.beaconReporter) return;
    
    // Send all errors in buckets
    const batch = Array.from(this.buckets.values()).map(({ representative, count, firstTs, lastTs }) => ({
      ...representative,
      _aggregate: { count, firstTs, lastTs }
    }));
    
    if (batch.length > 0) {
      this.beaconReporter.sendBatchReport(batch);
    }
    
    // Clear buckets after sending
    this.buckets.clear();
  }

  async report(error: ErrorInfo): Promise<boolean> {
    // 限流检查
    const now = Date.now();
    if (now - this.rateWindowStart >= 60000) {
      this.rateWindowStart = now;
      this.rateCount = 0;
    }

    const rateLimit = this.config.report?.aggregator?.rateLimitPerMinute ?? 100;
    if (this.rateCount >= rateLimit) {
      return false; // 超出限流阈值
    }

    // 如果是致命错误，直接发送
    if (typeof (this.config as any)?.aggregator?.fatalBypass === 'function' &&
        (this.config as any).aggregator.fatalBypass(error)) {
      try {
        const success = await this.sendReport(error);
        if (success) {
          this.rateCount++;
          return true;
        }
        // 发送失败，尝试重试
        if (this.config.report?.retry?.enabled) {
          await this.addToRetryQueue(error);
        }
        return false;
      } catch (e) {
        if (this.config.report?.retry?.enabled) {
          await this.addToRetryQueue(error);
        }
        return false;
      }
    }

    // 普通错误进入聚合流程
    const key = this.fingerprint(error);
    const dedupeTtl = this.config.report?.aggregator?.dedupeTtlMs ?? 60000;
    const lastSeen = this.dedupeTimestamps.get(key);
    
    if (lastSeen && now - lastSeen < dedupeTtl) {
      // 在去重窗口内，更新聚合信息
      const bucket = this.buckets.get(key);
      if (bucket) {
        bucket.count++;
        bucket.lastTs = now;
        return true;
      }
    }

    // 新错误或超出去重窗口
    this.buckets.set(key, {
      representative: error,
      count: 1,
      firstTs: now,
      lastTs: now
    });
    this.dedupeTimestamps.set(key, now);

    // 清理过期的去重记录
    const maxKeys = this.config.report?.aggregator?.dedupeMaxKeys ?? 1000;
    if (this.dedupeTimestamps.size > maxKeys) {
      const oldestKey = [...this.dedupeTimestamps.entries()]
        .sort((a, b) => a[1] - b[1])[0]?.[0];
      if (oldestKey) {
        this.dedupeTimestamps.delete(oldestKey);
      }
    }

    // 调度发送
    this.scheduleAggregateFlush();
    return true;
  }

  async reportBatch(errors: ErrorInfo[]): Promise<boolean> {
    try {
      const success = await this.sendBatchReport(errors);
      if (success) {
        return true;
      }

      // 如果批量发送失败，将每个错误加入重试队列
      if (this.config.report?.retry?.enabled) {
        await Promise.all(errors.map(error => this.addToRetryQueue(error)));
      }
      return false;
    } catch (e) {
      if (this.config.report?.retry?.enabled) {
        await Promise.all(errors.map(error => this.addToRetryQueue(error)));
      }
      return false;
    }
  }

  // 子类需要实现的具体发送方法
  protected abstract sendReport(error: ErrorInfo): Promise<boolean>;
  protected abstract sendBatchReport(errors: ErrorInfo[]): Promise<boolean>;

  private async addToRetryQueue(error: ErrorInfo): Promise<void> {
    const key = this.getErrorKey(error);
    const retryConfig = this.config.report?.retry;
    const maxAttempts = retryConfig?.maxAttempts ?? 3;

    const existing = this.retryQueue.get(key);
    if (existing) {
      if (existing.attempts >= maxAttempts) {
        this.retryQueue.delete(key);
        return;
      }

      existing.attempts++;
      existing.nextRetryTime = Date.now() + this.calculateRetryDelay(existing.attempts);
    } else {
      this.retryQueue.set(key, {
        error,
        attempts: 1,
        nextRetryTime: Date.now() + this.calculateRetryDelay(1)
      });
    }

    // 启动重试
    this.scheduleRetry();
  }

  private calculateRetryDelay(attempt: number): number {
    const retryConfig = this.config.report?.retry;
    const base = retryConfig?.initialDelayMs ?? 1000;
    const max = retryConfig?.maxDelayMs ?? 30000;
    const factor = retryConfig?.backoffFactor ?? 2;

    let delay = base * Math.pow(factor, attempt - 1);
    
    // 添加随机抖动
    if (retryConfig?.jitter) {
      delay = delay * (0.5 + Math.random());
    }

    return Math.min(delay, max);
  }

  private scheduleRetry(): void {
    // 找到下一个需要重试的最早时间
    const now = Date.now();
    let nextRetryTime = Number.MAX_VALUE;
    
    for (const [_, item] of this.retryQueue) {
      if (item.nextRetryTime < nextRetryTime) {
        nextRetryTime = item.nextRetryTime;
      }
    }

    // 如果没有需要重试的项目，直接返回
    if (nextRetryTime === Number.MAX_VALUE) {
      return;
    }

    // 计算下一次重试的延迟时间
    const delay = Math.max(0, nextRetryTime - now);

    setTimeout(async () => {
      const currentTime = Date.now();
      const retriableItems = Array.from(this.retryQueue.entries())
        .filter(([_, item]) => item.nextRetryTime <= currentTime);

      // 批量处理到期的重试项
      if (retriableItems.length > 1) {
        const errors = retriableItems.map(([_, item]) => item.error);
        try {
          const success = await this.sendBatchReport(errors);
          if (success) {
            retriableItems.forEach(([key]) => this.retryQueue.delete(key));
          }
        } catch {
          // 批量重试失败，降级到单个重试
          await this.retryIndividually(retriableItems);
        }
      } else {
        // 单个重试
        await this.retryIndividually(retriableItems);
      }

      // 如果队列非空，继续调度下一次重试
      if (this.retryQueue.size > 0) {
        this.scheduleRetry();
      }
    }, delay);
  }

  private fingerprint(e: ErrorInfo): string {
    const type = e.type || 'unknown';
    if ((e as any).requestUrl) {
      const url = this.normalizeUrlPath((e as any).requestUrl || '');
      const method = (e as any).requestMethod || 'GET';
      const status = (e as any).responseStatus || 0;
      return `${type}|${method}|${url}|${status}`;
    }
    if ((e as any).tagName || e.filename) {
      const tag = ((e as any).tagName || '').toString().toLowerCase();
      const path = this.normalizeUrlPath(e.filename || '');
      return `${type}|${tag}|${path}`;
    }
    const msg = (e.message || '').slice(0, 200);
    const file = this.normalizeUrlPath(e.filename || '');
    const stack = this.normalizeStack(e.stack || '');
    return `${type}|${msg}|${file}|${stack}`;
  }

  private normalizeUrlPath(url: string): string {
    try {
      const u = new URL(url, window.location.href);
      return u.pathname;
    } catch {
      return url.split('?')[0];
    }
  }

  private normalizeStack(stack: string): string {
    return stack
      .split('\n')
      .slice(0, 3)
      .map(l => l.replace(/:\d+:\d+/g, '').trim())
      .join(';');
  }

  private scheduleAggregateFlush(): void {
    if (this.aggregateTimer) return;
    
    const windowMs = this.config.report?.aggregator?.windowMs ?? 2000;
    this.aggregateTimer = (setTimeout(() => {
      this.aggregateTimer = null;
      this.flush();
    }, windowMs) as unknown) as number;
  }

  private flush(): void {
    if (this.buckets.size === 0) return;

    const batch = Array.from(this.buckets.values()).map(({ representative, count, firstTs, lastTs }) => ({
      ...representative,
      _aggregate: { count, firstTs, lastTs }
    }));
    
    this.buckets.clear();

    // 发送聚合后的错误
    if (batch.length === 1) {
      this.report(batch[0]);
    } else if (batch.length > 1) {
      this.reportBatch(batch);
    }
  }

  private getErrorKey(error: ErrorInfo): string {
    return JSON.stringify({
      type: error.type,
      message: error.message,
      filename: error.filename,
      line: error.line,
      column: error.column
    });
  }

  private async retryIndividually(items: [string, { error: ErrorInfo; attempts: number; nextRetryTime: number; }][]): Promise<void> {
    for (const [key, item] of items) {
      try {
        const success = await this.sendReport(item.error);
        if (success) {
          this.retryQueue.delete(key);
        } else {
          // 更新下次重试时间
          item.nextRetryTime = Date.now() + this.calculateRetryDelay(item.attempts);
        }
      } catch {
        // 发送失败，更新下次重试时间
        item.nextRetryTime = Date.now() + this.calculateRetryDelay(item.attempts);
      }
    }
  }
}
