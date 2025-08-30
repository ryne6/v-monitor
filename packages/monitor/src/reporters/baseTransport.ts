import type { ErrorInfo, MonitorConfig } from '../types';
import type { ReporterTransport } from './types';

export abstract class BaseTransport implements ReporterTransport {
  protected config: MonitorConfig;
  private retryQueue: Map<string, {
    error: ErrorInfo;
    attempts: number;
    nextRetryTime: number;
  }> = new Map();

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  async report(error: ErrorInfo): Promise<boolean> {
    try {
      const success = await this.sendReport(error);
      if (success) {
        return true;
      }
      
      // 如果发送失败且启用了重试
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
