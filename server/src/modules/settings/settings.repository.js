const db = require('../../config/db');

const getSetting = async (key) => {
  const result = await db.query(
    'SELECT key, value, updated_at FROM tb_setting WHERE key = $1',
    [key]
  );
  return result.rows[0] || null;
};

const setSetting = async (key, value) => {
  const result = await db.query(
    `INSERT INTO tb_setting (key, value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
     RETURNING key, value, updated_at`,
    [key, value]
  );
  return result.rows[0];
};

module.exports = {
  getSetting,
  setSetting,
};
