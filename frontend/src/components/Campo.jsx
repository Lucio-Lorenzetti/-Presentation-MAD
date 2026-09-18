export default function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
