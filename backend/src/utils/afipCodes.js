/**
 * Códigos fijos de las tablas de referencia de ARCA (WSFEv1).
 * Fuente: WSDL público de ARCA + "Tablas de referencia" de Factura Electrónica.
 * Si en el futuro ARCA agrega valores, se pueden consultar dinámicamente con
 * los métodos FEParamGetTiposCbte / FEParamGetTiposDoc / FEParamGetCondicionIvaReceptor.
 */

const CBTE_TIPO = {
  FACTURA_A: 1,
  NOTA_DEBITO_A: 2,
  NOTA_CREDITO_A: 3,
  FACTURA_B: 6,
  NOTA_DEBITO_B: 7,
  NOTA_CREDITO_B: 8,
  FACTURA_C: 11,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_C: 13,
};

const CONCEPTO = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
};

const DOC_TIPO = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CONSUMIDOR_FINAL: 99, // sin identificar (DocNro debe ir en 0)
};

// Condición frente al IVA del receptor (obligatorio en FECAESolicitar desde RG 5616/2024)
const CONDICION_IVA_RECEPTOR = {
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTO: 6,
  NO_CATEGORIZADO: 7,
  PROVEEDOR_DEL_EXTERIOR: 8,
  CLIENTE_DEL_EXTERIOR: 9,
  MONOTRIBUTO_SOCIAL: 13,
  MONOTRIBUTO_TRABAJADOR_INDEPENDIENTE_PROMOVIDO: 16,
};

const ALICUOTA_IVA = {
  IVA_0: { id: 3, porcentaje: 0 },
  IVA_10_5: { id: 4, porcentaje: 10.5 },
  IVA_21: { id: 5, porcentaje: 21 },
  IVA_27: { id: 6, porcentaje: 27 },
};

/**
 * Decide qué tipo de comprobante corresponde según la condición de IVA
 * del emisor (la inmobiliaria) y del receptor (propietario/inquilino).
 */
function resolverTipoComprobante(condicionIvaEmisor, condicionIvaReceptor) {
  if (condicionIvaEmisor === 'MONOTRIBUTO') {
    return CBTE_TIPO.FACTURA_C;
  }
  // Emisor Responsable Inscripto
  if (condicionIvaReceptor === 'RESPONSABLE_INSCRIPTO') {
    return CBTE_TIPO.FACTURA_A;
  }
  return CBTE_TIPO.FACTURA_B;
}

module.exports = {
  CBTE_TIPO,
  CONCEPTO,
  DOC_TIPO,
  CONDICION_IVA_RECEPTOR,
  ALICUOTA_IVA,
  resolverTipoComprobante,
};
