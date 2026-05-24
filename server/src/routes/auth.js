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
    // Consultamos las columnas en minúsculas pero les ponemos ALIAS con comillas dobles
    // para que el objeto de JavaScript mantenga las mayúsculas originales exactas.
    const result = await pool.query(
      `SELECT 
        id AS "Id", 
        usuario AS "Usuario", 
        rol AS "Rol", 
        acceso AS "Acceso", 
        nombreperfil AS "NombrePerfil", 
        vehiculo AS "Vehiculo", 
        colorauto AS "ColorAuto", 
        matricula AS "Matricula"
       FROM usuarios
       WHERE usuario = $1 AND passwordhash = $2`,
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