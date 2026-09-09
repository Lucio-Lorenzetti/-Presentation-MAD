# Frontend — Sistema MAD

React + Vite + Tailwind v4, con la misma identidad visual de
`Presentación/presentacion.html`.

## Estado de los módulos

| Módulo | Estado |
|---|---|
| **Facturación** | Real — conectado al `backend/` (ARCA/WSFEv1) |
| Alquileres | Vista previa con datos de ejemplo (igual a la presentación) |
| Propiedades | Vista previa con datos de ejemplo |
| Propietarios/Inquilinos | Vista previa con datos de ejemplo |

Los módulos en "vista previa" muestran un aviso ámbar aclarándolo — no hay
datos reales ni backend detrás todavía.

## Desarrollo

```bash
npm install
npm run dev
```

Necesita el backend corriendo en paralelo (`cd ../backend && npm run dev`,
por defecto en `http://localhost:3001`) — Vite lo redirige automáticamente
vía `/api` (ver `vite.config.js`), no hace falta configurar nada más.

## Producción

```bash
npm run build
```

Genera `dist/` como sitio estático (deployable en Vercel, igual que la
presentación). Si el backend queda en un dominio distinto, configurar
`VITE_API_URL` en `.env` (ver `.env.example`) antes de buildear.
