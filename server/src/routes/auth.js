import { Router } from 'express';
import { getPool, sql } from '../db.js';
import { mapUsuarioRow } from '../mappers.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const usuario = String(req.body?.usuario ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('usuario', sql.NVarChar(80), usuario)
    .input('password', sql.NVarChar(200), password)
    .query(`
      SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
      FROM dbo.Usuarios
      WHERE Usuario = @usuario AND PasswordHash = @password
    `);

  const row = result.recordset[0];
  if (!row) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  res.json(mapUsuarioRow(row));
});
