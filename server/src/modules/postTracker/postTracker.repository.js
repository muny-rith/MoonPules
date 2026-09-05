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
  const { product_id, page_id, fb_post_id, status, scheduled_time, marked_by, published_time, content_cost, ad_spend, attribution_window_days, media_type } = postData;
  try {
    const result = await db.query(`
      INSERT INTO tb_post_tracker (product_id, page_id, fb_post_id, status, scheduled_time, published_time, marked_by, content_cost, ad_spend, attribution_window_days, media_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [product_id, page_id, fb_post_id, status, scheduled_time || null, published_time || null, marked_by, content_cost || 0, ad_spend || 0, attribution_window_days || 7, media_type || 'photo']);
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('This Facebook post is already tracked.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
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

const updateTrackedPostMetrics = async (id, likes, comments, shares, views, reach, mediaType) => {
  const query = mediaType ? `
    UPDATE tb_post_tracker
    SET likes_count = $1, comments_count = $2, shares_count = $3, views_count = $4, reach_count = $5, media_type = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  ` : `
    UPDATE tb_post_tracker
    SET likes_count = $1, comments_count = $2, shares_count = $3, views_count = $4, reach_count = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const params = mediaType
    ? [likes, comments, shares, views, reach, mediaType, id]
    : [likes, comments, shares, views, reach, id];
  const result = await db.query(query, params);
  return result.rows[0];
};

const updateTrackedPostData = async (id, data) => {
  const result = await db.query(`
    UPDATE tb_post_tracker
    SET product_id = COALESCE($1, product_id),
        status = COALESCE($2, status),
        content_cost = COALESCE($3, content_cost),
        ad_spend = COALESCE($4, ad_spend),
        attribution_window_days = COALESCE($5, attribution_window_days),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `, [data.product_id, data.status, data.content_cost, data.ad_spend, data.attribution_window_days, id]);
  return result.rows[0];
};

const updateTrackedPostCosts = async (id, contentCost, adSpend) => {
  const result = await db.query(`
    UPDATE tb_post_tracker
    SET content_cost = $1, ad_spend = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `, [contentCost, adSpend, id]);
  return result.rows[0];
};

const deleteTrackedPost = async (id) => {
  const result = await db.query(`
    DELETE FROM tb_post_tracker
    WHERE id = $1
    RETURNING *
  `, [id]);
  return result.rows[0];
};

module.exports = {
  getAllTrackedPosts,
  getTrackedPostsByStatus,
  createTrackedPost,
  updateTrackedPostStatus,
  updateTrackedPostMetrics,
  updateTrackedPostData,
  updateTrackedPostCosts,
  deleteTrackedPost,
};
