// Carga datos de prueba (los de la presentación + algunos extra).
//   npm run seed            → carga si la base de gestión está vacía
//   npm run seed -- --reset → borra personas/propiedades/contratos/pagos y recarga
// No toca la tabla de facturas.
const db = require('../src/db');
const personas = require('../src/services/personasService');
const propiedades = require('../src/services/propiedadesService');
const contratos = require('../src/services/contratosService');
const auth = require('../src/services/authService');
const { hoyISO, sumarMeses } = require('../src/utils/fechas');

async function main() {
  await db.inicializar();

  const reset = process.argv.includes('--reset');
  const hayDatos = (await db.prepare('SELECT COUNT(*) AS n FROM personas').get()).n > 0;

  if (hayDatos && !reset) {
    console.log('La base ya tiene datos. Usá `npm run seed -- --reset` para borrarlos y recargar.');
    process.exit(0);
  }
  if (reset) {
    await db.exec('TRUNCATE TABLE pagos, ajustes, cuotas, contratos, garantes, propiedades, personas RESTART IDENTITY CASCADE');
    console.log('Datos anteriores borrados.');
  }

  const hoy = hoyISO();

  // ── Usuarios demo (uno por rol). No se borran con --reset. Contraseña: demo1234 ──
  for (const [nombre, email, rol] of [
    ['Administrador', 'admin@mad.local', 'ADMINISTRADOR'],
    ['Desarrollador', 'dev@mad.local', 'DESARROLLADOR'],
    ['Gestor Demo', 'gestor@mad.local', 'GESTOR'],
    ['Consulta Demo', 'consulta@mad.local', 'CONSULTA'],
  ]) {
    if (!(await db.prepare('SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER(?)').get(email))) {
      await auth.crearUsuario({ nombre, email, rol, password: 'demo1234' });
    }
  }

  // ── Propietarios ─────────────────────────────────────────────────────────────
  const prop = {};
  for (const p of [
    { k: 'ricardo', nombre: 'Ricardo Gutiérrez', dni: '24567890', email: 'rgutierrez@mail.com', telefono: '291 4551234', domicilio: 'Rondeau 120, Bahía Blanca', metodoCobro: 'Transferencia', cbu: '0170099220000012345678', alias: 'ricardo.gutierrez.mp', comisionPct: 5 },
    { k: 'maria', nombre: 'María Torres', dni: '28901234', email: 'mtorres@mail.com', telefono: '291 4667788', domicilio: 'Zelarrayán 455, Bahía Blanca', metodoCobro: 'Efectivo', comisionPct: 5 },
    { k: 'bahia', nombre: 'Inversiones Bahía SA', cuit: '30712345678', email: 'administracion@invbahia.com.ar', telefono: '291 4550011', domicilio: 'Av. Alem 890, Bahía Blanca', metodoCobro: 'Transferencia', cbu: '0140000701234500012345', alias: 'invbahia.sa', comisionPct: 4 },
    { k: 'carlos', nombre: 'Carlos Peralta', dni: '20345678', email: 'cperalta@mail.com', telefono: '291 4881122', metodoCobro: 'Transferencia', cbu: '0720000088000012345671', comisionPct: 5 },
    { k: 'susana', nombre: 'Susana Ledesma', dni: '17890123', email: 'sledesma@mail.com', telefono: '291 4223344', metodoCobro: 'Cheque', comisionPct: 6 },
    { k: 'roberto', nombre: 'Roberto Aguirre', dni: '22456789', email: 'raguirre@mail.com', telefono: '291 4998877', domicilio: 'Chiclana 200, Bahía Blanca', metodoCobro: 'Transferencia', cbu: '0110599520000098765432', alias: 'roberto.aguirre.mp', comisionPct: 5 },
    { k: 'silvia', nombre: 'Silvia Correa', dni: '19876543', email: 'scorrea@mail.com', telefono: '291 4112233', metodoCobro: 'Efectivo', comisionPct: 6 },
    { k: 'fernando', nombre: 'Fernando Paz e Hijos SRL', cuit: '30698765432', email: 'contacto@fpazsrl.com.ar', telefono: '291 4556677', domicilio: 'Av. Cabrera 780, Bahía Blanca', metodoCobro: 'Transferencia', cbu: '0290012345000067891234', alias: 'fpaz.srl', comisionPct: 4 },
  ]) {
    const { k, ...datos } = p;
    prop[k] = (await personas.crear({ ...datos, tipo: 'PROPIETARIO' })).id;
  }

  // ── Inquilinos (con garantes) ────────────────────────────────────────────────
  const garantes = n => Array.from({ length: n }, (_, i) => ({ nombre: `Garante ${i + 1}`, dni: String(30000000 + Math.floor(Math.random() * 9000000)), telefono: '291 4' + String(100000 + Math.floor(Math.random() * 899999)), tipoGarantia: i === 0 ? 'Propietaria' : 'Recibo de sueldo' }));
  const inq = {};
  for (const p of [
    { k: 'laura', nombre: 'Laura Fernández', dni: '35123456', email: 'lfernandez@mail.com', telefono: '291 5123456', metodoCobro: 'Transferencia', garantes: garantes(2) },
    { k: 'diego', nombre: 'Diego Sosa', dni: '32456789', cuit: '20324567895', email: 'dsosa@empresa.com', telefono: '291 5234567', metodoCobro: 'Transferencia', garantes: garantes(2) },
    { k: 'carolina', nombre: 'Carolina Méndez', dni: '33678901', email: 'cmendez@mail.com', telefono: '291 5345678', metodoCobro: 'Transferencia', garantes: garantes(1) },
    { k: 'pablo', nombre: 'Pablo Iglesias', dni: '29345678', email: 'piglesias@mail.com', telefono: '291 5456789', metodoCobro: 'Efectivo', garantes: garantes(2) },
    { k: 'martin', nombre: 'Martín Rodríguez', dni: '36789012', email: 'mrodriguez@mail.com', telefono: '291 5567890', metodoCobro: 'Transferencia', garantes: garantes(1) },
    { k: 'ana', nombre: 'Ana Ruiz', dni: '31234567', email: 'aruiz@mail.com', telefono: '291 5678901', metodoCobro: 'Efectivo', garantes: garantes(2) },
    { k: 'jorge', nombre: 'Jorge Benítez', dni: '27654321', telefono: '291 5789012', notas: 'Dejó deuda impaga en alquiler anterior.', listaNegra: true },
    { k: 'valeria', nombre: 'Valeria Gómez', dni: '34567890', email: 'vgomez@mail.com', telefono: '291 5890123', metodoCobro: 'Transferencia', garantes: garantes(2) },
    { k: 'nicolas', nombre: 'Nicolás Castro', dni: '30987654', cuit: '20309876543', email: 'ncastro@empresa.com', telefono: '291 5901234', metodoCobro: 'Transferencia', garantes: garantes(1) },
    { k: 'lucia', nombre: 'Lucía Herrera', dni: '37890123', email: 'lherrera@mail.com', telefono: '291 5012345', metodoCobro: 'Efectivo', garantes: garantes(2) },
    { k: 'franco', nombre: 'Franco Molina', dni: '28123456', telefono: '291 5123098', metodoCobro: 'Transferencia', garantes: garantes(1) },
  ]) {
    const { k, ...datos } = p;
    inq[k] = (await personas.crear({ ...datos, tipo: 'INQUILINO' })).id;
  }

  // ── Propiedades ──────────────────────────────────────────────────────────────
  const casa = {};
  for (const p of [
    { k: 'belgrano', direccion: 'Belgrano 445, Centro', tipo: 'CASA', propietarioId: prop.ricardo, barrio: 'Centro', ambientes: 5, dormitorios: 3, banos: 2, superficieM2: 140, servicios: 'Luz, gas, agua', alquilerSugerido: 280000, partida: '007-123456', descripcion: 'Casa con patio y cochera.' },
    { k: 'alsina', direccion: 'Alsina 234, 3° B', tipo: 'DEPTO', propietarioId: prop.maria, barrio: 'Centro', ambientes: 3, dormitorios: 2, banos: 1, superficieM2: 62, expensas: 45000, servicios: 'Luz, gas', alquilerSugerido: 185000, partida: '007-234567' },
    { k: 'colon', direccion: 'Av. Colón 1450', tipo: 'LOCAL', propietarioId: prop.bahia, barrio: 'Villa Mitre', banos: 1, superficieM2: 95, servicios: 'Luz', alquilerSugerido: 420000, partida: '007-345678', descripcion: 'Local sobre avenida, vidriera doble.' },
    { k: 'ohiggins', direccion: "O'Higgins 567", tipo: 'PH', propietarioId: prop.carlos, barrio: 'Universitario', ambientes: 4, dormitorios: 2, banos: 1, superficieM2: 80, servicios: 'Luz, gas, agua', alquilerSugerido: 240000, partida: '007-456789' },
    { k: 'mitre', direccion: 'Mitre 891, PB', tipo: 'DEPTO', propietarioId: prop.susana, barrio: 'Centro', ambientes: 2, dormitorios: 1, banos: 1, superficieM2: 45, expensas: 30000, alquilerSugerido: 195000, partida: '007-567890' },
    { k: 'soler', direccion: 'Soler 678, 2° A', tipo: 'DEPTO', propietarioId: prop.maria, barrio: 'Noroeste', ambientes: 3, dormitorios: 2, banos: 1, superficieM2: 58, expensas: 38000, alquilerSugerido: 210000, partida: '007-678901' },
    { k: 'sarmiento', direccion: 'Sarmiento 320', tipo: 'CASA', propietarioId: prop.carlos, barrio: 'Palihue', ambientes: 4, dormitorios: 3, banos: 2, superficieM2: 120, servicios: 'Luz, gas', alquilerSugerido: 260000, partida: '007-789012' },
    { k: 'zapiola', direccion: 'Zapiola 150, 1° C', tipo: 'DEPTO', propietarioId: prop.ricardo, barrio: 'Centro', ambientes: 2, dormitorios: 1, banos: 1, superficieM2: 40, expensas: 28000, alquilerSugerido: 170000, partida: '007-890123' },
    { k: 'chiclana', direccion: 'Chiclana 1020', tipo: 'LOCAL', propietarioId: prop.bahia, barrio: 'Villa Mitre', superficieM2: 70, banos: 1, alquilerSugerido: 350000, estado: 'EN_REPARACION', notas: 'Refacción de instalación eléctrica.' },
    { k: 'brown', direccion: 'Brown 1300', tipo: 'CASA', propietarioId: prop.susana, barrio: 'Bº Norte', ambientes: 5, dormitorios: 3, banos: 2, superficieM2: 150, alquilerSugerido: 310000, partida: '007-901234' },
    { k: 'moreno', direccion: 'Moreno 780', tipo: 'DEPTO', propietarioId: prop.roberto, barrio: 'Centro', ambientes: 2, dormitorios: 1, banos: 1, superficieM2: 48, expensas: 32000, alquilerSugerido: 175000, partida: '007-012345' },
    { k: 'donbosco', direccion: 'Don Bosco 234', tipo: 'CASA', propietarioId: prop.silvia, barrio: 'Villa Mitre', ambientes: 5, dormitorios: 3, banos: 2, superficieM2: 135, servicios: 'Luz, gas, agua', alquilerSugerido: 270000, partida: '007-123098' },
    { k: 'cabrera', direccion: 'Av. Cabrera 990', tipo: 'LOCAL', propietarioId: prop.fernando, barrio: 'Centro', superficieM2: 110, banos: 1, servicios: 'Luz, gas', alquilerSugerido: 480000, partida: '007-234109' },
    { k: 'lamadrid', direccion: 'Lamadrid 456, 4° A', tipo: 'DEPTO', propietarioId: prop.roberto, barrio: 'Palihue', ambientes: 3, dormitorios: 2, banos: 1, superficieM2: 65, expensas: 40000, alquilerSugerido: 220000, partida: '007-345210' },
    { k: 'urquiza', direccion: 'Urquiza 610', tipo: 'PH', propietarioId: prop.silvia, barrio: 'Noroeste', ambientes: 3, dormitorios: 2, banos: 1, superficieM2: 72, servicios: 'Luz, gas', alquilerSugerido: 205000, partida: '007-456321' },
    { k: 'estomba', direccion: 'Estomba 88', tipo: 'CASA', propietarioId: prop.fernando, barrio: 'Bº Norte', ambientes: 6, dormitorios: 4, banos: 3, superficieM2: 180, servicios: 'Luz, gas, agua', alquilerSugerido: 340000, partida: '007-567432' },
  ]) {
    const { k, ...datos } = p;
    casa[k] = (await propiedades.crear(datos)).id;
  }

  // ── Contratos ────────────────────────────────────────────────────────────────
  // Paga (en fecha de vencimiento, sin mora) todas las cuotas hasta el período indicado.
  async function pagarHasta(contratoId, periodoMax) {
    const c = await contratos.obtener(contratoId);
    for (const q of c.cuotas) {
      if (q.periodo <= periodoMax && q.estado === 'PENDIENTE') await contratos.registrarPago(q.id, { fecha: q.vencimiento, metodo: 'Transferencia' });
    }
  }

  // Aplica los ajustes históricos que ya correspondían (deja pendiente los `dejar` últimos).
  async function ponerAlDiaIndices(contratoId, dejar = 0) {
    const pcts = [4.8, 5.6, 6.1, 5.2, 4.4, 5.9, 6.3, 4.1];
    let i = 0;
    for (;;) {
      const c = await contratos.obtener(contratoId);
      if (!c.proxima_actualizacion || sumarMeses(c.proxima_actualizacion, c.periodicidad_meses * dejar) > hoy) break;
      await contratos.aplicarAjuste(contratoId, { porcentaje: pcts[i++ % pcts.length] });
    }
  }

  const inicio = mesesAtras => sumarMeses(hoy.slice(0, 7) + '-01', -mesesAtras);
  const mesAnterior = sumarMeses(hoy.slice(0, 7) + '-01', -1).slice(0, 7);
  const mesActual = hoy.slice(0, 7);

  async function contrato(datos, { pagadoHasta, dejarAjuste = 0 }) {
    const c = await contratos.crear(datos);
    await ponerAlDiaIndices(c.id, dejarAjuste);
    await pagarHasta(c.id, pagadoHasta);
    return c.id;
  }

  // Laura: cuota del mes en mora (venció el día 15 → 3 días si hoy es 18)
  await contrato({ propiedadId: casa.alsina, inquilinoId: inq.laura, fechaInicio: inicio(6), fechaFin: sumarMeses(inicio(6), 24), montoInicial: 165000, indice: 'ICL', diaVencimiento: 10 }, { pagadoHasta: sumarMeses(inicio(6), 4).slice(0, 7) });
  // Diego: local con IPC, una cuota vencida
  await contrato({ propiedadId: casa.colon, inquilinoId: inq.diego, fechaInicio: inicio(11), fechaFin: sumarMeses(inicio(11), 36), montoInicial: 350000, indice: 'IPC', diaVencimiento: 5 }, { pagadoHasta: mesAnterior });
  // Carolina: al día pero con ajuste ICL pendiente de aplicar
  await contrato({ propiedadId: casa.mitre, inquilinoId: inq.carolina, fechaInicio: inicio(3), fechaFin: sumarMeses(inicio(3), 24), montoInicial: 195000, indice: 'ICL', diaVencimiento: 10 }, { pagadoHasta: mesActual, dejarAjuste: 1 });
  // Pablo: recién empezado, al día
  await contrato({ propiedadId: casa.ohiggins, inquilinoId: inq.pablo, fechaInicio: inicio(1), fechaFin: sumarMeses(inicio(1), 24), montoInicial: 240000, indice: 'ICL', diaVencimiento: 10 }, { pagadoHasta: mesActual });
  // Martín: al día
  await contrato({ propiedadId: casa.soler, inquilinoId: inq.martin, fechaInicio: inicio(2), fechaFin: sumarMeses(inicio(2), 24), montoInicial: 210000, indice: 'IPC', diaVencimiento: 10 }, { pagadoHasta: mesActual });
  // Ana: contrato por vencer (termina en ~2 meses)
  await contrato({ propiedadId: casa.sarmiento, inquilinoId: inq.ana, fechaInicio: sumarMeses(hoy, -23), fechaFin: sumarMeses(hoy, 1), montoInicial: 180000, indice: 'IPC', diaVencimiento: 10 }, { pagadoHasta: mesActual });
  // Valeria: departamento recién alquilado, al día
  await contrato({ propiedadId: casa.moreno, inquilinoId: inq.valeria, fechaInicio: inicio(1), fechaFin: sumarMeses(inicio(1), 24), montoInicial: 175000, indice: 'ICL', diaVencimiento: 10 }, { pagadoHasta: mesActual });
  // Nicolás: casa con varias cuotas vencidas (mora alta)
  await contrato({ propiedadId: casa.donbosco, inquilinoId: inq.nicolas, fechaInicio: inicio(14), fechaFin: sumarMeses(inicio(14), 36), montoInicial: 230000, indice: 'IPC', diaVencimiento: 5 }, { pagadoHasta: sumarMeses(hoy.slice(0, 7) + '-01', -3).slice(0, 7) });
  // Lucía: local con IPC al día pero ajuste pendiente de aplicar
  await contrato({ propiedadId: casa.cabrera, inquilinoId: inq.lucia, fechaInicio: inicio(7), fechaFin: sumarMeses(inicio(7), 36), montoInicial: 420000, indice: 'ICL', diaVencimiento: 10 }, { pagadoHasta: mesActual, dejarAjuste: 1 });
  // Franco: contrato por vencer (termina en ~1 mes)
  await contrato({ propiedadId: casa.lamadrid, inquilinoId: inq.franco, fechaInicio: sumarMeses(hoy, -23), fechaFin: sumarMeses(hoy, 1), montoInicial: 195000, indice: 'ICL', diaVencimiento: 10 }, { pagadoHasta: mesActual });

  const r = await contratos.resumen();
  const totalPersonas = (await db.prepare('SELECT COUNT(*) AS n FROM personas').get()).n;
  const resumenProp = await propiedades.resumen();
  console.log('Datos de prueba cargados:');
  console.log(`  ${totalPersonas} personas · ${resumenProp.total} propiedades · ${r.contratosActivos} contratos activos`);
  console.log(`  ${r.cuotasVencidas} cuotas vencidas · ${r.ajustesPendientes} ajustes pendientes · ${r.porVencer} contrato(s) por vencer`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
