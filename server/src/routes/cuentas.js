import { Router } from 'express';
import pool from '../db.js';
import { mapUsuarioRow } from '../mappers.js';

export const cuentasRouter = Router();

const ROLES = new Set(['admin', 'docente', 'estudiante', 'guardia']);

// ==========================================
// 1. OBTENER TODOS LOS USUARIOS
// ==========================================
cuentasRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
      FROM Usuarios
      ORDER BY Usuario
    `);
    res.json(result.rows.map(mapUsuarioRow));
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// 2. OBTENER UN USUARIO POR ID
// ==========================================
cuentasRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query(`
      SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
      FROM Usuarios WHERE Id = $1
    `, [id]);

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json(mapUsuarioRow(row));
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// 3. CREAR NUEVO USUARIO
// ==========================================
cuentasRouter.post('/', async (req, res) => {
  const body = req.body ?? {};
  const usuario = String(body.usuario ?? '').trim();
  const password = String(body.password ?? '').trim();
  const rol = String(body.rol ?? '');
  const acceso = String(body.acceso ?? '').trim();
  const nombrePerfil = String(body.nombrePerfil ?? '').trim() || usuario;
  const vehiculo = String(body.vehiculo ?? '').trim() || '—';
  const colorAuto = String(body.colorAuto ?? '').trim() || '—';
  const matricula = String(body.matricula ?? '').trim() || '—';

  if (!usuario || !password || !acceso || !ROLES.has(rol)) {
    return res.status(400).json({ error: 'Datos incompletos o rol inválido.' });
  }

  try {
    // Usamos RETURNING en Postgres para obtener los datos insertados al instante
    const result = await pool.query(`
      INSERT INTO Usuarios (Usuario, PasswordHash, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
    `, [usuario, password, rol, acceso, nombrePerfil, vehiculo, colorAuto, matricula]);

    res.status(201).json(mapUsuarioRow(result.rows[0]));
  } catch (err) {
    // El código '23505' en Postgres significa "llave duplicada" (Usuario único existente)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese usuario ya existe.' });
    }
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// 4. ACTUALIZAR USUARIO
// ==========================================
cuentasRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body ?? {};
  const usuario = String(body.usuario ?? '').trim();
  const password = String(body.password ?? '').trim();
  const rol = String(body.rol ?? '');
  const acceso = String(body.acceso ?? '').trim();
  const nombrePerfil = String(body.nombrePerfil ?? '').trim() || usuario;
  const vehiculo = String(body.vehiculo ?? '').trim() || '—';
  const colorAuto = String(body.colorAuto ?? '').trim() || '—';
  const matricula = String(body.matricula ?? '').trim() || '—';

  if (!usuario || !acceso || !ROLES.has(rol)) {
    return res.status(400).json({ error: 'Datos incompletos o rol inválido.' });
  }

  try {
    // Construimos los parámetros e índices dinámicos de forma segura
    const params = [usuario, rol, acceso, nombrePerfil, vehiculo, colorAuto, matricula];
    let query = `
      UPDATE Usuarios
      SET Usuario = $1, Rol = $2, Acceso = $3,
          NombrePerfil = $4, Vehiculo = $5,
          ColorAuto = $6, Matricula = $7
    `;

    if (password) {
      params.push(password);
      query += `, PasswordHash = $${params.length}`;
    }

    params.push(id);
    query += ` WHERE Id = $${params.length}
              RETURNING Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula`;

    const result = await pool.query(query, params);
    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json(mapUsuarioRow(row));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese usuario ya existe.' });
    }
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// 5. ELIMINAR USUARIO
// ==========================================
cuentasRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    // Liberar el lugar antes de eliminar (Evita conflictos de llave foránea)
    await pool.query(`
      UPDATE Lugares SET OcupadoPorId = NULL, OcupadoPorNombre = NULL WHERE OcupadoPorId = $1
    `, [id]);

    const result = await pool.query('DELETE FROM Usuarios WHERE Id = $1', [id]);

    // En 'pg', la cantidad de filas afectadas se lee desde 'rowCount'
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});