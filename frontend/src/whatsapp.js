// Envío de comprobantes por WhatsApp — versión "demo": sin credenciales de
// WhatsApp Business API (Meta) no se puede adjuntar el PDF automáticamente,
// así que se prearma el chat (número + mensaje) y aparte se dispara la
// descarga del PDF para adjuntarlo a mano.
const NUMERO_DEMO = '2916457523';

// wa.me espera el número en formato internacional sin espacios ni símbolos.
// Argentina, celular: 54 9 + código de área + número.
export const WHATSAPP_NUMERO = `549${NUMERO_DEMO}`;

export function armarLinkWhatsApp(mensaje) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeRecibo({ inquilinoNombre, propiedadDireccion, periodo, total }) {
  return [
    `Hola! Te comparto el comprobante de pago de alquiler.`,
    `Inquilino: ${inquilinoNombre}`,
    `Propiedad: ${propiedadDireccion}`,
    `Período: ${periodo}`,
    `Total pagado: $ ${total.toFixed(2)}`,
    ``,
    `Adjunto el recibo en PDF.`,
  ].join('\n');
}

const dinero = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

// Mensaje de recordatorio para un ítem de la agenda (cobro, ajuste o fin de contrato).
export function mensajeAgenda(item) {
  if (item.tipo === 'COBRO') {
    return [
      `Hola ${item.persona}! Te recordamos el pago del alquiler.`,
      `Propiedad: ${item.propiedad}`,
      `${item.titulo} — vence ${item.fecha.split('-').reverse().join('/')}`,
      `Monto: ${dinero(item.monto)}`,
    ].join('\n');
  }
  if (item.tipo === 'AJUSTE') {
    return [
      `Hola ${item.persona}! Te avisamos que corresponde aplicar el ajuste de alquiler.`,
      `Propiedad: ${item.propiedad}`,
      `Índice: ${item.titulo.replace('Aplicar ajuste ', '')} — vigente desde ${item.fecha.split('-').reverse().join('/')}`,
      `Alquiler actual: ${dinero(item.monto)}`,
    ].join('\n');
  }
  return [
    `Hola! Te recordamos que el contrato de "${item.propiedad}" vence el ${item.fecha.split('-').reverse().join('/')}.`,
    `Inquilino: ${item.persona}${item.propietario ? ` · Propietario: ${item.propietario}` : ''}`,
    `Coordinemos la renovación o la entrega del inmueble.`,
  ].join('\n');
}
