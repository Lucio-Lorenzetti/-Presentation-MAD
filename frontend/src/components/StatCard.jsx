export default function StatCard({ label, value, hint, tone = 'default', icon }) {
  const tones = {
    default: 'bg-warm-50 border-stone-100 text-stone-800',
    danger: 'bg-red-50 border-red-100 text-red-600',
    success: 'text-emerald-600 bg-warm-50 border-stone-100',
  };
  const iconTone = {
    default: 'bg-brand-50 text-brand-500',
    success: 'bg-emerald-50 text-emerald-500',
    danger: 'bg-red-100 text-red-500',
  };
  return (
    <div className={`rounded-xl border p-4 transition hover:shadow-sm ${tones[tone] === tones.danger ? tones.danger : 'bg-warm-50 border-stone-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-xs mb-1 ${tone === 'danger' ? 'text-red-400' : 'text-stone-400'}`}>{label}</div>
          <div className={`text-2xl font-extrabold ${tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-stone-800'}`}>
            {value}
          </div>
        </div>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconTone[tone] || iconTone.default}`}>
            <i className={`fa-solid ${icon} text-xs`}></i>
          </div>
        )}
      </div>
      {hint && <div className={`text-[13px] mt-0.5 ${tone === 'danger' ? 'text-red-400' : 'text-stone-400'}`}>{hint}</div>}
    </div>
  );
}
