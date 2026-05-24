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
      SELECT Id, Lat, Lng, OcupadoPorId, OcupadoPorNombre
      FROM Lugares
      ORDER BY Id
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
    // Usamos LIMIT 1 al final en lugar de TOP 1
    const result = await pool.query(`
      SELECT UsuarioNombre AS usuario, RolEtiqueta AS rolEtiqueta,
             LugarId AS lugarId, FechaHora AS fechaHora
      FROM Ingresos
      ORDER BY FechaHora DESC
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

  // Apartamos un cliente exclusivo del Pool para manejar la transacción de forma segura
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Iniciamos la transacción en Neon

    // A. Validar que exista el usuario
    const usuarioRes = await client.query(`
      SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
      FROM Usuarios WHERE Id = $1
    `, [usuarioId]);
    
    const usuario = usuarioRes.rows[0];
    if (!usuario) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // B. Validar el estado actual del cajón
    const lugarRes = await client.query(`
      SELECT Id, Lat, Lng, OcupadoPorId, OcupadoPorNombre
      FROM Lugares WHERE Id = $1
    `, [lugarId]);
    
    const lugar = lugarRes.rows[0];
    if (!lugar) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cajón no encontrado.' });
    }
    if (lugar.ocupadoporid !== null && lugar.ocupadoporid !== usuarioId) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este cajón ya está ocupado.' });
    }

    const nombre = usuario.nombreperfil || usuario.usuario;

    // C. Si el usuario ya tenía otro cajón apartado, lo liberamos (Evita duplicados)
    await client.query(`
      UPDATE Lugares
      SET OcupadoPorId = NULL, OcupadoPorNombre = NULL
      WHERE OcupadoPorId = $1 AND Id <> $2
    `, [usuarioId, lugarId]);

    // D. Asignamos el nuevo cajón
    await client.query(`
      UPDATE Lugares
      SET OcupadoPorId = $1, OcupadoPorNombre = $2
      WHERE Id = $3
    `, [usuarioId, nombre, lugarId]);

    // E. Insertamos el registro en el historial de Ingresos
    await client.query(`
      INSERT INTO Ingresos (UsuarioId, LugarId, UsuarioNombre, RolEtiqueta)
      VALUES ($1, $2, $3, $4)
    `, [usuarioId, lugarId, nombre, etiquetaRol(usuario.rol)]);

    await client.query('COMMIT'); // Guardamos definitivamente todos los cambios en la nube

    // F. Consultas finales de respuesta para refrescar la interfaz de Angular
    const lugaresRes = await pool.query(`SELECT Id, Lat, Lng, OcupadoPorId, OcupadoPorNombre FROM Lugares ORDER BY Id`);
    const ultimoRes = await pool.query(`
      SELECT UsuarioNombre AS usuario, RolEtiqueta AS rolEtiqueta,
             LugarId AS lugarId, FechaHora AS fechaHora
      FROM Ingresos ORDER BY FechaHora DESC LIMIT 1
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
    await client.query('ROLLBACK'); // Si algo falla, cancelamos todo el proceso
    console.error('Error crítico en la transacción de asignación:', err);
    res.status(500).json({ error: 'Error interno del servidor al asignar cajón.' });
  } finally {
    client.release(); // SÚPER IMPORTANTE: Devolvemos el cliente al pool para no saturar a Neon
  }
});