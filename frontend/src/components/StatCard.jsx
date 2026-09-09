export default function StatCard({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'bg-warm-50 border-stone-100 text-stone-800',
    danger: 'bg-red-50 border-red-100 text-red-600',
    success: 'text-emerald-600 bg-warm-50 border-stone-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] === tones.danger ? tones.danger : 'bg-warm-50 border-stone-100'}`}>
      <div className={`text-xs mb-1 ${tone === 'danger' ? 'text-red-400' : 'text-stone-400'}`}>{label}</div>
      <div className={`text-2xl font-extrabold ${tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-stone-800'}`}>
        {value}
      </div>
      {hint && <div className={`text-[10px] mt-0.5 ${tone === 'danger' ? 'text-red-400' : 'text-stone-400'}`}>{hint}</div>}
    </div>
  );
}
