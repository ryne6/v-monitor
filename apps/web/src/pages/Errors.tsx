import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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

export default function Errors() {
  const [type, setType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selected, setSelected] = useState<ErrorItem | null>(null);

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
      const res = await fetch(`/api/v1/errors?${queryString}`);
      if (!res.ok) throw new Error('Failed to fetch errors');
      return res.json();
    },
    staleTime: 5000,
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
            <div className="space-y-2 text-sm">
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
              {selected.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-700">Stack</summary>
                  <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{selected.stack}</pre>
                </details>
              )}
              {selected.metadata && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-700">Metadata</summary>
                  <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{JSON.stringify(selected.metadata, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
