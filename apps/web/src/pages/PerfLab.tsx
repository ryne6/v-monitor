import { useEffect, useMemo, useRef, useState } from 'react';

function useAnimation(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let raf: number;
    let t = 0;
    const step = () => {
      t += 0.016;
      if (ref.current) {
        const x = Math.sin(t) * 50;
        const y = Math.cos(t * 0.8) * 50;
        ref.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return ref;
}

export default function PerfLab() {
  const [rows, setRows] = useState(800);
  const [animate, setAnimate] = useState(true);
  const [text, setText] = useState('');
  const animRef = useAnimation(animate);
  const [mutations, setMutations] = useState<string[]>([]);

  const items = useMemo(() => Array.from({ length: rows }, (_, i) => ({ id: i, a: Math.random(), b: Math.random() })), [rows]);

  // Canvas animation
  useEffect(() => {
    const cvs = document.getElementById('lab-canvas') as HTMLCanvasElement | null;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const draw = () => {
      const { width, height } = cvs;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 150; i++) {
        ctx.fillStyle = `hsl(${(i * 7) % 360} 90% 60%)`;
        const x = (Math.sin(i * 0.3 + performance.now() * 0.002) * 0.5 + 0.5) * width;
        const y = (Math.cos(i * 0.2 + performance.now() * 0.002) * 0.5 + 0.5) * height;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // DOM mutation generator
  useEffect(() => {
    const interval = setInterval(() => {
      setMutations((m) => {
        const next = [...m, `mut-${Date.now()}`];
        if (next.length > 50) next.shift();
        return next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="card p-3 flex items-center gap-3">
        <label className="text-sm text-gray-600">Rows</label>
        <input className="card px-2 py-1 w-24" type="number" value={rows} onChange={(e)=>setRows(Math.max(0, Number(e.target.value)||0))} />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={animate} onChange={(e)=>setAnimate(e.target.checked)} /> Animate
        </label>
        <input className="card px-2 py-1 flex-1" placeholder="Type here to generate input events" value={text} onChange={(e)=>setText(e.target.value)} />
        <button
          className="px-3 py-2 card"
          onClick={() => {
            setTimeout(() => {
              throw new Error('PerfLab test error: manual trigger');
            }, 0);
          }}
        >Trigger</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-3">
          <div className="text-sm text-gray-600 mb-2">Virtual DOM stress</div>
          <div className="max-h-[50vh] overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left">#</th>
                  <th className="text-left">A</th>
                  <th className="text-left">B</th>
                  <th className="text-left">A*B</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td>{it.id}</td>
                    <td>{it.a.toFixed(5)}</td>
                    <td>{it.b.toFixed(5)}</td>
                    <td>{(it.a * it.b).toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-3 relative">
          <div className="text-sm text-gray-600 mb-2">Animation + Canvas</div>
          <div ref={animRef} className="absolute right-6 top-6 w-6 h-6 rounded-full bg-emerald-500 shadow-md" />
          <canvas id="lab-canvas" width={600} height={400} className="w-full h-[50vh] bg-white rounded" />
          <div className="mt-3 text-xs text-gray-600">
            <div className="font-medium mb-1">Recent DOM mutations:</div>
            <div className="grid grid-cols-3 gap-2">
              {mutations.map((m) => (
                <div key={m} className="card py-1 px-2 truncate">{m}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
