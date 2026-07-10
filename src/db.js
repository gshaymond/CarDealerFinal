import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

if (isProduction && !connectionString) {
    throw new Error('Missing DATABASE_URL (or DB_URL) in production. Refusing to fall back to localhost DB settings.');
}

function describeConnectionTarget(urlString) {
    if (!urlString) {
        return `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || '(unset)'}`;
    }

    try {
        const parsed = new URL(urlString);
        return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
    } catch {
        return 'unparseable DATABASE_URL';
    }
}

const poolConfig = connectionString
    ? {
          connectionString,
          ssl: { rejectUnauthorized: false },
      }
    : {
          host: process.env.DB_HOST,
          port: Number.parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
      };

const pool = new Pool(poolConfig);

console.log(`Postgres target: ${describeConnectionTarget(connectionString)}`);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export default pool;