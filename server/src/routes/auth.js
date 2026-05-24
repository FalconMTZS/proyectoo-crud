import { Router } from 'express';
import pool from '../db.js'; // Importamos el pool directamente
import { mapUsuarioRow } from '../mappers.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const usuario = String(req.body?.usuario ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  try {
    // En Postgres usamos $1 y $2 para pasar los parámetros de forma segura contra SQL Injection
    // Y le pasamos las variables dentro de un arreglo como segundo argumento
    const result = await pool.query(
      `SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
       FROM Usuarios
       WHERE Usuario = $1 AND PasswordHash = $2`,
      [usuario, password]
    );

    // En 'pg', las filas devueltas están en 'result.rows' en vez de 'result.recordset'
    const row = result.rows[0];
    
    if (!row) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    res.json(mapUsuarioRow(row));
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});