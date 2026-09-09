# Sistema MAD — Gestión Inmobiliaria

Repo del sistema de gestión para la inmobiliaria: presentación de la
propuesta, backend de facturación electrónica y frontend de la app.

Esta rama (`arca-test`) incorpora por primera vez el código de `frontend/`
y `backend/` al repositorio (antes sólo estaba versionada la carpeta
`Presentación/`). Este README es la puerta de entrada; cada carpeta tiene
su propio README con el detalle técnico.

## Estructura del repo

```
.
├── Presentación/   # Propuesta original (HTML) + documentos de relevamiento
├── backend/        # API de facturación electrónica (ARCA / ex-AFIP)
└── frontend/       # App en React que consume el backend
```

### `Presentación/`

El HTML de la propuesta comercial (`presentacion.html`) que se mandó al
cliente, más los documentos de relevamiento y brainstorming iniciales
(`drive-download-.../`). Es el punto de partida: define los 5 roles y los
módulos (Alquileres, Propiedades, Personas, Facturación) que el resto del
sistema va implementando.

### `backend/` — Facturación electrónica (ARCA / ex-AFIP)

Módulo de **facturación electrónica real**, hablando directo con los Web
Services de ARCA (WSAA + WSFEv1) sin depender de proxies de terceros (tipo
AfipSDK). Ya está **probado contra el ambiente de homologación real de
ARCA** — arma y firma el ticket de acceso, pide el CAE, calcula IVA según
condición del emisor/receptor (Factura A/B/C), guarda todo en SQLite y
genera el PDF con el QR obligatorio.

Lo único que falta para emitir comprobantes reales es el certificado del
cliente (paso a paso completo en `backend/README.md`, incluye cómo generar
el CSR y darlo de alta en ARCA).

Node.js **22.5+** requerido (usa `node:sqlite` nativo, sin dependencias que
compilar). Detalle técnico completo, API REST, ejemplos de `curl` y qué
falta para integrarlo al resto del sistema: **[`backend/README.md`](backend/README.md)**.

### `frontend/` — App en React

React + Vite + Tailwind v4, con la misma identidad visual de
`Presentación/presentacion.html`. Estado actual de cada módulo:

| Módulo | Estado |
|---|---|
| **Facturación** | Real — conectado al `backend/` |
| Alquileres | Vista previa con datos de ejemplo |
| Propiedades | Vista previa con datos de ejemplo |
| Propietarios/Inquilinos | Vista previa con datos de ejemplo |

Los módulos en vista previa muestran un aviso ámbar aclarando que todavía
no tienen datos reales ni backend propio. Detalle técnico completo:
**[`frontend/README.md`](frontend/README.md)**.

## Cómo levantar todo en local

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env      # completar según backend/README.md
npm run dev                # http://localhost:3001

# 2) Frontend (en otra terminal)
cd frontend
npm install
npm run dev                # Vite redirige /api al backend automáticamente
```

Para que la Facturación emita comprobantes reales hace falta el
certificado de ARCA — sin eso, el resto de la app funciona igual (los
demás módulos son vista previa) y el backend responde qué falta si le
pegás a `/api/facturas/estado-arca`. Ver `backend/README.md` para el paso
a paso de cómo generarlo.

## Qué es "arca-test"

Esta rama existe para revisar en conjunto el módulo de facturación (ARCA)
y el frontend que lo consume antes de mergear a `master`. Los `.gitignore`
de `frontend/` y `backend/` ya excluyen `node_modules`, `.env`, los
certificados (`certs/*.key`, `*.csr`, `*.pem`) y la base SQLite — nada de
eso viaja en los commits.

## Roles y módulos (contexto de la propuesta)

Definidos en `Presentación/presentacion.html`: 5 roles de usuario y 4
módulos funcionales (Alquileres, Propiedades, Propietarios/Inquilinos,
Facturación). El backend y frontend de esta rama implementan el primer
módulo real (Facturación); el resto sigue como vista previa hasta que se
desarrollen sus propios backends.
