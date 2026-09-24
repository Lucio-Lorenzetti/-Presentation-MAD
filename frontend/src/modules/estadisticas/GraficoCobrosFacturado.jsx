const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesCorto = periodo => MESES[Number(periodo.slice(5, 7)) - 1];

// Path de una barra con las esquinas superiores redondeadas (ancladas a la base).
function barPath(x, y, w, h, r) {
  const radio = Math.min(r, w / 2, h);
  if (h <= 0) return '';
  if (radio <= 0.5) return `M${x},${y} h${w} v${h} h${-w} Z`;
  return `M${x},${y + radio} Q${x},${y} ${x + radio},${y}
    L${x + w - radio},${y} Q${x + w},${y} ${x + w},${y + radio}
    L${x + w},${y + h} L${x},${y + h} Z`;
}

// Gráfico de barras agrupadas "Cobrado vs Facturado" por mes, en SVG propio.
// Paleta validada (dataviz skill): Cobrado = brand-500 #F97316, Facturado = #2a78d6.
export default function GraficoCobrosFacturado({ datos }) {
  const W = 760;
  const H = 220;
  const padBottom = 22;
  const padTop = 8;
  const chartH = H - padBottom - padTop;
  const max = Math.max(1, ...datos.flatMap(d => [d.cobrado, d.facturado]));

  const totalCobrado = datos.reduce((a, d) => a + d.cobrado, 0);
  const totalFacturado = datos.reduce((a, d) => a + d.facturado, 0);
  const dinero = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  const groupW = W / datos.length;
  const barW = Math.min(20, groupW / 2 - 6);
  const gap = 3;

  return (
    <div>
      <div className="flex items-center gap-5 mb-3">
        <Leyenda color="bg-brand-500" label="Cobrado" total={dinero(totalCobrado)} />
        <Leyenda color="bg-[#2a78d6]" label="Facturado" total={dinero(totalFacturado)} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]" role="img" aria-label="Cobrado vs facturado por mes">
        <line x1="0" y1={H - padBottom} x2={W} y2={H - padBottom} stroke="#e1e0d9" strokeWidth="1" />
        {datos.map((d, i) => {
          const cx = i * groupW + groupW / 2;
          const hc = (d.cobrado / max) * chartH;
          const hf = (d.facturado / max) * chartH;
          const xc = cx - barW - gap / 2;
          const xf = cx + gap / 2;
          const base = H - padBottom;
          return (
            <g key={d.periodo}>
              <path d={barPath(xc, base - hc, barW, hc, 4)} fill="#F97316">
                <title>{`Cobrado ${mesCorto(d.periodo)}: ${dinero(d.cobrado)}`}</title>
              </path>
              <path d={barPath(xf, base - hf, barW, hf, 4)} fill="#2a78d6">
                <title>{`Facturado ${mesCorto(d.periodo)}: ${dinero(d.facturado)}`}</title>
              </path>
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="12" fill="#898781">{mesCorto(d.periodo)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Leyenda({ color, label, total }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
      <span className="text-stone-500">{label}</span>
      <span className="font-bold text-stone-800">{total}</span>
    </div>
  );
}
