// Exportación a .xlsx real (SheetJS). Mismo formato de columnas que se usaba
// con csv.js: [{ titulo, valor: fila => valor }].
import * as XLSX from 'xlsx';

function hojaDesde(columnas, filas) {
  const encabezados = columnas.map(c => c.titulo);
  const datos = filas.map(f => columnas.map(c => c.valor(f) ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...datos]);
  ws['!cols'] = columnas.map((c, i) => {
    const maxDato = datos.reduce((m, fila) => Math.max(m, String(fila[i] ?? '').length), 0);
    return { wch: Math.min(40, Math.max(10, c.titulo.length + 2, maxDato + 2)) };
  });
  return ws;
}

// Uso simple, una sola hoja: descargarExcel('personas.xlsx', columnas, filas)
export function descargarExcel(nombre, columnas, filas, nombreHoja = 'Datos') {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hojaDesde(columnas, filas), nombreHoja.slice(0, 31));
  XLSX.writeFile(wb, nombre);
}

// Uso con varias hojas: descargarExcelMultiple('estadisticas.xlsx', [{ nombre, columnas, filas }, ...])
export function descargarExcelMultiple(nombre, hojas) {
  const wb = XLSX.utils.book_new();
  hojas.forEach(h => XLSX.utils.book_append_sheet(wb, hojaDesde(h.columnas, h.filas), h.nombre.slice(0, 31)));
  XLSX.writeFile(wb, nombre);
}
