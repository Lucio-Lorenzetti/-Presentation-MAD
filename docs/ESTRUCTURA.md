# Estructura del proyecto — Sistema MAD

Un solo repositorio, dos aplicaciones independientes (`backend/` y `frontend/`).
Cada módulo de negocio existe en **los dos lados con el mismo nombre**.

```
.
├── Presentación/          # Propuesta comercial (HTML) + relevamiento. No se toca.
├── docs/                  # Este documento y futuras decisiones de diseño
├── backend/               # API REST (Node 22+, Express, SQLite nativo)
│   ├── src/
│   │   ├── server.js      # Arranque + montaje de rutas
│   │   ├── config.js      # Variables de entorno
│   │   ├── db.js          # Conexión SQLite (+ tabla facturas)
│   │   ├── schema.js      # Tablas de gestión
│   │   ├── routes/        # HTTP: parsear request, llamar al service, responder
│   │   ├── services/      # Lógica de negocio (una por módulo)
│   │   └── utils/         # fechas/mora, validación, códigos AFIP
│   ├── scripts/           # Utilidades (verificar ARCA, factura de prueba)
│   └── certs/ storage/ data/   # Cert ARCA, PDFs, base .db (no se versionan)
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
| Facturación ARCA | ✅ | ✅ | Falta certificado del cliente |
| Personas (propietarios/inquilinos/garantes) | ✅ | ✅ | |
| Propiedades | ✅ | ✅ | |
| Contratos + cuotas + pagos | ✅ | ✅ | Mora 0,5 % diario, ajuste manual IPC/ICL |

## Hoja de ruta (según prioridades de la presentación)

**Fase 1 — MVP (prioridad alta)**
1. ✅ Personas, Propiedades, Contratos, Pagos con mora
2. Auth + roles (Desarrollador, Administrador, Gestor, Consulta) — bloquea el resto
3. Recibos de alquiler/honorarios en PDF (reusar `pdfService`) + vincular facturación a contrato/pago
4. Índices IPC/ICL automáticos (traer valores oficiales y proponer el ajuste)
5. Notificaciones por email (vencimientos 15 días antes, mora, ajustes) + job programado

**Fase 2 (media)**: plantillas de contrato, portales propietario/inquilino (roles 5 y 6), reportes financieros, liquidaciones a propietarios.

**Fase 3 (baja)**: mapa de propiedades, Veraz, compra/venta.

## Ramas
`master` = estable; el trabajo va en ramas por módulo (`feat/auth`, `feat/recibos`…) y se mergea a `master`. Hoy todo el código está en `arca-test`: hay que mergearla a `master`.
