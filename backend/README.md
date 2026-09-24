# Facturación ARCA — Sistema MAD

Módulo de **facturación electrónica** que conecta directo con los Web Services
de ARCA (ex AFIP) — sin depender de ningún proxy ni servicio de terceros.
Implementa:

- **WSAA** (`src/services/wsaa.js`): autenticación — arma y firma el ticket
  de acceso (CMS/PKCS#7) con tu certificado, y lo cambia por un Token+Sign.
- **WSFEv1** (`src/services/wsfe.js`): facturación electrónica — pide el
  último comprobante autorizado y solicita el CAE.
- **Lógica de negocio** (`src/services/facturacionService.js`): decide
  Factura A/B/C según la condición de IVA del emisor y el receptor, calcula
  el IVA, guarda todo en Postgres y genera el PDF con el QR obligatorio de ARCA.
- **API REST** (`src/routes/facturas.js`) para conectar esto con el resto
  del sistema (o probarlo con Postman/curl) sin escribir una sola línea de
  SOAP a mano.

Esto ya fue **probado en vivo contra los servidores reales de homologación
de ARCA** (no es código de ejemplo sin validar): el armado del ticket, la
firma CMS y el llamado SOAP funcionan correctamente — lo único que falta
para emitir comprobantes de verdad es **tu certificado**, que todavía no
generaste (paso a paso más abajo).

## Por qué así (y no con una librería/proxy de terceros)

Existen SDKs (ej. AfipSDK) que simplifican esto, pero desde su versión 1.x
funcionan como un **proxy**: tus datos pasan por sus servidores y necesitás
una cuenta con ellos. Para un sistema que vas a vender a un cliente, no
depender de un tercero (ni de sus costos, límites o disponibilidad) vale la
pena — por eso este módulo habla directo con `*.afip.gov.ar`.

## Instalación

```bash
cd backend
npm install
cp .env.example .env
```

Necesita una base **Postgres** (se usa [Supabase](https://supabase.com) como
proveedor gestionado — plan gratuito). Pasos:

1. Creá un proyecto en Supabase (gratis, sin tarjeta).
2. Project → **Connect** → copiá el connection string en modo **Session
   pooler** (el backend corre como proceso persistente, no serverless — no
   hace falta el modo "Transaction pooler").
3. Pegalo en `backend/.env` como `DATABASE_URL=...`.

Las tablas se crean solas la primera vez que arranca el servidor o corrés
`npm run seed` — no hay que correr ninguna migración a mano.

## Cómo obtener el certificado de ARCA (paso a paso)

Esto lo tenés que hacer vos (o quien tenga la Clave Fiscal del CUIT de la
inmobiliaria) porque requiere acceso a la cuenta de ARCA del contribuyente.
Se hace **una vez para homologación** (testing) y **otra vez para producción**
cuando estén listos para facturar de verdad.

### 1. Generar la clave privada y el CSR

```bash
cd backend/certs
openssl genrsa -out private.key 2048
openssl req -new -key private.key -subj "/CN=mad-facturacion, /O=Inmobiliaria, /C=AR" -out mad.csr
```

Esto te deja `private.key` (nunca se comparte, nunca se sube a git) y
`mad.csr` (el pedido de certificado que subís a ARCA).

### 2. Autorizar el Web Service en ARCA

1. Entrá a [https://auth.afip.gob.ar](https://auth.afip.gob.ar) con la
   **Clave Fiscal (nivel 3)** del CUIT de la inmobiliaria.
2. Buscá el servicio **"Administrador de Relaciones de Clave Fiscal"**.
3. Para **homologación** (testing, recomendado primero): entrá a
   [https://www.afip.gob.ar/ws/](https://www.afip.gob.ar/ws/) →
   **"Ingresar al ambiente de Testing"** y seguí el alta de un certificado
   de prueba subiendo el archivo `mad.csr`. ARCA te da ahí mismo un CUIT y
   certificado de prueba, o te deja asociar tu propio CUIT al ambiente de
   homologación.
4. Dentro del Administrador de Relaciones, creá una relación nueva:
   - **Representado**: el CUIT de la inmobiliaria.
   - **Servicio**: *"WSFE - Facturación Electrónica"*.
   - **Computador**: el certificado que subiste en el paso anterior.
5. Descargá el certificado firmado (`.crt`) que te devuelve ARCA y guardalo
   como `backend/certs/cert.pem`.

### 3. Configurar y probar

En `backend/.env`:

```
ARCA_CUIT=<el CUIT de la inmobiliaria, sin guiones>
ARCA_PTO_VENTA=<el punto de venta que hayas habilitado en ARCA para Web Services>
ARCA_CERT_PATH=./certs/cert.pem
ARCA_KEY_PATH=./certs/private.key
```

Después corré:

```bash
npm run verificar-conexion
```

Si todo está bien vas a ver `✅ Todo listo: se puede facturar contra ARCA.`
Si falla, el mensaje de error te dice exactamente qué está mal (cert no
encontrado, cert no confiable, servicio no autorizado, etc. — son los
mismos mensajes que devuelve ARCA).

Con eso confirmado, probá emitir una factura de prueba real (CAE de
homologación, sin validez fiscal):

```bash
npm run emitir-factura-prueba
```

### 4. Pasar a producción

Repetís el mismo proceso pero generando un certificado nuevo desde el
ambiente de producción de ARCA (no el de testing), y en `.env`:

```
ARCA_PRODUCTION=true
ARCA_CERT_PATH=./certs/cert-prod.pem
ARCA_KEY_PATH=./certs/private-prod.key
```

**Importante**: en producción cada factura que se aprueba es fiscalmente
real e irreversible (una vez emitida, sólo se puede corregir con una Nota
de Crédito/Débito, nunca "borrarla"). Probá todo en homologación primero.

## Levantar el servidor

```bash
npm run dev      # con auto-reload
npm start        # sin auto-reload
```

Por defecto queda en `http://localhost:3001`.

## API

| Método | Ruta                          | Qué hace |
|--------|-------------------------------|----------|
| GET    | `/api/health`                 | Estado del servidor (no llama a ARCA) |
| GET    | `/api/facturas/estado-arca`   | Chequea conexión con ARCA y si el certificado autentica |
| POST   | `/api/facturas`                | Emite una factura de honorarios y pide el CAE |
| GET    | `/api/facturas`                | Lista las facturas emitidas (paginado con `?limit=&offset=`) |
| GET    | `/api/facturas/:id`             | Detalle de una factura |
| GET    | `/api/facturas/:id/pdf`         | Descarga el PDF (con QR de ARCA) |

### Ejemplo — emitir una factura de honorarios

```bash
curl -X POST http://localhost:3001/api/facturas \
  -H "Content-Type: application/json" \
  -d '{
    "receptor": {
      "docTipo": "CUIT",
      "docNro": 20111111112,
      "razonSocial": "Juan Propietario",
      "condicionIva": "CONSUMIDOR_FINAL"
    },
    "importeNeto": 85000,
    "descripcion": "Honorarios por intermediación en alquiler - Alsina 234",
    "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" }
  }'
```

Valores válidos:
- `docTipo`: `CUIT` | `CUIL` | `DNI` | `CONSUMIDOR_FINAL`
- `condicionIva` (del receptor): `RESPONSABLE_INSCRIPTO` | `MONOTRIBUTO` |
  `CONSUMIDOR_FINAL` | `EXENTO` | `NO_CATEGORIZADO`
- `importeNeto`: si la inmobiliaria es Responsable Inscripto, es el importe
  **sin IVA** (el sistema calcula y suma el 21% automáticamente → Factura A
  o B según el receptor). Si la inmobiliaria es Monotributista, es el
  importe **total** (Factura C, sin IVA discriminado — configurable en
  `EMISOR_CONDICION_IVA` del `.env`).

La respuesta incluye `resultado` (`"A"` aprobada / `"R"` rechazada), `cae`,
`cae_vencimiento` y `pdf_path`. Si ARCA rechaza el comprobante, el campo
`observaciones` trae el motivo exacto que dio ARCA.

## Qué falta para integrarlo al sistema completo

Este módulo está pensado para conectarse, más adelante, con los módulos de
Contratos y Propietarios/Inquilinos de la presentación (ver
`Presentación/presentacion.html`): en vez de recibir el receptor "a mano"
por API, se completaría automáticamente desde el contrato de alquiler.
También conviene:

- Agregar un cron/scheduler que dispare la emisión mensual de honorarios
  automáticamente (ítem de "Prioridad Alta" del relevamiento).

## Seguridad

- `certs/*.pem`, `certs/*.key` y `.env` (que incluye `DATABASE_URL`, la
  contraseña de la base) están en `.gitignore` — **nunca** los subas a un
  repositorio, ni siquiera privado. Son las credenciales fiscales y de base
  de datos del cliente.
- El certificado de producción y el de homologación son archivos distintos
  y no se deben mezclar.
