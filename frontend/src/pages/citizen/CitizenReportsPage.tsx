import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import type { WasteReport } from '../../types';

export const CitizenReportsPage = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<WasteReport[]>([]);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: WasteReport[] }>('/reports', { token }).then((payload) => setReports(payload.data));
  }, [token]);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">My Reports</h2>
      <div className="rounded border bg-white">
        {reports.map((report) => (
          <Link key={report.id} to={`/citizen/reports/${report.id}`} className="flex items-center justify-between border-b p-3 hover:bg-slate-50">
            <div>
              <p className="font-medium">{report.title}</p>
              <p className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</p>
            </div>
            <StatusBadge value={report.priority} />
          </Link>
        ))}
      </div>
    </div>
  );
};
