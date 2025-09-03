import { useQuery } from '@tanstack/react-query';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { data } = useQuery({
    queryKey: ['errors-stats'],
    queryFn: async () => {
      const params = new URLSearchParams();
      const res = await fetch(`/api/v1/errors/stats?${params}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const triggerSdkReport = () => {
    fetch('/api/v1/errors/error');
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card title="Total Errors">
        <div className="text-3xl font-semibold">{data?.total ?? '—'}</div>
      </Card>
      <Card title="By Type">
        <pre className="text-xs text-gray-700 overflow-auto max-h-48">{JSON.stringify(data?.byType, null, 2)}</pre>
      </Card>
      <Card title="Top URLs">
        <pre className="text-xs text-gray-700 overflow-auto max-h-48">{JSON.stringify(data?.byUrl, null, 2)}</pre>
      </Card>
      <div className="md:col-span-2 card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-500">Hourly Trend</div>
          <button onClick={triggerSdkReport} className="px-3 py-2 rounded-full bg-brand-600 text-white text-sm">Trigger SDK Report</button>
        </div>
        <pre className="text-xs text-gray-700 overflow-auto max-h-72">{JSON.stringify(data?.byHour, null, 2)}</pre>
      </div>
    </div>
  );
}
