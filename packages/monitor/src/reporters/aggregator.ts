import type { ErrorInfo } from '../types';
import type { ReporterTransport } from './types';

export interface AggregatorOptions {
  windowMs?: number;
  maxBatch?: number;
  dedupeTtlMs?: number;
  dedupeMaxKeys?: number;
  rateLimitPerMinute?: number;
  fatalBypass?: (e: ErrorInfo) => boolean;
}

interface AggregatedItem {
  representative: ErrorInfo;
  count: number;
  firstTs: number;
  lastTs: number;
}

export class ReporterAggregator {
  private transport: ReporterTransport;
  private options: Required<AggregatorOptions>;
  private timer: number | null = null;
  private buckets: Map<string, AggregatedItem> = new Map();
  private dedupeTimestamps: Map<string, number> = new Map();
  private rateWindowStart = Date.now();
  private rateCount = 0;

  constructor(transport: ReporterTransport, options: AggregatorOptions = {}) {
    this.transport = transport;
    this.options = {
      windowMs: options.windowMs ?? 2000,
      maxBatch: options.maxBatch ?? 20,
      dedupeTtlMs: options.dedupeTtlMs ?? 60000,
      dedupeMaxKeys: options.dedupeMaxKeys ?? 1000,
      rateLimitPerMinute: options.rateLimitPerMinute ?? 100,
      fatalBypass: options.fatalBypass ?? (() => false)
    };
  }

  enqueue(error: ErrorInfo) {
    // rate limit window (per minute)
    const now = Date.now();
    if (now - this.rateWindowStart >= 60000) {
      this.rateWindowStart = now;
      this.rateCount = 0;
    }

    if (this.rateCount >= this.options.rateLimitPerMinute && !this.options.fatalBypass(error)) {
      return; // drop low-priority when over rate limit
    }

    if (this.options.fatalBypass(error)) {
      // immediate path
      this.transport.report(error);
      this.rateCount++;
      return;
    }

    const key = this.fingerprint(error);
    const lastSeen = this.dedupeTimestamps.get(key);
    if (lastSeen && now - lastSeen < this.options.dedupeTtlMs) {
      // bump aggregate
      const agg = this.buckets.get(key);
      if (agg) {
        agg.count++;
        agg.lastTs = now;
      } else {
        // stale map mismatch, reset
        this.buckets.set(key, { representative: error, count: 1, firstTs: now, lastTs: now });
      }
    } else {
      this.buckets.set(key, { representative: error, count: 1, firstTs: now, lastTs: now });
      this.dedupeTimestamps.set(key, now);
      // evict old keys if exceeds
      if (this.dedupeTimestamps.size > this.options.dedupeMaxKeys) {
        const oldestKey = [...this.dedupeTimestamps.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
        if (oldestKey) this.dedupeTimestamps.delete(oldestKey);
      }
    }

    // schedule flush
    if (!this.timer) {
      this.timer = (setTimeout(() => {
        this.timer = null;
        this.flush();
      }, this.options.windowMs) as unknown) as number;
    }

    if (this.buckets.size >= this.options.maxBatch) {
      this.flush();
    }
  }

  flush() {
    if (this.buckets.size === 0) return;
    const batch = Array.from(this.buckets.values()).map(({ representative, count, firstTs, lastTs }) => ({
      ...representative,
      _aggregate: { count, firstTs, lastTs }
    }));
    this.buckets.clear();
    try {
      if (batch.length) {
        this.transport.reportBatch(batch);
        this.rateCount += batch.length;
      }
    } catch {
      // best-effort; in minimal version we drop on failure
    }
  }

  flushNow() {
    if (this.timer) {
      clearTimeout(this.timer as unknown as number);
      this.timer = null;
    }
    this.flush();
  }

  setTransport(transport: ReporterTransport) {
    this.transport = transport;
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
}


