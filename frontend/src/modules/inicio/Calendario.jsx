const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Paleta validada (dataviz skill, pares completos): Cobro = brand #F97316, Ajuste = #2a78d6, Fin de contrato = #4a3aa7.
const COLOR_TIPO = { COBRO: 'bg-brand-500', AJUSTE: 'bg-[#2a78d6]', FIN_CONTRATO: 'bg-[#4a3aa7]' };

const pad = n => String(n).padStart(2, '0');
const isoDe = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const hoyISO = () => { const h = new Date(); return isoDe(h.getFullYear(), h.getMonth(), h.getDate()); };

function construirGrilla(year, month) {
  const primerDia = new Date(year, month, 1);
  const offset = (primerDia.getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < offset; i++) {
    const diasPrevMes = new Date(year, month, 0).getDate();
    const d = diasPrevMes - offset + i + 1;
    celdas.push({ iso: isoDe(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d), d, fueraDeMes: true });
  }
  for (let d = 1; d <= diasEnMes; d++) celdas.push({ iso: isoDe(year, month, d), d, fueraDeMes: false });
  while (celdas.length % 7 !== 0 || celdas.length < 42) {
    const ultimo = celdas[celdas.length - 1];
    const [y, m, d] = ultimo.iso.split('-').map(Number);
    const sig = new Date(y, m - 1, d + 1);
    celdas.push({ iso: isoDe(sig.getFullYear(), sig.getMonth(), sig.getDate()), d: sig.getDate(), fueraDeMes: true });
  }
  return celdas;
}

export default function Calendario({ mes, onCambiarMes, itemsPorDia, diaSeleccionado, onSeleccionarDia, expandido, onAlternarExpandido }) {
  const year = mes.getFullYear();
  const month = mes.getMonth();
  const celdas = construirGrilla(year, month);
  const hoy = hoyISO();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold text-stone-800 ${expandido ? 'text-lg' : 'text-sm'}`}>{MESES[month]} {year}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => onCambiarMes(new Date(year, month - 1, 1))} className="w-7 h-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition">
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button onClick={() => onCambiarMes(new Date())} className="text-[14px] px-2 py-1 rounded-lg text-stone-500 hover:bg-stone-100 transition font-medium">Hoy</button>
          <button onClick={() => onCambiarMes(new Date(year, month + 1, 1))} className="w-7 h-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition">
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
          {onAlternarExpandido && (
            <button
              onClick={onAlternarExpandido}
              title={expandido ? 'Achicar calendario' : 'Agrandar calendario'}
              className="w-7 h-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-brand-600 transition ml-1"
            >
              <i className={`fa-solid ${expandido ? 'fa-down-left-and-up-right-to-center' : 'fa-up-right-and-down-left-from-center'} text-xs`}></i>
            </button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-7 gap-1 text-center text-stone-400 font-semibold mb-1 ${expandido ? 'text-sm' : 'text-[13px]'}`}>
        {DIAS.map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map(c => {
          const items = itemsPorDia.get(c.iso) || [];
          const tipos = [...new Set(items.map(i => i.tipo))];
          const hayVencida = items.some(i => i.vencida);
          const esHoy = c.iso === hoy;
          const seleccionado = c.iso === diaSeleccionado;
          return (
            <button
              key={c.iso}
              onClick={() => onSeleccionarDia(seleccionado ? null : c.iso)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition relative
                ${expandido ? 'text-base' : 'text-xs'}
                ${c.fueraDeMes ? 'text-stone-300' : hayVencida ? 'text-red-600 font-bold' : 'text-stone-600'}
                ${seleccionado ? 'bg-brand-500 !text-white' : esHoy ? 'bg-brand-50 ring-1 ring-brand-300' : 'hover:bg-stone-100'}
              `}
            >
              <span>{c.d}</span>
              {tipos.length > 0 && (
                <span className="flex items-center gap-1">
                  {tipos.slice(0, 3).map(t => (
                    <span key={t} className={`rounded-full ${expandido ? 'w-2 h-2' : 'w-1.5 h-1.5'} ${seleccionado ? 'bg-white' : COLOR_TIPO[t]}`}></span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-stone-100 text-[14px] text-stone-500">
        <Leyenda color={COLOR_TIPO.COBRO} label="Cobro" />
        <Leyenda color={COLOR_TIPO.AJUSTE} label="Ajuste IPC/ICL" />
        <Leyenda color={COLOR_TIPO.FIN_CONTRATO} label="Fin de contrato" />
      </div>
    </div>
  );
}

function Leyenda({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`}></span>
      {label}
    </span>
  );
}
