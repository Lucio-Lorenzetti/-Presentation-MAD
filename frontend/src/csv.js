// Descarga un CSV (compatible con Excel: BOM + separador ';').
export function descargarCSV(nombre, columnas, filas) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = [columnas.map(c => esc(c.titulo)).join(';'), ...filas.map(f => columnas.map(c => esc(c.valor(f))).join(';'))];
  const blob = new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
