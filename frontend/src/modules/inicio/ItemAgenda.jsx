import { armarLinkWhatsApp, mensajeAgenda } from '../../whatsapp';
import { dinero } from '../../format';

const ICONO_TIPO = { COBRO: 'fa-sack-dollar', AJUSTE: 'fa-arrow-trend-up', FIN_CONTRATO: 'fa-file-contract' };
const COLOR_TIPO = { COBRO: 'bg-brand-50 text-brand-600', AJUSTE: 'bg-[#2a78d6]/10 text-[#2a78d6]', FIN_CONTRATO: 'bg-[#4a3aa7]/10 text-[#4a3aa7]' };

function diasDesdeHoy(fechaISO) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  return Math.round((f - hoy) / 86400000);
}

function badgeEstado(fechaISO) {
  const dias = diasDesdeHoy(fechaISO);
  if (dias === 0) return { texto: 'Vence hoy', clase: 'bg-brand-500 text-white' };
  if (dias < 0) return { texto: `Vencido hace ${-dias} día${dias === -1 ? '' : 's'}`, clase: 'bg-red-50 text-red-600' };
  if (dias === 1) return { texto: 'Mañana', clase: 'bg-stone-100 text-stone-500' };
  return { texto: `En ${dias} días`, clase: 'bg-stone-100 text-stone-500' };
}

export default function ItemAgenda({ item, onAbrirContrato }) {
  const badge = badgeEstado(item.fecha);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-warm-50 transition group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${COLOR_TIPO[item.tipo]}`}>
        <i className={`fa-solid ${ICONO_TIPO[item.tipo]} text-xs`}></i>
      </div>
      <button className="min-w-0 flex-1 text-left" onClick={() => onAbrirContrato(item.contratoId)}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-700 truncate">{item.titulo}</span>
          <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[12px] font-bold ${badge.clase}`}>{badge.texto}</span>
        </div>
        <div className="text-[14px] text-stone-400 truncate">
          {item.persona}{item.propietario ? ` · Propietario: ${item.propietario}` : ''} — {item.propiedad}
        </div>
      </button>
      {item.monto != null && <span className="text-xs font-bold text-stone-700 shrink-0">{dinero(item.monto)}</span>}
      {item.telefono && (
        <a
          href={armarLinkWhatsApp(mensajeAgenda(item))}
          target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="w-7 h-7 rounded-lg bg-stone-100 text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition shrink-0"
          title="Avisar por WhatsApp"
        >
          <i className="fa-brands fa-whatsapp text-xs"></i>
        </a>
      )}
    </div>
  );
}
