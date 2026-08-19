const db = require('../../config/db');

const listPages = async () => {
    const result = await db.query(`
    SELECT id, page_name, fb_page_id, is_active FROM tb_fb_page WHERE is_active = true
  `);
    return result.rows; // never return access_token
};

module.exports = { listPages };