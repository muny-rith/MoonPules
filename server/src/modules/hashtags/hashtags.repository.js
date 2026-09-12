const db = require('../../config/db');

const getAllHashtags = async () => {
  const result = await db.query(`
    SELECT id, tag, is_saved, note, usage_count, last_used_at, created_at, updated_at
    FROM tb_hashtag
    ORDER BY is_saved DESC, usage_count DESC, created_at DESC
  `);
  return result.rows;
};

const getHashtagByTag = async (tag) => {
  const result = await db.query(
    'SELECT id, tag, is_saved, note, usage_count, last_used_at FROM tb_hashtag WHERE tag = $1',
    [tag]
  );
  return result.rows[0] || null;
};

const toggleSaveHashtag = async (tag, note = null) => {
  const clean = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim().replace(/\s+/g, '')}`;
  
  // Upsert: if exists toggle is_saved, else insert with is_saved = true
  const result = await db.query(`
    INSERT INTO tb_hashtag (tag, is_saved, note, updated_at)
    VALUES ($1, TRUE, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (tag) DO UPDATE
    SET is_saved = NOT tb_hashtag.is_saved,
        note = COALESCE($2, tb_hashtag.note),
        updated_at = CURRENT_TIMESTAMP
    RETURNING id, tag, is_saved, note, usage_count, last_used_at, updated_at
  `, [clean, note]);

  return result.rows[0];
};

const recordUsage = async (tagsArray) => {
  if (!Array.isArray(tagsArray) || tagsArray.length === 0) return [];

  const results = [];
  for (const rawTag of tagsArray) {
    if (!rawTag || typeof rawTag !== 'string') continue;
    const clean = rawTag.trim().startsWith('#') ? rawTag.trim() : `#${rawTag.trim().replace(/\s+/g, '')}`;

    const res = await db.query(`
      INSERT INTO tb_hashtag (tag, is_saved, usage_count, last_used_at, updated_at)
      VALUES ($1, FALSE, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (tag) DO UPDATE
      SET usage_count = tb_hashtag.usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      RETURNING id, tag, is_saved, note, usage_count, last_used_at
    `, [clean]);

    results.push(res.rows[0]);
  }

  return results;
};

const updateNote = async (id, note) => {
  const result = await db.query(`
    UPDATE tb_hashtag
    SET note = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, tag, is_saved, note, usage_count, last_used_at, updated_at
  `, [note, id]);

  return result.rows[0] || null;
};

const deleteHashtag = async (id) => {
  const result = await db.query(
    'DELETE FROM tb_hashtag WHERE id = $1 RETURNING id, tag',
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllHashtags,
  getHashtagByTag,
  toggleSaveHashtag,
  recordUsage,
  updateNote,
  deleteHashtag,
};
