import dotenv from 'dotenv';

dotenv.config();

const trusted = process.env.DB_TRUSTED_CONNECTION !== 'false';

/** En Windows, la autenticación integrada (como SSMS) requiere msnodesqlv8. */
const sql = trusted
  ? (await import('mssql/msnodesqlv8.js')).default
  : (await import('mssql')).default;

const config = {
  server: process.env.DB_SERVER || 'F41C0N\\MSSQLSERVER1',
  database: process.env.DB_DATABASE || 'EstacionaTEC',
  ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    ...(trusted ? { trustedConnection: true } : {})
  },
  ...(!trusted
    ? {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
    : {})
};

let pool = null;

export async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export { sql };
