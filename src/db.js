import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
const discreteConfig = {
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};
const hasDiscreteConfig = Boolean(
    discreteConfig.host && discreteConfig.database && discreteConfig.user && discreteConfig.password
);
const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes((discreteConfig.host || '').toLowerCase());

if (isProduction && !connectionString && (!hasDiscreteConfig || isLocalHost)) {
    throw new Error(
        'Production database configuration is missing. Set DATABASE_URL in Render (recommended) or provide non-local DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.'
    );
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
    : discreteConfig;

const pool = new Pool(poolConfig);

console.log(`Postgres target: ${describeConnectionTarget(connectionString)}`);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export default pool;