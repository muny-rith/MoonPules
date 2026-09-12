require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_NAME: process.env.DB_NAME || 'moonpulse',
  DB_PORT: process.env.DB_PORT || 5432,
  JWT_SECRET: process.env.JWT_SECRET || 'mock_secret_key',
  IMS_API_URL: process.env.IMS_API_URL || 'http://localhost:50257/api',
  IMS_AUTH_TOKEN: process.env.IMS_AUTH_TOKEN || null,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || null,
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
};
