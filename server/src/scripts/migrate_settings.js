require('dotenv').config();
const db = require('../config/db');

const DEFAULT_FOOTER = `--------------------------
☎️ ទូរស័ព្ទទំនាក់ទំនង (Smart)៖ 070 65 49 59
📲 កុម្មង់តាម Telegram ៖ t.me/Cholykkmart
⭐️ Telegram Group: https://t.me/+msepgFerxEoxNjk1
--------------------------
🛒 Chhorlyka Mart ទាំង ២ សាខា៖
🔹 សាខាផ្លូវជាតិលេខ ៣៖ បុរីពិភពថ្មី គម្រោងទី១ ផ្លូវជាតិលេខ៣ (ផ្លូវលេខ២ ផ្ទះលេខ ៣/៥/៧/៩)
📌 https://maps.app.goo.gl/HTZGiLr6ab3D2PM6A
🔹 សាខាផ្លូវជាតិលេខ ៤ (អូរឌឹម)
📌 https://maps.app.goo.gl/tSiC2pGc1wgkVT2B9`;

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting settings migration...');
    await client.query('BEGIN');

    // 1. Create tb_setting table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tb_setting (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created tb_setting table');

    // 2. Insert or update default_contact_footer
    await client.query(`
      INSERT INTO tb_setting (key, value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
    `, ['default_contact_footer', DEFAULT_FOOTER]);
    console.log('✓ Inserted default_contact_footer setting for Chhorlyka Mart');

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
