import { Router } from 'express';
import { getPool, sql } from '../db.js';
import { etiquetaRol, mapLugarRow } from '../mappers.js';

export const lugaresRouter = Router();

lugaresRouter.get('/', async (_req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id, Lat, Lng, OcupadoPorId, OcupadoPorNombre
    FROM dbo.Lugares
    ORDER BY Id
  `);
  res.json(result.recordset.map(mapLugarRow));
});

lugaresRouter.get('/ingresos/ultimo', async (_req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TOP 1 UsuarioNombre AS usuario, RolEtiqueta AS rolEtiqueta,
           LugarId AS lugarId, FechaHora AS fechaHora
    FROM dbo.Ingresos
    ORDER BY FechaHora DESC
  `);
  const row = result.recordset[0];
  if (!row) {
    return res.json(null);
  }
  res.json({
    usuario: row.usuario,
    rolEtiqueta: row.rolEtiqueta,
    lugarId: row.lugarId,
    fechaHora: row.fechaHora.toISOString()
  });
});

lugaresRouter.post('/:id/asignar', async (req, res) => {
  const lugarId = req.params.id;
  const usuarioId = Number(req.body?.usuarioId);

  if (!lugarId || !usuarioId) {
    return res.status(400).json({ error: 'Lugar y usuario son obligatorios.' });
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const usuarioReq = new sql.Request(tx);
    usuarioReq.input('id', sql.Int, usuarioId);
    const usuarioRes = await usuarioReq.query(`
      SELECT Id, Usuario, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula
      FROM dbo.Usuarios WHERE Id = @id
    `);
    const usuario = usuarioRes.recordset[0];
    if (!usuario) {
      await tx.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const lugarReq = new sql.Request(tx);
    lugarReq.input('lugarId', sql.NVarChar(10), lugarId);
    const lugarRes = await lugarReq.query(`
      SELECT Id, Lat, Lng, OcupadoPorId, OcupadoPorNombre
      FROM dbo.Lugares WHERE Id = @lugarId
    `);
    const lugar = lugarRes.recordset[0];
    if (!lugar) {
      await tx.rollback();
      return res.status(404).json({ error: 'Cajón no encontrado.' });
    }
    if (lugar.OcupadoPorId !== null && lugar.OcupadoPorId !== usuarioId) {
      await tx.rollback();
      return res.status(409).json({ error: 'Este cajón ya está ocupado.' });
    }

    const nombre = usuario.NombrePerfil || usuario.Usuario;

    const liberaReq = new sql.Request(tx);
    liberaReq.input('usuarioId', sql.Int, usuarioId);
    liberaReq.input('lugarId', sql.NVarChar(10), lugarId);
    await liberaReq.query(`
      UPDATE dbo.Lugares
      SET OcupadoPorId = NULL, OcupadoPorNombre = NULL
      WHERE OcupadoPorId = @usuarioId AND Id <> @lugarId
    `);

    const asignaReq = new sql.Request(tx);
    asignaReq.input('usuarioId', sql.Int, usuarioId);
    asignaReq.input('nombre', sql.NVarChar(120), nombre);
    asignaReq.input('lugarId', sql.NVarChar(10), lugarId);
    await asignaReq.query(`
      UPDATE dbo.Lugares
      SET OcupadoPorId = @usuarioId, OcupadoPorNombre = @nombre
      WHERE Id = @lugarId
    `);

    const ingresoReq = new sql.Request(tx);
    ingresoReq.input('usuarioId', sql.Int, usuarioId);
    ingresoReq.input('lugarId', sql.NVarChar(10), lugarId);
    ingresoReq.input('nombre', sql.NVarChar(120), nombre);
    ingresoReq.input('rolEtiqueta', sql.NVarChar(40), etiquetaRol(usuario.Rol));
    await ingresoReq.query(`
      INSERT INTO dbo.Ingresos (UsuarioId, LugarId, UsuarioNombre, RolEtiqueta)
      VALUES (@usuarioId, @lugarId, @nombre, @rolEtiqueta)
    `);

    await tx.commit();

    const lugaresRes = await pool.request().query(`
      SELECT Id, Lat, Lng, OcupadoPorId, OcupadoPorNombre FROM dbo.Lugares ORDER BY Id
    `);
    const ultimoRes = await pool.request().query(`
      SELECT TOP 1 UsuarioNombre AS usuario, RolEtiqueta AS rolEtiqueta,
             LugarId AS lugarId, FechaHora AS fechaHora
      FROM dbo.Ingresos ORDER BY FechaHora DESC
    `);
    const u = ultimoRes.recordset[0];

    res.json({
      lugares: lugaresRes.recordset.map(mapLugarRow),
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
    await tx.rollback();
    throw err;
  }
});
