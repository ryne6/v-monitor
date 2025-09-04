import pako from 'pako';

export interface SessionReplayConfig {
  enabled?: boolean;
  windowMs?: number; // time window kept in buffer
  maxEvents?: number; // hard cap for events in buffer
  maxReplayBytes?: number; // cap snapshot payload size (approx, JSON length)
  mousemoveThrottleMs?: number; // throttle high-frequency events
  scrollThrottleMs?: number; // throttle scroll sampling interval
  flushIntervalMs?: number; // batch events and flush every N ms
  maskAllText?: boolean; // reserved for future masking rules
  compress?: boolean; // gzip+base64 compress snapshot to reduce payload size
  useRrweb?: boolean; // opt-in to rrweb full DOM capture when rrweb is available
  includeSelectors?: string[]; // whitelist: only capture targets under these selectors (lite events)
  excludeSelectors?: string[]; // blacklist: skip targets under these selectors (lite events)
  useWorkerCompress?: boolean; // offload gzip to Worker via CompressionStream when available
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
  private pending: ReplayEvent[] = [];
  private flushTimer: any = null;
  private lastMouseMoveTs = 0;
  private lastScrollTs = 0;
  private listeners: Array<{ type: string; fn: any; opts?: any }>; 
  private useRrweb = false;
  private stopRrweb?: () => void;
  private worker: Worker | null = null;
  private lastCompressed: { payload: string; bytes: number; startedAt: number; endedAt: number; eventsCount: number; rrweb?: boolean; version: string } | null = null;

  constructor(config?: SessionReplayConfig) {
    this.config = {
      enabled: config?.enabled ?? true,
      windowMs: config?.windowMs ?? 15000,
      maxEvents: config?.maxEvents ?? 3000,
      maxReplayBytes: config?.maxReplayBytes ?? 256 * 1024,
      mousemoveThrottleMs: config?.mousemoveThrottleMs ?? 120,
      scrollThrottleMs: config?.scrollThrottleMs ?? 150,
      flushIntervalMs: config?.flushIntervalMs ?? 200,
      maskAllText: config?.maskAllText ?? true,
      compress: config?.compress ?? true,
      useRrweb: config?.useRrweb ?? false,
      includeSelectors: config?.includeSelectors ?? [],
      excludeSelectors: config?.excludeSelectors ?? [],
      useWorkerCompress: config?.useWorkerCompress ?? true,
    } as Required<SessionReplayConfig>;
    this.listeners = [];
    if (this.config.enabled && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const g: any = window as any;
      if (this.config.useRrweb && g.rrweb && typeof g.rrweb.record === 'function') {
        this.useRrweb = true;
        this.startRrweb(g.rrweb);
      } else {
        this.start();
      }
      if (this.config.compress && this.config.useWorkerCompress) {
        this.initWorker();
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
      if (!this.shouldCapture(e.target as Element | null)) return;
      this.push({ t: now(), type: 'click', x: e.clientX, y: e.clientY, target: getSimpleSelector(e.target) });
    }, true);

    add('input', (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target) return;
      if (!this.shouldCapture(target)) return;
      const masked = this.config.maskAllText ? '***' : (target.value ?? '').slice(0, 100);
      this.push({ t: now(), type: 'input', target: getSimpleSelector(target), value: masked });
    }, true);

    add('scroll', () => {
      const ts = now();
      if (ts - this.lastScrollTs < this.config.scrollThrottleMs) return;
      this.lastScrollTs = ts;
      this.push({ t: ts, type: 'scroll', scrollX: window.scrollX, scrollY: window.scrollY });
    }, true);

    add('mousemove', (e: MouseEvent) => {
      const ts = now();
      if (ts - this.lastMouseMoveTs < this.config.mousemoveThrottleMs) return;
      this.lastMouseMoveTs = ts;
      // avoid high-churn nodes like svg/canvas by checking the element under cursor
      try {
        const el = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
        if (!this.shouldCapture(el)) return;
      } catch {}
      this.push({ t: ts, type: 'mm', x: e.clientX, y: e.clientY });
    }, true);

