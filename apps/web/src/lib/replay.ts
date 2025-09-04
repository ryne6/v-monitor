import pako from 'pako';

export type RawReplay = any;

export function decodeReplay(repRaw: RawReplay): any {
  if (!repRaw) return repRaw;
  if (repRaw.encoding === 'gzip+base64' && repRaw.payload) {
    try {
      const b64 = repRaw.payload as string;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const json = pako.ungzip(bytes, { to: 'string' }) as string;
      const events = JSON.parse(json);
      const getTs = (ev: any) => (typeof ev.t === 'number' ? ev.t : (typeof ev.timestamp === 'number' ? ev.timestamp : Date.now()));
      const startedAt = repRaw.startedAt ?? (events.length ? getTs(events[0]) : Date.now());
      const endedAt = repRaw.endedAt ?? (events.length ? getTs(events[events.length - 1]) : startedAt);
      return { ...repRaw, events, startedAt, endedAt };
    } catch {}
  }
  return repRaw;
}


