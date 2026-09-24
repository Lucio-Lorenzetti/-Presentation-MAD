# Estructura del proyecto — Sistema MAD

Un solo repositorio, dos aplicaciones independientes (`backend/` y `frontend/`).
Cada módulo de negocio existe en **los dos lados con el mismo nombre**.

```
.
├── Presentación/          # Propuesta comercial (HTML) + relevamiento. No se toca.
├── docs/                  # Este documento y futuras decisiones de diseño
├── backend/               # API REST (Node 22+, Express, Postgres/Supabase)
│   ├── src/
│   │   ├── server.js      # Arranque + montaje de rutas
│   │   ├── config.js      # Variables de entorno
│   │   ├── db.js          # Pool de Postgres + shim de compatibilidad (prepare/transaccion)
│   │   ├── schema.js      # Tablas (todas, incluida facturas)
│   │   ├── routes/        # HTTP: parsear request, llamar al service, responder
│   │   ├── services/      # Lógica de negocio (una por módulo, todas async)
│   │   └── utils/         # fechas/mora, validación, códigos AFIP
│   ├── scripts/           # Utilidades (seed, geocodificar, verificar ARCA, factura de prueba)
│   └── certs/ storage/    # Cert ARCA, PDFs generados (no se versionan)
└── frontend/              # React 19 + Vite + Tailwind 4
    └── src/
        ├── modules/<modulo>/   # Página + formularios de cada módulo
        ├── components/         # UI compartida (Modal, Campo, Boton, Estado…)
        ├── api/                # client.js + un objeto por recurso
        ├── hooks.js format.js  # useCarga, formateo de dinero/fechas
        └── App.jsx             # Rutas
```

## Convenciones por módulo

| Capa | Backend | Frontend |
|---|---|---|
| Ruta / página | `routes/<modulo>.js` | `modules/<modulo>/<Modulo>Page.jsx` |
| Lógica | `services/<modulo>Service.js` | formularios en la misma carpeta |
| Acceso a API | — | `api/recursos.js` |

Reglas: las rutas no tienen lógica; los services no conocen HTTP (lanzan
`ErrorValidacion`); borrado siempre **lógico** (`deleted_at`); el frontend
nunca calcula reglas de negocio (mora, ajustes) — las devuelve el backend.

## Estado de módulos

| Módulo | Backend | Frontend | Notas |
|---|---|---|---|
| Inicio (calendario de vencimientos) | ✅ | ✅ | Cobros, ajustes IPC/ICL y fin de contrato — hoy/semana/mes, aviso por WhatsApp |
| Facturación ARCA | ✅ | ✅ | Falta certificado del cliente |
| Recibos de pago (no fiscales) + envío por WhatsApp | ✅ | ✅ | PDF por pago (`storage/recibos/`); WhatsApp = wa.me precargado + descarga manual del PDF (sin API de Meta) |
| Personas (propietarios/inquilinos/garantes) | ✅ | ✅ | |
| Propiedades | ✅ | ✅ | |
| Contratos + cuotas + pagos | ✅ | ✅ | Mora 0,5 % diario; ajuste IPC/ICL resuelto automático vía API del BCRA (con respaldo manual si la API falla) |
| Ficha de contrato en PDF | ✅ | ✅ | Resumen de gestión (no es el contrato legal con cláusulas) — se genera al vuelo, no se guarda |
| Mapa de propiedades | ✅ | ✅ | Leaflet + OpenStreetMap, geocodificación automática (Nominatim) al alta/edición de cada propiedad |
| Estadísticas (dashboard) | ✅ | ✅ | Cobrado vs facturado por mes, propiedades por estado, top deudores |
| Exportación a Excel (.xlsx) | — | ✅ | Personas, Propiedades, Alquileres, Facturación, Estadísticas |
| Login + roles + usuarios | ✅ | ✅ | Ver matriz de permisos abajo |

## Roles y permisos

Se aplican en el backend (`backend/src/middleware/auth.js`); el frontend sólo oculta lo que daría 403.

| Acción | Desarrollador | Administrador | Gestor | Consulta |
|---|:-:|:-:|:-:|:-:|
| Ver alquileres, propiedades, personas | ✅ | ✅ | ✅ | ✅ |
| Crear / editar (contratos, pagos, personas, propiedades) | ✅ | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ |
| Facturación ARCA | ✅ | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ✅ (no Desarrollador) | ❌ | ❌ |

Sesión: token firmado de 8 h, contraseñas con scrypt, bloqueo tras 5 intentos fallidos. Los roles Propietario/Inquilino (portales) llegan en la Fase 2.

## Hoja de ruta (según prioridades de la presentación)

**Fase 1 — MVP (prioridad alta)**
1. ✅ Personas, Propiedades, Contratos, Pagos con mora
2. ✅ Auth + roles (Desarrollador, Administrador, Gestor, Consulta)
3. ✅ Recibos de pago en PDF (reusa `pdfService`) vinculados al pago de cada cuota, con envío por WhatsApp (chat precargado + descarga del PDF)
4. ✅ Índices IPC/ICL automáticos — API pública del BCRA (`api.bcra.gob.ar`), sin API key
5. Notificaciones por email (vencimientos 15 días antes, mora, ajustes) + job programado

**Fase 2 (media)**: plantillas de contrato, portales propietario/inquilino (roles 5 y 6), reportes financieros, liquidaciones a propietarios.

**Fase 3 (baja)**: ✅ mapa de propiedades (adelantado) · Veraz, compra/venta pendientes.

## Ramas
`master` = estable; el trabajo va en ramas por módulo (`feat/auth`, `feat/recibos`…) y se mergea a `master`. Hoy todo el código está en `arca-test`: hay que mergearla a `master`.
