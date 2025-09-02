import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function Errors() {
  const [type, setType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [type, page, limit]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['errors', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/v1/errors?${queryString}`);
      if (!res.ok) throw new Error('Failed to fetch errors');
      return res.json() as Promise<{ errors: any[]; total: number }>;
    },
    keepPreviousData: true,
  });

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
              <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="p-3">{e.type}</td>
                <td className="p-3 truncate max-w-[300px]" title={e.message}>{e.message}</td>
                <td className="p-3 truncate max-w-[300px]" title={e.url}>{e.url}</td>
                <td className="p-3">{e.responseStatus ?? '-'}</td>
              </tr>
            ))}
            {!isLoading && !error && data?.errors?.length === 0 && (
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
    </div>
  );
}
