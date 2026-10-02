export const StatusBadge = ({ value }: { value: string }) => {
  const colorMap: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${colorMap[value] ?? 'bg-slate-100 text-slate-700'}`}>
      {value}
    </span>
  );
};
