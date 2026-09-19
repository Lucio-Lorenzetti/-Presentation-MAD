const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { ErrorValidacion, requerir, enumerado } = require('../utils/validar');

const ROLES = ['DESARROLLADOR', 'ADMINISTRADOR', 'GESTOR', 'CONSULTA'];
const TOKEN_HORAS = 8;

// ── Secreto del token ────────────────────────────────────────────────────────
// En producción definir JWT_SECRET. En desarrollo se genera una vez y se guarda
// en data/.jwt-secret para que las sesiones sobrevivan a los reinicios.
function obtenerSecreto() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const archivo = path.resolve(process.cwd(), 'data', '.jwt-secret');
  if (fs.existsSync(archivo)) return fs.readFileSync(archivo, 'utf8').trim();
  const nuevo = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, nuevo, { mode: 0o600 });
  return nuevo;
}
const SECRETO = obtenerSecreto();

// ── Contraseñas (scrypt con sal) ─────────────────────────────────────────────
function hashPassword(password) {
  const sal = crypto.randomBytes(16).toString('hex');
  return `${sal}:${crypto.scryptSync(password, sal, 64).toString('hex')}`;
}

function verificarPassword(password, almacenado) {
  const [sal, hash] = almacenado.split(':');
  const calculado = crypto.scryptSync(password, sal, 64);
  const esperado = Buffer.from(hash, 'hex');
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

function validarPassword(p) {
  if (typeof p !== 'string' || p.length < 8) throw new ErrorValidacion('La contraseña debe tener al menos 8 caracteres.');
}

const publico = u => u && { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo === 1 };

// ── Límite de intentos de login (en memoria) ─────────────────────────────────
const intentos = new Map(); // clave → { n, hasta }
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

function chequearBloqueo(clave) {
  const r = intentos.get(clave);
  if (r && r.n >= MAX_INTENTOS && r.hasta > Date.now()) {
    throw new ErrorValidacion('Demasiados intentos fallidos. Probá de nuevo en unos minutos.', 429);
  }
}
function registrarFallo(clave) {
  const r = intentos.get(clave);
  const vigente = r && r.hasta > Date.now();
  intentos.set(clave, { n: (vigente ? r.n : 0) + 1, hasta: Date.now() + BLOQUEO_MS });
}

// ── Login / sesión ───────────────────────────────────────────────────────────
function login(email, password, ip = '') {
  requerir({ email, password }, ['email', 'password']);
  const clave = `${String(email).toLowerCase()}|${ip}`;
  chequearBloqueo(clave);

  const u = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email).trim());
  // Se verifica igual aunque no exista, para no revelar qué emails están registrados por tiempo de respuesta.
  const ok = u ? verificarPassword(password, u.password_hash) : (verificarPassword(password, hashPassword('x')), false);
  if (!ok || !u.activo) {
    registrarFallo(clave);
    throw new ErrorValidacion('Email o contraseña incorrectos.', 401);
  }
  intentos.delete(clave);
  const token = jwt.sign({ sub: u.id }, SECRETO, { expiresIn: `${TOKEN_HORAS}h` });
  return { token, usuario: publico(u) };
}

// Devuelve el usuario vigente (activo, con su rol actual) o null.
function usuarioDesdeToken(token) {
  try {
    const { sub } = jwt.verify(token, SECRETO);
    const u = db.prepare('SELECT * FROM usuarios WHERE id = ? AND activo = 1').get(sub);
    return u ? publico(u) : null;
  } catch {
    return null;
  }
}

// ── ABM de usuarios ──────────────────────────────────────────────────────────
function listarUsuarios() {
  return db.prepare('SELECT * FROM usuarios ORDER BY nombre COLLATE NOCASE').all().map(publico);
}

function crearUsuario(d) {
  requerir(d, ['nombre', 'email', 'password', 'rol']);
  enumerado(d.rol, ROLES, 'rol');
  validarPassword(d.password);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new ErrorValidacion('El email no es válido.');
  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(d.email.trim())) {
    throw new ErrorValidacion('Ya existe un usuario con ese email.', 409);
  }
  const info = db.prepare('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)')
    .run(d.nombre.trim(), d.email.trim(), hashPassword(d.password), d.rol);
  return publico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid));
}

// `actor` = usuario que hace el cambio. Un Administrador no puede tocar a un Desarrollador ni crear otro.
function actualizarUsuario(id, d, actor) {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!u) return null;
  if (actor.rol !== 'DESARROLLADOR' && (u.rol === 'DESARROLLADOR' || d.rol === 'DESARROLLADOR')) {
    throw new ErrorValidacion('Sólo un Desarrollador puede gestionar usuarios con ese rol.', 403);
  }
  const rol = d.rol !== undefined ? enumerado(d.rol, ROLES, 'rol') : u.rol;
  const activo = d.activo !== undefined ? (d.activo ? 1 : 0) : u.activo;
  if (Number(id) === actor.id && (rol !== u.rol || !activo)) {
    throw new ErrorValidacion('No podés cambiarte el rol ni desactivarte a vos mismo.', 409);
  }
  // Siempre debe quedar al menos un usuario activo con acceso total.
  if ((u.rol === 'ADMINISTRADOR' || u.rol === 'DESARROLLADOR') && u.activo && (!activo || !['ADMINISTRADOR', 'DESARROLLADOR'].includes(rol))) {
    const otros = db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE id != ? AND activo = 1 AND rol IN ('ADMINISTRADOR','DESARROLLADOR')").get(id).n;
    if (otros === 0) throw new ErrorValidacion('Tiene que quedar al menos un administrador activo.', 409);
  }
  let hash = u.password_hash;
  if (d.password) { validarPassword(d.password); hash = hashPassword(d.password); }
  db.prepare('UPDATE usuarios SET nombre = ?, rol = ?, activo = ?, password_hash = ? WHERE id = ?')
    .run((d.nombre ?? u.nombre).trim(), rol, activo, hash, id);
  return publico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id));
}

function cambiarPassword(usuarioId, actual, nueva) {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(usuarioId);
  if (!u || !verificarPassword(String(actual || ''), u.password_hash)) throw new ErrorValidacion('La contraseña actual no es correcta.', 400);
  validarPassword(nueva);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hashPassword(nueva), usuarioId);
}

// Primer arranque: si no hay usuarios, crea un administrador inicial.
function asegurarAdminInicial() {
  if (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n > 0) return;
  const email = process.env.ADMIN_EMAIL || 'admin@mad.local';
  const password = process.env.ADMIN_PASSWORD || 'admin1234';
  crearUsuario({ nombre: 'Administrador', email, password, rol: 'ADMINISTRADOR' });
  console.log(`[auth] Usuario inicial creado: ${email} / ${process.env.ADMIN_PASSWORD ? '(contraseña de ADMIN_PASSWORD)' : password}`);
  if (!process.env.ADMIN_PASSWORD) console.log('[auth] CAMBIÁ esa contraseña antes de poner el sistema online.');
}

module.exports = {
  ROLES, login, usuarioDesdeToken, listarUsuarios, crearUsuario, actualizarUsuario, cambiarPassword, asegurarAdminInicial,
};
