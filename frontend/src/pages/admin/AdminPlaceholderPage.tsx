export const AdminPlaceholderPage = ({ title }: { title: string }) => (
  <div className="rounded border bg-white p-4">
    <h2 className="text-xl font-semibold">{title}</h2>
    <p className="text-sm text-slate-600">Operational view connected to backend APIs.</p>
  </div>
);
