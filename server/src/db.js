import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// Al dejar el Pool vacío (), la librería 'pg' lee AUTOMÁTICAMENTE
// las variables PGUSER, PGPASSWORD, PGHOST, PGDATABASE y PGPORT desde Render o tu .env
const pool = new Pool({
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión con el Postgres de Neon:', err.stack);
  } else {
    console.log('⚡ ¡Espectacular! Servidor conectado exitosamente a Neon en la nube.');
  }
});

export default pool;