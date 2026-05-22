import { Router } from 'express';
import { getPool, sql } from '../db.js';
import { mapUsuarioRow } from '../mappers.js';

export const cuentasRouter = Router();

const ROLES = new Set(['admin', 'docente', 'estudiante', 'guardia']);

cuentasRouter.get('/', async (_req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
    FROM dbo.Usuarios
    ORDER BY Usuario
  `);
  res.json(result.recordset.map(mapUsuarioRow));
});

cuentasRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
      FROM dbo.Usuarios WHERE Id = @id
    `);
  const row = result.recordset[0];
  if (!row) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  res.json(mapUsuarioRow(row));
});

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

  const pool = await getPool();
  try {
    const result = await pool
      .request()
      .input('usuario', sql.NVarChar(80), usuario)
      .input('password', sql.NVarChar(200), password)
      .input('rol', sql.NVarChar(20), rol)
      .input('acceso', sql.NVarChar(200), acceso)
      .input('nombrePerfil', sql.NVarChar(120), nombrePerfil)
      .input('vehiculo', sql.NVarChar(80), vehiculo)
      .input('colorAuto', sql.NVarChar(60), colorAuto)
      .input('matricula', sql.NVarChar(30), matricula)
      .query(`
        INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula)
        OUTPUT INSERTED.Id, INSERTED.Usuario, INSERTED.Rol, INSERTED.Acceso,
               INSERTED.NombrePerfil, INSERTED.Vehiculo, INSERTED.ColorAuto, INSERTED.Matricula
        VALUES (@usuario, @password, @rol, @acceso, @nombrePerfil, @vehiculo, @colorAuto, @matricula)
      `);
    res.status(201).json(mapUsuarioRow(result.recordset[0]));
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ error: 'Ese usuario ya existe.' });
    }
    throw err;
  }
});

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

  const pool = await getPool();
  const passwordClause = password
    ? ', PasswordHash = @password'
    : '';

  try {
    const request = pool
      .request()
      .input('id', sql.Int, id)
      .input('usuario', sql.NVarChar(80), usuario)
      .input('rol', sql.NVarChar(20), rol)
      .input('acceso', sql.NVarChar(200), acceso)
      .input('nombrePerfil', sql.NVarChar(120), nombrePerfil)
      .input('vehiculo', sql.NVarChar(80), vehiculo)
      .input('colorAuto', sql.NVarChar(60), colorAuto)
      .input('matricula', sql.NVarChar(30), matricula);

    if (password) {
      request.input('password', sql.NVarChar(200), password);
    }

    const result = await request.query(`
      UPDATE dbo.Usuarios
      SET Usuario = @usuario, Rol = @rol, Acceso = @acceso,
          NombrePerfil = @nombrePerfil, Vehiculo = @vehiculo,
          ColorAuto = @colorAuto, Matricula = @matricula
          ${passwordClause}
      OUTPUT INSERTED.Id, INSERTED.Usuario, INSERTED.Rol, INSERTED.Acceso,
             INSERTED.NombrePerfil, INSERTED.Vehiculo, INSERTED.ColorAuto, INSERTED.Matricula
      WHERE Id = @id
    `);

    const row = result.recordset[0];
    if (!row) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json(mapUsuarioRow(row));
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ error: 'Ese usuario ya existe.' });
    }
    throw err;
  }
});

cuentasRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const pool = await getPool();

  await pool.request().input('id', sql.Int, id).query(`
    UPDATE dbo.Lugares SET OcupadoPorId = NULL, OcupadoPorNombre = NULL WHERE OcupadoPorId = @id
  `);

  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query('DELETE FROM dbo.Usuarios WHERE Id = @id');

  if (result.rowsAffected[0] === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  res.status(204).send();
});
