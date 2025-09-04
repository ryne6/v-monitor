import pako from 'pako';

export interface SessionReplayConfig {
  enabled?: boolean;
  windowMs?: number; // time window kept in buffer
  maxEvents?: number; // hard cap for events in buffer
  maxReplayBytes?: number; // cap snapshot payload size (approx, JSON length)
  mousemoveThrottleMs?: number; // throttle high-frequency events
  maskAllText?: boolean; // reserved for future masking rules
  compress?: boolean; // gzip+base64 compress snapshot to reduce payload size
}

export interface ReplayEvent {
  t: number; // timestamp
  type: string; // event type
  x?: number;
  y?: number;
  target?: string; // simple selector
  value?: string; // for inputs (masked)
  scrollX?: number;
  scrollY?: number;
}

export interface ReplaySnapshot {
  startedAt: number;
  endedAt: number;
  // When not compressed, raw events are included
  events?: ReplayEvent[];
  eventsCount: number;
  // Size of the serialized payload (compressed if compression enabled)
  bytes: number;
  version: string; // schema version
  rrweb?: boolean; // rrweb event format flag
  // Compression fields (present when compress=true)
  encoding?: 'gzip+base64';
  payload?: string; // compressed JSON string of events
}

function now(): number {
  return Date.now();
}

function getSimpleSelector(el: EventTarget | null): string | undefined {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return undefined;
  const id = node.id ? `#${node.id}` : '';
  const cls = node.className && typeof node.className === 'string' ? `.${node.className.split(/\s+/).join('.')}` : '';
  return `${node.tagName.toLowerCase()}${id}${cls}`.slice(0, 200);
}

export class SessionReplayHandler {
  private config: Required<SessionReplayConfig>;
  private buffer: ReplayEvent[] = [];
  private lastMouseMoveTs = 0;
  private listeners: Array<{ type: string; fn: any; opts?: any }>; 
  private useRrweb = false;
  private stopRrweb?: () => void;

  constructor(config?: SessionReplayConfig) {
    this.config = {
      enabled: config?.enabled ?? true,
      windowMs: config?.windowMs ?? 15000,
      maxEvents: config?.maxEvents ?? 3000,
      maxReplayBytes: config?.maxReplayBytes ?? 256 * 1024,
      mousemoveThrottleMs: config?.mousemoveThrottleMs ?? 50,
      maskAllText: config?.maskAllText ?? true,
      compress: config?.compress ?? true,
    } as Required<SessionReplayConfig>;
    this.listeners = [];
    if (this.config.enabled && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const g: any = window as any;
      if (g.rrweb && typeof g.rrweb.record === 'function') {
        this.useRrweb = true;
        this.startRrweb(g.rrweb);
      } else {
        this.start();
      }
    }
  }

  private startRrweb(rrweb: any) {
    try {
      this.stopRrweb = rrweb.record({
        emit: (event: any) => {
          // rrweb 事件包含 timestamp（毫秒）
          (this.buffer as unknown as any[]).push(event);
          this.evict();
        },
        recordCanvas: true,
        collectFonts: false,
        checkoutEveryNms: this.config.windowMs,
      });
    } catch {
      this.useRrweb = false;
      this.start();
    }
  }

  private start() {
    const add = (type: string, fn: any, opts?: any) => {
      window.addEventListener(type, fn, opts);
      this.listeners.push({ type, fn, opts });
    };

    add('click', (e: MouseEvent) => {
      this.push({ t: now(), type: 'click', x: e.clientX, y: e.clientY, target: getSimpleSelector(e.target) });
    }, true);

    add('input', (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target) return;
      const masked = this.config.maskAllText ? '***' : (target.value ?? '').slice(0, 100);
      this.push({ t: now(), type: 'input', target: getSimpleSelector(target), value: masked });
    }, true);

    add('scroll', () => {
      this.push({ t: now(), type: 'scroll', scrollX: window.scrollX, scrollY: window.scrollY });
    }, true);

    add('mousemove', (e: MouseEvent) => {
      const ts = now();
      if (ts - this.lastMouseMoveTs < this.config.mousemoveThrottleMs) return;
      this.lastMouseMoveTs = ts;
      this.push({ t: ts, type: 'mm', x: e.clientX, y: e.clientY });
    }, true);

    add('visibilitychange', () => {
      this.push({ t: now(), type: 'visibility', value: document.visibilityState });
    });
  }

  private push(evt: ReplayEvent) {
    this.buffer.push(evt);
    this.evict();
  }

  private evict() {
    const cutoff = now() - this.config.windowMs;
    // evict by time
    while (this.buffer.length && this.buffer[0].t < cutoff) {
      this.buffer.shift();
    }
    // evict by count
    if (this.buffer.length > this.config.maxEvents) {
      this.buffer.splice(0, this.buffer.length - this.config.maxEvents);
    }
  }

  snapshot(): ReplaySnapshot | null {
    if (!this.buffer.length) return null;
    const events = this.buffer.slice() as any[];
    const getTs = (ev: any) => (typeof ev.t === 'number' ? ev.t : (typeof ev.timestamp === 'number' ? ev.timestamp : now()));
    const startedAt = getTs(events[0]);
    const endedAt = getTs(events[events.length - 1]);
    // approximate bytes by JSON length
    let json = JSON.stringify(events);
    if (json.length > this.config.maxReplayBytes) {
      // trim from the start until within budget
      let start = 0;
      let end = events.length;
      while (start < end) {
        start++;
        json = JSON.stringify(events.slice(start));
        if (json.length <= this.config.maxReplayBytes) break;
      }
      const trimmed = events.slice(start);
      return {
        startedAt: trimmed.length ? getTs(trimmed[0]) : startedAt,
        endedAt,
        events: trimmed as any,
        eventsCount: trimmed.length,
        bytes: json.length,
        version: this.useRrweb ? 'rrweb-1' : 'lite-1',
        rrweb: this.useRrweb || undefined,
      };
    }
    // Optionally compress payload to reduce size
    if (this.config.compress) {
      try {
        // use pako (already a dependency)
        const compressed: Uint8Array = pako.gzip(json);
        let b64: string;
        if (typeof btoa === 'function') {
          let binary = '';
          for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
          b64 = btoa(binary);
        } else {
          // node fallback
          b64 = Buffer.from(compressed).toString('base64');
        }
        return {
          startedAt,
          endedAt,
          eventsCount: events.length,
          bytes: b64.length,
          version: this.useRrweb ? 'rrweb-1' : 'lite-1',
          rrweb: this.useRrweb || undefined,
          encoding: 'gzip+base64',
          payload: b64,
        };
      } catch {}
    }
    return {
      startedAt,
      endedAt,
      events: events as any,
      eventsCount: events.length,
      bytes: json.length,
      version: this.useRrweb ? 'rrweb-1' : 'lite-1',
      rrweb: this.useRrweb || undefined,
    };
  }

  destroy() {
    try { this.stopRrweb?.(); } catch {}
    this.listeners.forEach(({ type, fn, opts }) => {
      window.removeEventListener(type, fn, opts);
    });
    this.listeners = [];
    this.buffer = [];
  }
}


