import { Link } from 'react-router-dom';

export const CitizenDashboardPage = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Citizen Dashboard</h2>
      <div className="rounded border bg-white p-4">
        <p>Report and track waste issues in your area.</p>
        <div className="mt-3 flex gap-3">
          <Link className="rounded bg-emerald-700 px-3 py-2 text-white" to="/citizen/report">Report Waste</Link>
          <Link className="rounded border px-3 py-2" to="/citizen/reports">My Reports</Link>
        </div>
      </div>
    </div>
  );
};
