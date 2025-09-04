import { useEffect } from 'react';
import pako from 'pako';

type Props = {
  open: boolean;
  onClose: () => void;
  replay: any;
};

export default function RrwebFullscreen({ open, onClose, replay }: Props) {
  // mount rrweb player
  useEffect(() => {
    if (!open || !replay?.rrweb) return;
    let cancelled = false;
    (async () => {
      try {
        const container = document.getElementById('replay-full-container');
        if (!container) return;
        container.innerHTML = '';
        const mod: any = await import('rrweb-player');
        const Player = (mod && mod.default) || (window as any).rrwebPlayer;
        let events: any[] = Array.isArray(replay?.events) ? replay.events : [];
        if ((!events || events.length === 0) && replay?.encoding === 'gzip+base64' && replay?.payload) {
          try {
            const bin = atob(replay.payload as string);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const json = pako.ungzip(bytes, { to: 'string' }) as string;
            events = JSON.parse(json);
          } catch {}
        }
        if (cancelled) return;
        // eslint-disable-next-line new-cap
        const player = new Player({
          target: container,
          props: {
            events: events || [],
            autoPlay: true,
            showController: true,
            width: '100%',
            height: '100%'
          }
        });
        const host = container as HTMLElement;
        if (!cancelled && host.requestFullscreen) {
          host.requestFullscreen().catch(()=>{});
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, replay?.rrweb, replay?.payload]);

  // esc & lock scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
      }
    };
    const onFs = () => { if (!document.fullscreenElement) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs as any);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs as any);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        }
      }}
    >
      <button
        className="absolute right-4 top-4 z-[61] px-3 py-2 card text-white bg-white/10 border-white/20 hover:bg-white/20"
        onClick={() => {
          onClose();
          if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        }}
      >退出全屏</button>
      <div id="replay-full-container" className="absolute inset-0" />
    </div>
  );
}


