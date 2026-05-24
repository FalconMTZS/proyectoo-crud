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
      SELECT 
        id AS "Id", 
        usuario AS "Usuario", 
        rol AS "Rol", 
        acceso AS "Acceso", 
        nombreperfil AS "NombrePerfil", 
        vehiculo AS "Vehiculo", 
        colorauto AS "ColorAuto", 
        matricula AS "Matricula"
      FROM usuarios
      ORDER BY usuario
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
      SELECT 
        id AS "Id", 
        usuario AS "Usuario", 
        rol AS "Rol", 
        acceso AS "Acceso", 
        nombreperfil AS "NombrePerfil", 
        vehiculo AS "Vehiculo", 
        colorauto AS "ColorAuto", 
        matricula AS "Matricula"
      FROM usuarios 
      WHERE id = $1
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
    const result = await pool.query(`
      INSERT INTO usuarios (usuario, passwordhash, rol, acceso, nombreperfil, vehiculo, colorauto, matricula)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id AS "Id", 
        usuario AS "Usuario", 
        rol AS "Rol", 
        acceso AS "Acceso", 
        nombreperfil AS "NombrePerfil", 
        vehiculo AS "Vehiculo", 
        colorauto AS "ColorAuto", 
        matricula AS "Matricula"
    `, [usuario, password, rol, acceso, nombrePerfil, vehiculo, colorAuto, matricula]);

    res.status(201).json(mapUsuarioRow(result.rows[0]));
  } catch (err) {
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
    const params = [usuario, rol, acceso, nombrePerfil, vehiculo, colorAuto, matricula];
    let query = `
      UPDATE usuarios
      SET usuario = $1, rol = $2, acceso = $3,
          nombreperfil = $4, vehiculo = $5,
          colorauto = $6, matricula = $7
    `;

    if (password) {
      params.push(password);
      query += `, passwordhash = $${params.length}`;
    }

    params.push(id);
    query += ` WHERE id = $${params.length}
              RETURNING 
                id AS "Id", 
                usuario AS "Usuario", 
                rol AS "Rol", 
                acceso AS "Acceso", 
                nombreperfil AS "NombrePerfil", 
                vehiculo AS "Vehiculo", 
                colorauto AS "ColorAuto", 
                matricula AS "Matricula"`;

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
    // Ajustado nombres de las columnas a minúsculas
    await pool.query(`
      UPDATE lugares SET ocupadorporid = NULL, ocupadopornombre = NULL WHERE ocupadorporid = $1
    `, [id]);

    const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});