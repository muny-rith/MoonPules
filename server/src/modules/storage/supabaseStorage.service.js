const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const env = require('../../config/env');

let supabase = null;
if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });
}

const BUCKET_NAME = env.SUPABASE_BUCKET || 'post-media';

/**
 * Ensures the public storage bucket exists if service_role permissions allow
 */
const ensureBucketExists = async () => {
  if (!supabase) return;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.warn('[SupabaseStorage] List buckets error:', error.message);
      return;
    }
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      console.log(`[SupabaseStorage] Creating public bucket '${BUCKET_NAME}'...`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      if (createError) {
        console.warn(`[SupabaseStorage] Could not auto-create bucket '${BUCKET_NAME}':`, createError.message);
      } else {
        console.log(`[SupabaseStorage] ✅ Bucket '${BUCKET_NAME}' created successfully.`);
      }
    }
  } catch (err) {
    console.warn('[SupabaseStorage] ensureBucketExists check skipped:', err.message);
  }
};

// Run check on startup if client initialized
if (supabase) {
  ensureBucketExists().catch(() => {});
}

/**
 * Uploads a file buffer directly to Supabase Storage.
 * Falls back to local disk if Supabase is not configured.
 */
const uploadBuffer = async (buffer, filename, mimeType = 'image/jpeg') => {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `posts/${Date.now()}_${cleanFilename}`;

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      return publicData.publicUrl;
    } catch (err) {
      console.error('[SupabaseStorage] Upload failed, falling back to local storage:', err.message);
    }
  } else {
    console.warn('[SupabaseStorage] SUPABASE_SERVICE_ROLE_KEY not configured. Falling back to local disk storage.');
  }

  // Fallback to local server disk storage
  const uploadDir = path.join(__dirname, '../../../uploads/posts');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localFileName = `fallback_${Date.now()}_${cleanFilename}`;
  const localFilePath = path.join(uploadDir, localFileName);
  fs.writeFileSync(localFilePath, buffer);
  return `/uploads/posts/${localFileName}`;
};

/**
 * Downloads an image from a remote URL (e.g. Facebook Graph API CDN)
 * and uploads it permanently to Supabase Storage.
 */
const syncImageFromUrl = async (remoteUrl, destinationFilename) => {
  if (!remoteUrl) return null;

  try {
    const response = await axios.get(remoteUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MoonPulse/1.0',
      },
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const filename = destinationFilename || `fb_media_${Date.now()}.jpg`;

    return await uploadBuffer(buffer, filename, contentType);
  } catch (err) {
    console.warn(`[SupabaseStorage] Failed to download and cache remote image ${remoteUrl}:`, err.message);
    // Return original URL as graceful fallback
    return remoteUrl;
  }
};

module.exports = {
  uploadBuffer,
  syncImageFromUrl,
  ensureBucketExists,
};
