import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Topbar from '../../components/Topbar';
import Estado from '../../components/Estado';
import PropiedadDetalle from '../propiedades/PropiedadDetalle';
import PropiedadForm from '../propiedades/PropiedadForm';
import { propiedadesApi } from '../../api/recursos';
import { useCarga } from '../../hooks';

const TIPOS = { CASA: 'Casa', DEPTO: 'Depto', LOCAL: 'Local', PH: 'PH' };
const ESTADOS = { DISPONIBLE: 'Disponible', ALQUILADA: 'Alquilada', EN_REPARACION: 'En reparación' };
// Paleta validada (dataviz skill, misma que Estadísticas): sin ambigüedad para daltonismo.
const COLOR_ESTADO = { DISPONIBLE: '#10B981', ALQUILADA: '#F97316', EN_REPARACION: '#EF4444' };

const BAHIA_BLANCA = [-38.7183, -62.2660];

function iconoCasa(estado, aproximado) {
  const color = COLOR_ESTADO[estado] || '#78716C';
  const borde = aproximado ? '2px dashed white' : '2px solid white';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:${borde};box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
             <i class="fa-solid fa-house" style="color:#fff;font-size:10px;transform:rotate(45deg);"></i>
           </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

export default function MapaPage() {
  const { datos: propiedades, cargando, error, recargar } = useCarga(() => propiedadesApi.listar(), []);
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [barrio, setBarrio] = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [editando, setEditando] = useState(null);

  const mapaRef = useRef(null);
  const marcadoresRef = useRef([]);
  const observerRef = useRef(null);

  const conUbicacion = useMemo(() => (propiedades || []).filter(p => p.lat && p.lng), [propiedades]);
  const barrios = useMemo(() => [...new Set((propiedades || []).map(p => p.barrio).filter(Boolean))].sort(), [propiedades]);
  const filtradas = useMemo(() => conUbicacion.filter(p =>
    (!tipo || p.tipo === tipo) && (!estado || p.estado === estado) && (!barrio || p.barrio === barrio)
  ), [conUbicacion, tipo, estado, barrio]);

  // `asignarContenedor` es estable (no se vuelve a crear en cada render), así
  // que si leyera `filtradas` directamente quedaría con los datos del primer
  // render para siempre — por eso se lee de una ref que se actualiza en cada
  // render, sin pasar por un efecto.
  const filtradasRef = useRef(filtradas);
  filtradasRef.current = filtradas;

  function dibujarMarcadores(mapa, lista) {
    marcadoresRef.current.forEach(m => m.remove());
    marcadoresRef.current = lista.map(p => {
      const aproximado = p.geocoding_estado === 'APROXIMADO';
      const marcador = L.marker([p.lat, p.lng], { icon: iconoCasa(p.estado, aproximado), draggable: true }).addTo(mapa);
      const textoTooltip = `${p.direccion}${p.barrio ? ' — ' + p.barrio : ''}` + (aproximado ? ' (ubicación aproximada — arrastrá el pin para ajustarla)' : '');
      marcador.bindTooltip(textoTooltip, { direction: 'top' });
      marcador.on('click', () => setDetalleId(p.id));
      marcador.on('dragstart', () => marcador.closeTooltip());
      marcador.on('dragend', async () => {
        const { lat, lng } = marcador.getLatLng();
        try {
          await propiedadesApi.actualizarUbicacion(p.id, lat, lng);
          await recargar();
        } catch {
          marcador.setLatLng([p.lat, p.lng]); // no se pudo guardar: volvemos a la posición anterior
        }
      });
      return marcador;
    });
  }

  // El contenedor del mapa sólo existe en el DOM una vez que terminó de
  // cargar (está detrás de un `{propiedades && ...}`), así que un useEffect
  // con `[]` corre antes de que exista y nunca vuelve a intentarlo. Con un
  // ref-callback nos enteramos apenas React lo monta (y lo desmonta), sin
  // depender de en qué momento del ciclo de vida pasa eso. Además, StrictMode
  // desmonta y remonta el contenedor una vez al entrar (para detectar bugs),
  // así que el mapa se recrea sin que cambien los datos — por eso acá mismo
  // se dibujan los marcadores con los datos más recientes, no sólo se espera
  // al efecto de abajo (que nunca se dispara en ese caso porque `filtradas`
  // no cambió).
  const asignarContenedor = useCallback(node => {
    if (mapaRef.current) {
      observerRef.current?.disconnect();
      mapaRef.current.remove();
      mapaRef.current = null;
    }
    if (!node) return;

    const mapa = L.map(node).setView(BAHIA_BLANCA, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapa);
    mapaRef.current = mapa;
    dibujarMarcadores(mapa, filtradasRef.current);

    // Por si el contenedor cambia de tamaño después (colapsar el menú, etc.)
    const observer = new ResizeObserver(() => mapa.invalidateSize());
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  // Redibujar los marcadores cuando cambian los filtros o los datos
  // (con el mapa ya creado).
  useEffect(() => {
    if (!mapaRef.current) return;
    dibujarMarcadores(mapaRef.current, filtradas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtradas]);

  const sinUbicar = (propiedades || []).length - conUbicacion.length;

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Mapa de propiedades"
        subtitle={propiedades ? `${conUbicacion.length} ubicadas en Bahía Blanca${sinUbicar > 0 ? ` · ${sinUbicar} sin ubicar todavía` : ''}` : ' '}
      />

      <div className="px-6 py-5 flex-1 flex flex-col">
        <Estado cargando={cargando && !propiedades} error={error} vacio={propiedades && conUbicacion.length === 0} mensajeVacio="Ninguna propiedad tiene ubicación cargada todavía." />

        {propiedades && conUbicacion.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 focus:outline-none">
                <option value="">Todos los tipos</option>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={estado} onChange={e => setEstado(e.target.value)} className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 focus:outline-none">
                <option value="">Todos los estados</option>
                {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={barrio} onChange={e => setBarrio(e.target.value)} className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 focus:outline-none">
                <option value="">Todos los barrios</option>
                {barrios.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <div className="flex items-center gap-3 ml-auto text-[13px] text-stone-500">
                <Leyenda color={COLOR_ESTADO.DISPONIBLE} label="Disponible" />
                <Leyenda color={COLOR_ESTADO.ALQUILADA} label="Alquilada" />
                <Leyenda color={COLOR_ESTADO.EN_REPARACION} label="En reparación" />
                <span className="flex items-center gap-1.5 text-stone-400" title="OpenStreetMap no tiene la altura exacta de esa calle: el pin queda aproximado. Arrastralo para ubicarlo bien.">
                  <span className="w-2.5 h-2.5 rounded-full border border-dashed border-stone-400"></span>
                  Aproximado (arrastrable)
                </span>
              </div>
            </div>

            <div ref={asignarContenedor} className="flex-1 min-h-[480px] rounded-xl border border-stone-200 overflow-hidden" />
          </>
        )}
      </div>

      {detalleId && (
        <PropiedadDetalle
          id={detalleId}
          onCerrar={() => setDetalleId(null)}
          onEditar={p => { setDetalleId(null); setEditando(p); }}
          onCambio={recargar}
        />
      )}

      {editando && (
        <PropiedadForm
          propiedad={editando}
          onCerrar={() => setEditando(null)}
          onGuardada={() => { setEditando(null); recargar(); }}
        />
      )}
    </div>
  );
}

function Leyenda({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }}></span>
      {label}
    </span>
  );
}
