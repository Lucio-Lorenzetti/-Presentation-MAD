export default function Topbar({ title, subtitle, children }) {
  return (
    <div className="md:sticky md:top-0 bg-white z-10 px-4 sm:px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-stone-800">{title}</h2>
        {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
