const { usuarioDesdeToken } = require('../services/authService');

const TODOS = ['DESARROLLADOR', 'ADMINISTRADOR', 'GESTOR', 'CONSULTA'];
const ADMIN = ['DESARROLLADOR', 'ADMINISTRADOR'];
const ESCRITURA = ['DESARROLLADOR', 'ADMINISTRADOR', 'GESTOR'];

// Matriz de permisos (según los roles de la presentación):
//  - CONSULTA: sólo lectura de alquileres, propiedades y personas.
//  - GESTOR: carga y edita contratos, personas, propiedades y pagos. Sin facturación ni eliminaciones.
//  - ADMINISTRADOR: todo, incluida la facturación ARCA, eliminaciones y usuarios.
//  - DESARROLLADOR: acceso total.
function rolesPermitidos(req) {
  const ruta = req.baseUrl; // ej. /api/facturas
  if (ruta === '/api/facturas' || ruta === '/api/usuarios') return ADMIN;
  if (req.method === 'GET' || req.method === 'HEAD') return TODOS;
  if (req.method === 'DELETE') return ADMIN;
  return ESCRITURA;
}

async function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const usuario = token && await usuarioDesdeToken(token);
  if (!usuario) return res.status(401).json({ error: 'Sesión no válida o vencida. Iniciá sesión de nuevo.' });
  req.usuario = usuario;
  next();
}

function autorizar(req, res, next) {
  if (!rolesPermitidos(req).includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Tu rol no tiene permiso para esta acción.' });
  }
  next();
}

module.exports = { autenticar, autorizar };
