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
  const {
    product_id,
    brand_id,
    tracking_type,
    page_id,
    fb_post_id,
    status,
    scheduled_time,
    marked_by,
    published_time,
    content_cost,
    ad_spend,
    attribution_window_days,
    media_type,
    message,
    media_url,
  } = postData;

  try {
    const result = await db.query(`
      INSERT INTO tb_post_tracker (
        product_id, brand_id, tracking_type, page_id, fb_post_id, status, scheduled_time, published_time, 
        marked_by, content_cost, ad_spend, attribution_window_days, media_type,
        message, media_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      product_id ? parseInt(product_id, 10) : null,
      brand_id ? parseInt(brand_id, 10) : null,
      tracking_type || (brand_id && !product_id ? 'brand' : 'product'),
      page_id,
      fb_post_id || null,
      status || 'scheduled',
      scheduled_time || null,
      published_time || null,
      marked_by,
      content_cost || 0,
      ad_spend || 0,
      attribution_window_days || 7,
      media_type || 'photo',
      message || null,
      media_url || null,
    ]);
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

const getTrackedPostById = async (id) => {
  const result = await db.query(`
    SELECT pt.*, fp.page_name, fp.fb_page_id, fp.access_token 
    FROM tb_post_tracker pt
    JOIN tb_fb_page fp ON pt.page_id = fp.id
    WHERE pt.id = $1
  `, [id]);
  return result.rows[0];
};

const getDueScheduledPosts = async () => {
  const result = await db.query(`
    SELECT pt.*, fp.page_name, fp.fb_page_id, fp.access_token 
    FROM tb_post_tracker pt
    JOIN tb_fb_page fp ON pt.page_id = fp.id
    WHERE pt.status = 'scheduled' 
      AND pt.fb_post_id IS NULL 
      AND pt.scheduled_time <= CURRENT_TIMESTAMP
    ORDER BY pt.scheduled_time ASC
  `);
  return result.rows;
};

const getUpcomingScheduledPosts = async () => {
  const result = await db.query(`
    SELECT pt.*, fp.page_name, fp.fb_page_id, fp.access_token 
    FROM tb_post_tracker pt
    JOIN tb_fb_page fp ON pt.page_id = fp.id
    WHERE pt.status = 'scheduled' 
      AND pt.fb_post_id IS NULL 
      AND pt.scheduled_time > CURRENT_TIMESTAMP
    ORDER BY pt.scheduled_time ASC
  `);
  return result.rows;
};


const setScheduledPostFbId = async (id, fbPostId) => {
  const result = await db.query(`
    UPDATE tb_post_tracker
    SET fb_post_id = $1, publish_error = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `, [fbPostId, id]);
  return result.rows[0];
};

const markPostAsPublished = async (id, fbPostId, publishedTime) => {
  const result = await db.query(`
    UPDATE tb_post_tracker
    SET fb_post_id = $1, status = 'published', published_time = $2, publish_error = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `, [fbPostId, publishedTime || new Date(), id]);
  return result.rows[0];
};

const markPostAsFailed = async (id, publishError) => {
  const result = await db.query(`
    UPDATE tb_post_tracker
    SET status = 'failed', publish_error = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `, [publishError, id]);
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

const updateTrackedPostMetrics = async (id, likes, comments, shares, views, reach, mediaType) => {
  const query = mediaType ? `
    UPDATE tb_post_tracker
    SET likes_count = $1, comments_count = $2, shares_count = $3,
        views_count = COALESCE($4, views_count),
        reach_count = COALESCE($5, reach_count),
        media_type = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  ` : `
    UPDATE tb_post_tracker
    SET likes_count = $1, comments_count = $2, shares_count = $3,
        views_count = COALESCE($4, views_count),
        reach_count = COALESCE($5, reach_count),
        updated_at = CURRENT_TIMESTAMP
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
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.product_id !== undefined) {
    fields.push(`product_id = $${idx++}`);
    values.push(data.product_id ? parseInt(data.product_id, 10) : null);
  }
  if (data.brand_id !== undefined) {
    fields.push(`brand_id = $${idx++}`);
    values.push(data.brand_id ? parseInt(data.brand_id, 10) : null);
  }
  if (data.tracking_type !== undefined) {
    fields.push(`tracking_type = $${idx++}`);
    values.push(data.tracking_type);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
  }
  if (data.content_cost !== undefined) {
    fields.push(`content_cost = $${idx++}`);
    values.push(data.content_cost !== null && data.content_cost !== '' ? parseFloat(data.content_cost) : 0);
  }
  if (data.ad_spend !== undefined) {
    fields.push(`ad_spend = $${idx++}`);
    values.push(data.ad_spend !== null && data.ad_spend !== '' ? parseFloat(data.ad_spend) : 0);
  }
  if (data.attribution_window_days !== undefined) {
    fields.push(`attribution_window_days = $${idx++}`);
    values.push(parseInt(data.attribution_window_days, 10) || 7);
  }
  if (data.fb_post_id !== undefined) {
    fields.push(`fb_post_id = $${idx++}`);
    values.push(data.fb_post_id || null);
  }
  if (data.message !== undefined) {
    fields.push(`message = $${idx++}`);
    values.push(data.message || '');
  }
  if (data.media_url !== undefined) {
    fields.push(`media_url = $${idx++}`);
    values.push(data.media_url || null);
  }
  if (data.media_type !== undefined) {
    fields.push(`media_type = $${idx++}`);
    values.push(data.media_type || 'photo');
  }
  if (data.scheduled_time !== undefined) {
    fields.push(`scheduled_time = $${idx++}`);
    values.push(data.scheduled_time || null);
  }

  if (fields.length === 0) {
    return await getTrackedPostById(id);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE tb_post_tracker
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *
  `;
  const result = await db.query(query, values);
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
  getTrackedPostById,
  getDueScheduledPosts,
  getUpcomingScheduledPosts,
  createTrackedPost,
  setScheduledPostFbId,
  markPostAsPublished,
  markPostAsFailed,
  updateTrackedPostStatus,
  updateTrackedPostMetrics,
  updateTrackedPostData,
  updateTrackedPostCosts,
  deleteTrackedPost,
};

