import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';

export const CitizenReportDetailPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id || !token) return;
    apiRequest(`/reports/${id}`, { token }).then(setData);
  }, [id, token]);

  if (!data) return <p>Loading report...</p>;

  const report = data.data.report;
  const analysis = data.data.analysis;

  return (
    <div className="space-y-3 rounded border bg-white p-4">
      <h2 className="text-xl font-semibold">{report.title}</h2>
      <img src={report.image_url} alt="Waste report" className="max-h-72 rounded object-cover" />
      <p>{report.description}</p>
      <p>Status: {report.status}</p>
      <div>
        <h3 className="font-semibold">AI Analysis (AI-generated)</h3>
        {analysis ? (
          <ul className="text-sm">
            <li>Waste Type: {analysis.waste_type}</li>
            <li>AI-estimated volume: {analysis.estimated_volume} kg</li>
            <li>Severity: {analysis.severity}</li>
            <li>Confidence: {Math.round((analysis.confidence ?? 0) * 100)}%</li>
            <li>Recommended action: {analysis.recommended_action}</li>
          </ul>
        ) : (
          <p>AI analysis unavailable. Report submitted for manual review.</p>
        )}
      </div>
    </div>
  );
};