    add('visibilitychange', () => {
      this.push({ t: now(), type: 'visibility', value: document.visibilityState });
    });
  }

  private push(evt: ReplayEvent) {
    this.pending.push(evt);
    if (this.flushTimer == null) {
      this.flushTimer = setTimeout(() => this.flush(), this.config.flushIntervalMs);
    }
  }

  private flush() {
    if (this.pending.length) {
      this.buffer.push(...this.pending);
      this.pending = [];
      this.evict();
      // background compress latest buffer
      if (this.worker && this.config.compress) {
        try {
          const events = this.buffer.slice();
          const getTs = (ev: any) => (typeof ev.t === 'number' ? ev.t : (typeof ev.timestamp === 'number' ? ev.timestamp : now()));
          const startedAt = events.length ? getTs(events[0]) : now();
          const endedAt = events.length ? getTs(events[events.length - 1]) : startedAt;
          const version = this.useRrweb ? 'rrweb-1' : 'lite-1';
          const rrweb = this.useRrweb || undefined;
          const json = JSON.stringify(events);
          this.worker.postMessage({ type: 'compress', json, meta: { startedAt, endedAt, eventsCount: events.length, version, rrweb } });
        } catch {}
      }
    }
    this.flushTimer = null;
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

  private shouldCapture(target: Element | null): boolean {
    try {
      if (!target) return true;
      const tag = (target.tagName || '').toLowerCase();
      if (tag === 'canvas' || tag === 'svg' || tag === 'path' || tag === 'g') return false;
      // blacklist
      for (const sel of this.config.excludeSelectors) {
        if (typeof sel === 'string' && target.closest && target.closest(sel)) return false;
      }
      // whitelist
      if (this.config.includeSelectors.length > 0) {
        for (const sel of this.config.includeSelectors) {
          if (typeof sel === 'string' && target.closest && target.closest(sel)) return true;
        }
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  snapshot(): ReplaySnapshot | null {
    if (this.flushTimer != null) {
      // flush any pending events before snapshot
      clearTimeout(this.flushTimer);
      this.flush();
    }
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
    if (this.config.compress && this.lastCompressed && this.lastCompressed.startedAt === startedAt && this.lastCompressed.endedAt === endedAt && this.lastCompressed.eventsCount === events.length) {
      return {
        startedAt,
        endedAt,
        eventsCount: events.length,
        bytes: this.lastCompressed.bytes,
        version: this.lastCompressed.version,
        rrweb: this.lastCompressed.rrweb,
        encoding: 'gzip+base64',
        payload: this.lastCompressed.payload,
      };
    }
    if (this.config.compress) {
      try {
        // use pako
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

  private initWorker() {
    try {
      const src = `self.onmessage=async(e)=>{const d=e.data||{};if(d.type!=='compress')return;try{const json=d.json;const meta=d.meta||{};if(typeof CompressionStream==='undefined'){postMessage({ok:false});return}const enc=new TextEncoder();const input=new Blob([enc.encode(json)]);const cs=new CompressionStream('gzip');const out=input.stream().pipeThrough(cs);const buf=await new Response(out).arrayBuffer();const bytes=new Uint8Array(buf);let bin='';for(let i=0;i<bytes.length;i++){bin+=String.fromCharCode(bytes[i])}const b64=btoa(bin);postMessage({ok:true,payload:b64,bytes:b64.length,meta})}catch{postMessage({ok:false})}}`;
      const blob = new Blob([src], { type: 'text/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = (ev: MessageEvent) => {
        const data: any = ev.data;
        if (!data || !data.ok) return;
        const { payload, bytes, meta } = data;
        this.lastCompressed = {
          payload,
          bytes,
          startedAt: meta.startedAt,
          endedAt: meta.endedAt,
          eventsCount: meta.eventsCount,
          version: meta.version,
          rrweb: meta.rrweb,
        };
      };
    } catch {
      this.worker = null;
    }
  }

  destroy() {
    try { this.stopRrweb?.(); } catch {}
    this.listeners.forEach(({ type, fn, opts }) => {
      window.removeEventListener(type, fn, opts);
    });
    this.listeners = [];
    this.buffer = [];
    this.pending = [];
    if (this.flushTimer) { try { clearTimeout(this.flushTimer); } catch {} this.flushTimer = null; }
    if (this.worker) { try { this.worker.terminate(); } catch {} this.worker = null; }
  }
}


