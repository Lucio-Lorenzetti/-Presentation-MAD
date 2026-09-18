export const dinero = n =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const fecha = iso => (iso ? iso.split('-').reverse().join('/') : '—');

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDni = d => (d ? String(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—');
export const formatCuit = c => (c && c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c || '—');
