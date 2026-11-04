const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err, client) => {
  console.warn('[Database] Notice: Idle database client disconnected by host:', err.message);
  // DO NOT exit process. Supabase pooler routinely closes idle sockets.
  // pg.Pool automatically evicts the dead socket and creates a fresh connection on demand.
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
