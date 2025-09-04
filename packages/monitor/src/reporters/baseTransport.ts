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

  // 限流溢出缓存区
  private overflowBuffer: ErrorInfo[] = [];
  private overflowTimer: number | null = null;

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



    // 也将溢出缓存区的错误加入 batch，补齐 _aggregate 字段
    const now = Date.now();
    if (this.overflowBuffer.length > 0) {
      batch.push(...this.overflowBuffer.map(error => ({
        ...error,
        _aggregate: { count: 1, firstTs: now, lastTs: now }
      })));
    }

    // 也将重试队列中的错误加入 batch，补齐 _aggregate 字段
    if (this.retryQueue.size > 0) {
      batch.push(...Array.from(this.retryQueue.values()).map(item => ({
        ...item.error,
        _aggregate: { count: 1, firstTs: now, lastTs: now }
      })));
    }

    if (batch.length > 0) {
      this.beaconReporter.sendBatchReport(batch);
    }

  // Clear buckets, overflowBuffer, and retryQueue after sending
  this.buckets.clear();
  this.overflowBuffer = [];
  this.retryQueue.clear();
  }

  async report(error: ErrorInfo): Promise<boolean> {
    // 限流检查
    const now = Date.now();
    if (now - this.rateWindowStart >= 60000) {
      this.rateWindowStart = now;
      this.rateCount = 0;

      // 新时间窗口，处理溢出缓存区
      if (this.overflowBuffer.length > 0) {
        this.processOverflowBuffer();
      }
    }

    const rateLimit = this.config.report?.aggregator?.rateLimitPerMinute ?? 100;
    if (this.rateCount >= rateLimit) {
      // 超出限流阈值，放入缓存区
      if (this.overflowBuffer.length) {
        this.overflowBuffer.push(error);
        this.scheduleOverflowProcess();
      }
      return false;
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

    // 优化：先清理所有过期的去重记录，再按最老顺序逐步删除，直到满足maxKeys
    const maxKeys = this.config.report?.aggregator?.dedupeMaxKeys ?? 1000;
    const nowTs = now;
    // 1. 清理所有过期key
    for (const [k, ts] of this.dedupeTimestamps.entries()) {
      if (nowTs - ts > dedupeTtl) {
        this.dedupeTimestamps.delete(k);
      }
    }
    // 2. 如果还超限，按最老顺序逐步删除
    while (this.dedupeTimestamps.size > maxKeys) {
      const oldestKey = [...this.dedupeTimestamps.entries()]
        .sort((a, b) => a[1] - b[1])[0]?.[0];
      if (oldestKey) {
        this.dedupeTimestamps.delete(oldestKey);
      } else {
        break;
      }
    }

    // 调度发送
    this.scheduleAggregateFlush();
    return true;
  }

  // 调度溢出缓存区处理
  private scheduleOverflowProcess(): void {
    if (this.overflowTimer) return;
    const now = Date.now();
    const nextWindowStart = this.rateWindowStart + 60000;
    const delay = Math.max(0, nextWindowStart - now);
    this.overflowTimer = (setTimeout(() => {
      this.overflowTimer = null;
      this.processOverflowBuffer();
    }, delay) as unknown) as number;
  }

  // 处理溢出缓存区
  private processOverflowBuffer(): void {
    if (this.overflowBuffer.length === 0) return;
    const rateLimit = this.config.report?.aggregator?.rateLimitPerMinute ?? 100;
    // 取出本窗口可处理的数量
    const toProcess = this.overflowBuffer.splice(0, rateLimit);
    if (toProcess.length === 1) {
      this.report(toProcess[0]);
    } else if (toProcess.length > 1) {
      this.reportBatch(toProcess);
    }
    // 如果还有剩余，继续调度
    if (this.overflowBuffer.length > 0) {
      this.scheduleOverflowProcess();
    }
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

      // 在开始重试前，先将这些项从队列中移除；失败时再加入队列
      retriableItems.forEach(([key]) => this.retryQueue.delete(key));

      // 批量处理到期的重试项
      if (retriableItems.length > 1) {
        const errors = retriableItems.map(([_, item]) => item.error);
        try {
          const success = await this.sendBatchReport(errors);
          if (success) {
            // 已在重试前移除，无需处理
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
    const msg = (e.message || '').slice(0, 200);
    const url = e.url || '';
    const stack = this.normalizeStack(e.stack || '');
    return `${type}|${msg}|${url}|${stack}`;
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
      this.sendReport(batch[0]);
    } else if (batch.length > 1) {
      this.sendBatchReport(batch);
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
    for (const [_, item] of items) {
      try {
        const success = await this.sendReport(item.error);
        if (success) {
          // 已在重试前移除，无需处理
        } else {
          // 失败则重新加入队列（尝试次数+1）
          const attempts = item.attempts + 1;
          const nextRetryTime = Date.now() + this.calculateRetryDelay(attempts);
          const key = this.getErrorKey(item.error);
          this.retryQueue.set(key, { error: item.error, attempts, nextRetryTime });
        }
      } catch {
        // 异常也视为失败，重新加入队列（尝试次数+1）
        const attempts = item.attempts + 1;
        const nextRetryTime = Date.now() + this.calculateRetryDelay(attempts);
        const key = this.getErrorKey(item.error);
        this.retryQueue.set(key, { error: item.error, attempts, nextRetryTime });
      }
    }
  }
}
