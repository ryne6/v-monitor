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
      const res = await fetch(`http://localhost:3001/api/v1/errors/stats?${params}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

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
    </div>
  );
}
