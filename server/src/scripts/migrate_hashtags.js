const db = require('../config/db');

const migrateHashtags = async () => {
  try {
    console.log('--- Creating tb_hashtag table ---');
    await db.query(`
      CREATE TABLE IF NOT EXISTS tb_hashtag (
          id SERIAL PRIMARY KEY,
          tag VARCHAR(100) NOT NULL UNIQUE,
          is_saved BOOLEAN DEFAULT FALSE,
          note TEXT NULL,
          usage_count INT DEFAULT 0,
          last_used_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_hashtag_tag ON tb_hashtag(tag);
      CREATE INDEX IF NOT EXISTS idx_hashtag_is_saved ON tb_hashtag(is_saved);
      CREATE INDEX IF NOT EXISTS idx_hashtag_last_used ON tb_hashtag(last_used_at DESC NULLS LAST);
    `);

    console.log('--- Seeding default shop hashtags with notes ---');
    const initialTags = [
      { tag: '#ChhorlykaMart', is_saved: true, note: 'Store official brand tag', usage_count: 10, last_used_at: new Date() },
      { tag: '#Promotion', is_saved: true, note: 'Special discounts & shop promotions', usage_count: 8, last_used_at: new Date() },
      { tag: '#FreeDelivery', is_saved: true, note: 'Orders with free shipping service', usage_count: 5, last_used_at: new Date() },
      { tag: '#FlashSale', is_saved: true, note: 'Time-limited flash sale events', usage_count: 3, last_used_at: null },
      { tag: '#CambodiaShop', is_saved: true, note: 'Local Cambodia e-commerce tag', usage_count: 4, last_used_at: null },
      { tag: '#គុណភាពល្អ', is_saved: true, note: '100% authentic quality products', usage_count: 6, last_used_at: new Date() },
    ];

    for (const item of initialTags) {
      await db.query(`
        INSERT INTO tb_hashtag (tag, is_saved, note, usage_count, last_used_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tag) DO UPDATE
        SET is_saved = EXCLUDED.is_saved,
            note = COALESCE(tb_hashtag.note, EXCLUDED.note)
      `, [item.tag, item.is_saved, item.note, item.usage_count, item.last_used_at]);
    }

    const res = await db.query('SELECT * FROM tb_hashtag ORDER BY id');
    console.log(`Success! Total hashtags in DB: ${res.rows.length}`);
    console.table(res.rows);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
};

migrateHashtags();
