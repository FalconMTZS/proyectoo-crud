import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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