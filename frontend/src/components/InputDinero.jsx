import { useEffect, useRef, useState } from 'react';

// Formatea un valor numérico "limpio" (ej. "165000" o "1650.5") al estilo peso
// argentino: punto de miles y, si corresponde, coma decimal.
function formatear(valorNumerico, decimales) {
  if (valorNumerico === '' || valorNumerico === null || valorNumerico === undefined) return '';
  const texto = String(valorNumerico);
  const signo = texto.startsWith('-') ? '-' : '';
  const [entero, decimal] = (signo ? texto.slice(1) : texto).split('.');
  const enteroFmt = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!decimales) return signo + enteroFmt;
  return decimal !== undefined ? `${signo}${enteroFmt},${decimal}` : signo + enteroFmt;
}

// Input de dinero: el usuario ve el formato argentino (1.234.567,89) mientras
// escribe, pero onChange siempre entrega un string numérico "limpio" (con "."
// como separador decimal), para que el resto del formulario lo siga tratando
// como un número común (Number(valor)) sin enterarse del formateo visual.
export default function InputDinero({ value, onChange, decimales = false, className = '', ...props }) {
  const ref = useRef(null);
  const [texto, setTexto] = useState(() => formatear(value, decimales));

  useEffect(() => {
    setTexto(formatear(value, decimales));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function manejarCambio(e) {
    const crudo = e.target.value;
    let limpio = decimales ? crudo.replace(/[^\d,]/g, '') : crudo.replace(/\D/g, '');
    if (decimales) {
      const [primero, ...resto] = limpio.split(',');
      limpio = resto.length ? `${primero},${resto.join('')}` : primero;
    }
    const numerico = decimales ? limpio.replace(',', '.') : limpio;
    const formateado = formatear(numerico, decimales);
    setTexto(formateado);
    onChange(numerico);
    requestAnimationFrame(() => ref.current?.setSelectionRange(formateado.length, formateado.length));
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">$</span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={`input ${className}`}
        style={{ paddingLeft: '1.75rem' }}
        value={texto}
        onChange={manejarCambio}
        {...props}
      />
    </div>
  );
}
