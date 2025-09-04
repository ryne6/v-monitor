import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { decodeReplay } from '../lib/replay';
import RrwebFullscreen from '../components/RrwebFullscreen';

declare const __APP_VERSION__: string;
declare const __PROJECT_ID__: string;

type ErrorItem = {
  id: string;
  createdAt: string;
  type: string;
  message: string;
  url: string;
  responseStatus?: number;
  stack?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestDuration?: number;
  responseStatusText?: string;
  metadata?: Record<string, any>;
  timestamp: number;
};

type ErrorsResponse = { errors: ErrorItem[]; total: number };

type ResolveResponse = {
  resolvedStack: string;
  frames: Array<{ file: string; line: number; column: number; function?: string; context?: { pre: string[]; line: string; post: string[] } }>;
  unmapped: boolean;
  message?: string;
};

export default function Errors() {
  const [type, setType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selected, setSelected] = useState<ErrorItem | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolveResponse | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [rrwebReady, setRrwebReady] = useState(false);
  const [showReplayFull, setShowReplayFull] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [type, page, limit]);

  const { data, isLoading, error } = useQuery<ErrorsResponse>({
    queryKey: ['errors', queryString],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3001/api/v1/errors?${queryString}`);
      if (!res.ok) throw new Error('Failed to fetch errors');
      return res.json();
    },
    staleTime: 5000,
  });

  useEffect(() => {
    setResolved(null);
    setShowOriginal(false);
    setIsPlaying(false);
    setCursor(null);
    if (!selected || !selected.stack) return;
    let aborted = false;
    (async () => {
      try {
        setResolving(true);
        const res = await fetch('http://localhost:3001/api/v1/sourcemaps/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: __PROJECT_ID__,
            version: __APP_VERSION__,
            originalStack: selected.stack,
            baseUrl: window.location.origin + '/',
          }),
        });
        if (!res.ok) throw new Error('resolve failed');
        const json = (await res.json()) as ResolveResponse;
        if (!aborted) setResolved(json);
      } catch (e) {
        if (!aborted) setResolved({ resolvedStack: '', frames: [], unmapped: true, message: String(e) });
      } finally {
        if (!aborted) setResolving(false);
      }
    })();
    return () => { aborted = true; };
  }, [selected]);

  // simple replay ticker
  useEffect(() => {
    if (!selected?.metadata?.replay) return;
    const rep = selected.metadata.replay as { startedAt: number; endedAt: number };
    if (!rep?.startedAt || !rep?.endedAt) return;
    let raf: number | null = null;
    let last = performance.now();
    const step = () => {
      const nowTs = performance.now();
      const dt = nowTs - last;
      last = nowTs;
      setCursor((prev) => {
        const base = prev == null ? rep.startedAt : prev;
        const next = base + dt;
        if (next >= rep.endedAt) {
          setIsPlaying(false);
          return rep.endedAt;
        }
        return next;
      });
      if (isPlaying) raf = requestAnimationFrame(step);
    };
    if (isPlaying) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [isPlaying, selected?.metadata?.replay]);

  // lazy-load rrweb player when needed (local dependency)
  useEffect(() => {
    const rep = selected?.metadata?.replay as any;
    if (!rep?.rrweb) {
      setRrwebReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await import('rrweb-player/dist/style.css');
        await import('rrweb-player');
        if (!cancelled) setRrwebReady(true);
      } catch {
        if (!cancelled) setRrwebReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected?.metadata?.replay?.rrweb]);

  // fullscreen handling moved into RrwebFullscreen component

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          className="card px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="JS">JS</option>
          <option value="RESOURCE">Resource</option>
          <option value="NETWORK">Network</option>
          <option value="PERFORMANCE">Performance</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Message</th>
              <th className="text-left p-3">URL</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="p-3" colSpan={5}>Loading...</td></tr>
            )}
            {error && (
              <tr><td className="p-3 text-red-600" colSpan={5}>{String(error)}</td></tr>
            )}
            {data?.errors?.map((e) => (
              <tr
                key={e.id}
                className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(e)}
                title="Click to view details"
              >
                <td className="p-3">{new Date(e.timestamp).toLocaleString()}</td>
                <td className="p-3">{e.type}</td>
                <td className="p-3 truncate max-w-[300px]" title={e.message}>{e.message}</td>
                <td className="p-3 truncate max-w-[300px]" title={e.url}>{e.url}</td>
                <td className="p-3">{e.responseStatus ?? '-'}</td>
              </tr>
            ))}
            {!isLoading && !error && (data?.errors?.length ?? 0) === 0 && (
              <tr><td className="p-6 text-gray-500" colSpan={5}>No data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="px-3 py-2 card" disabled={page===1} onClick={() => setPage((p)=>Math.max(1, p-1))}>Prev</button>
        <div className="text-sm text-gray-600">Page {page}</div>
        <button className="px-3 py-2 card" onClick={() => setPage((p)=>p+1)}>Next</button>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="card w-full max-w-2xl p-4 relative">
            <button
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-3">Error Detail</h3>
            <div className="space-y-2 text-sm max-h-[calc(70vh)] overflow-auto">
              <div><span className="text-gray-500">Time:</span> {new Date(selected.timestamp).toLocaleString()}</div>
              <div><span className="text-gray-500">Type:</span> {selected.type}</div>
              <div className="break-all"><span className="text-gray-500">Message:</span> {selected.message}</div>
              <div className="break-all"><span className="text-gray-500">URL:</span> {selected.url}</div>
              {selected.responseStatus !== undefined && (
                <div><span className="text-gray-500">Status:</span> {selected.responseStatus}</div>
              )}
              {selected.requestMethod && (
                <div><span className="text-gray-500">Request:</span> {selected.requestMethod} {selected.requestUrl}</div>
              )}
              {selected.requestDuration !== undefined && (
                <div><span className="text-gray-500">Duration:</span> {selected.requestDuration} ms</div>
              )}
              {selected.responseStatusText && (
                <div><span className="text-gray-500">StatusText:</span> {selected.responseStatusText}</div>
              )}

              <div className="mt-2 border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-700 font-medium">Stack</div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Show original</label>
                    <input type="checkbox" checked={showOriginal} onChange={(e)=>setShowOriginal(e.target.checked)} />
                  </div>
                </div>
                {showOriginal ? (
                  <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded max-h-64 overflow-auto">{selected.stack || 'No stack'}</pre>
                ) : (
                  <div>
                    {resolving && <div className="text-xs text-gray-500">Resolving…</div>}
                    {!resolving && (
                      resolved?.unmapped ? (
                        <pre className="whitespace-pre-wrap text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded max-h-64 overflow-auto">{resolved?.message || 'No frames could be mapped'}</pre>
                      ) : (
                        <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded max-h-64 overflow-auto">{resolved?.resolvedStack || 'No stack'}</pre>
                      )
                    )}
                  </div>
                )}
              </div>

              {resolved && resolved.frames?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-700">Frames (with context)</summary>
                  <div className="mt-2 space-y-3">
                    {resolved.frames.map((f, idx) => (
                      <div key={idx} className="border rounded p-2 bg-white">
                        <div className="text-xs text-gray-700 mb-1">{f.function || '<anonymous>'} — {f.file}:{f.line}:{f.column}</div>
                        {f.context && (
                          <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{[...f.context.pre, f.context.line, ...f.context.post].join('\n')}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {selected.metadata && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-700">Metadata</summary>
                  <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{JSON.stringify(selected.metadata, null, 2)}</pre>
                </details>
              )}

              {selected?.metadata?.replay && (() => {
                const rep = decodeReplay(selected.metadata.replay as any);
                const start = rep.startedAt;
                const end = rep.endedAt;
                const cur = cursor == null ? end : cursor;
                const duration = Math.max(0, end - start);
                const percent = duration ? Math.min(100, Math.max(0, ((cur - start) / duration) * 100)) : 0;
                const around = rep.rrweb ? [] : ((rep.events || []).filter((e: any) => Math.abs(e.t - cur) <= 1000).slice(-50));
                return (
                  <div className="mt-3 border-t pt-3">
                    {rep['rrweb'] ? (
                      <div className="flex items-center justify-between">
                        <div className="text-gray-700 font-medium">Replay</div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 card"
                            onClick={() => setShowReplayFull(true)}
                            disabled={!rrwebReady}
                            title={!rrwebReady ? 'Loading rrweb player…' : '全屏回放'}
                          >全屏回放</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-gray-700 font-medium">Replay</div>
                          <div className="flex items-center gap-2">
                            <button className="px-2 py-1 card" onClick={() => { setIsPlaying((p)=>!p); if (cursor==null) setCursor(start); }}>{isPlaying ? 'Pause' : 'Play'}</button>
                            <button className="px-2 py-1 card" onClick={() => { setIsPlaying(false); setCursor(start); }}>⏮</button>
                            <button className="px-2 py-1 card" onClick={() => { setIsPlaying(false); setCursor(end); }}>⏭</button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <input
                            type="range"
                            min={start}
                            max={end}
                            value={cur}
                            onChange={(e)=>{ setIsPlaying(false); setCursor(Number(e.target.value)); }}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-600 mt-1">{percent.toFixed(1)}% • {new Date(cur).toLocaleTimeString()}</div>
                        </div>
                        <div className="border rounded p-2 bg-white max-h-40 overflow-auto">
                          <div className="text-xs text-gray-500 mb-1">Nearby events (±1s)</div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500">
                                <th className="text-left">t+ms</th>
                                <th className="text-left">type</th>
                                <th className="text-left">detail</th>
                              </tr>
                            </thead>
                            <tbody>
                              {around.map((ev: any, i: number) => (
                                <tr key={i} className={Math.abs(ev.t - cur) < 50 ? 'bg-emerald-50' : ''}>
                                  <td>{ev.t - start}</td>
                                  <td>{ev.type}</td>
                                  <td className="truncate max-w-[260px]">{ev.target || ev.value || `${ev.x ?? ''},${ev.y ?? ''}`}</td>
                                </tr>
                              ))}
                              {around.length === 0 && (
                                <tr><td colSpan={3} className="text-gray-400">No events around cursor</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showReplayFull && (
        <RrwebFullscreen
          open={showReplayFull}
          onClose={() => setShowReplayFull(false)}
          replay={selected?.metadata?.replay}
        />
      )}
    </div>
  );
}
