import { Router } from 'express';
import pool from '../db.js';
import { etiquetaRol, mapLugarRow } from '../mappers.js';

export const lugaresRouter = Router();

// ==========================================
// 1. OBTENER TODOS LOS LUGARES
// ==========================================
lugaresRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id AS "Id", 
        lat AS "Lat", 
        lng AS "Lng", 
        ocupadorporid AS "OcupadoPorId", 
        ocupadopornombre AS "OcupadoPorNombre"
      FROM lugares
      ORDER BY id
    `);
    res.json(result.rows.map(mapLugarRow));
  } catch (error) {
    console.error('Error al obtener lugares:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// 2. OBTENER EL ÚLTIMO INGRESO registrado
// ==========================================
lugaresRouter.get('/ingresos/ultimo', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        usuarionombre AS usuario, 
        roletiqueta AS "rolEtiqueta",
        lugarid AS "lugarId", 
        fechahora AS "fechaHora"
      FROM ingresos
      ORDER BY fechahora DESC
      LIMIT 1
    `);
    
    const row = result.rows[0];
    if (!row) {
      return res.json(null);
    }
    res.json({
      usuario: row.usuario,
      rolEtiqueta: row.rolEtiqueta,
      lugarId: row.lugarId,
      fechaHora: row.fechaHora.toISOString()
    });
  } catch (error) {
    console.error('Error al obtener el último ingreso:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// 3. ASIGNAR / OCUPAR UN CAJÓN (Con Transacción)
// ==========================================
lugaresRouter.post('/:id/asignar', async (req, res) => {
  const lugarId = req.params.id;
  const usuarioId = Number(req.body?.usuarioId);

  if (!lugarId || !usuarioId) {
    return res.status(400).json({ error: 'Lugar y usuario son obligatorios.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // A. Validar que exista el usuario (Mantenemos minúsculas internas para leer el objeto)
    const usuarioRes = await client.query(`
      SELECT id, usuario, rol, acceso, nombreperfil, vehiculo, colorauto, matricula
      FROM usuarios WHERE id = $1
    `, [usuarioId]);
    
    const usuario = usuarioRes.rows[0];
    if (!usuario) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // B. Validar el estado actual del cajón
    const lugarRes = await client.query(`
      SELECT id, lat, lng, ocupadorporid, ocupadopornombre
      FROM lugares WHERE id = $1
    `, [lugarId]);
    
    const lugar = lugarRes.rows[0];
    if (!lugar) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cajón no encontrado.' });
    }
    if (lugar.ocupadorporid !== null && lugar.ocupadorporid !== usuarioId) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este cajón ya está ocupado.' });
    }

    const nombre = usuario.nombreperfil || usuario.usuario;

    // C. Si el usuario ya tenía otro cajón apartado, lo liberamos
    await client.query(`
      UPDATE lugares
      SET ocupadorporid = NULL, ocupadopornombre = NULL
      WHERE ocupadorporid = $1 AND id <> $2
    `, [usuarioId, lugarId]);

    // D. Asignamos el nuevo cajón
    await client.query(`
      UPDATE lugares
      SET ocupadorporid = $1, ocupadopornombre = $2
      WHERE id = $3
    `, [usuarioId, nombre, lugarId]);

    // E. Insertamos el registro en el historial de Ingresos
    await client.query(`
      INSERT INTO ingresos (usuarioid, lugarid, usuarionombre, roletiqueta)
      VALUES ($1, $2, $3, $4)
    `, [usuarioId, lugarId, nombre, etiquetaRol(usuario.rol)]);

    await client.query('COMMIT');

    // F. Consultas finales de respuesta mapeadas con alias para Angular
    const lugaresRes = await pool.query(`
      SELECT 
        id AS "Id", 
        lat AS "Lat", 
        lng AS "Lng", 
        ocupadorporid AS "OcupadoPorId", 
        ocupadopornombre AS "OcupadoPorNombre" 
      FROM lugares 
      ORDER BY id
    `);
    
    const ultimoRes = await pool.query(`
      SELECT 
        usuarionombre AS usuario, 
        roletiqueta AS "rolEtiqueta",
        lugarid AS "lugarId", 
        fechahora AS "fechaHora"
      FROM ingresos 
      ORDER BY fechahora DESC 
      LIMIT 1
    `);
    const u = ultimoRes.rows[0];

    res.json({
      lugares: lugaresRes.rows.map(mapLugarRow),
      ultimoIngreso: u
        ? {
            usuario: u.usuario,
            rolEtiqueta: u.rolEtiqueta,
            lugarId: u.lugarId,
            fechaHora: u.fechaHora.toISOString()
          }
        : null
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error crítico en la transacción de asignación:', err);
    res.status(500).json({ error: 'Error interno del servidor al asignar cajón.' });
  } finally {
    client.release();
  }
});