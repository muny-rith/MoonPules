const db = require('../../config/db');

const getAllTrackedPosts = async () => {
  const result = await db.query(`
    SELECT pt.*, fp.page_name, fp.fb_page_id 
    FROM tb_post_tracker pt
    JOIN tb_fb_page fp ON pt.page_id = fp.id
    ORDER BY pt.created_at DESC
  `);
  return result.rows;
};

const getTrackedPostsByStatus = async (status) => {
  const result = await db.query(`
    SELECT pt.*, fp.page_name, fp.fb_page_id, fp.access_token 
    FROM tb_post_tracker pt
    JOIN tb_fb_page fp ON pt.page_id = fp.id
    WHERE pt.status = $1
  `, [status]);
  return result.rows;
};

const createTrackedPost = async (postData) => {
  const { product_id, page_id, fb_post_id, status, scheduled_time, marked_by } = postData;
  const result = await db.query(`
    INSERT INTO tb_post_tracker (product_id, page_id, fb_post_id, status, scheduled_time, marked_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [product_id, page_id, fb_post_id, status, scheduled_time, marked_by]);
  return result.rows[0];
};

const updateTrackedPostStatus = async (id, status, published_time) => {
  const result = await db.query(`
    UPDATE tb_post_tracker
    SET status = $1, published_time = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `, [status, published_time, id]);
  return result.rows[0];
};

module.exports = {
  getAllTrackedPosts,
  getTrackedPostsByStatus,
  createTrackedPost,
  updateTrackedPostStatus,
};
