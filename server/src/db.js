import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true // Esto obliga a usar la conexión segura nativa que pide el pooler de Neon
});

// Prueba de conexión inicial
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error de conexión con el Postgres de Neon:', err.message);
  } else {
    console.log('⚡ ¡Espectacular! Servidor conectado exitosamente a Neon en la nube.');
  }
});

export default pool;