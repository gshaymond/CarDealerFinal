import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

const pool = new Pool(
    connectionString
        ? {
              connectionString,
              ssl: { rejectUnauthorized: false },
          }
        : {
              host: process.env.DB_HOST,
              port: process.env.DB_PORT,
              database: process.env.DB_NAME,
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
          }
);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export default pool;