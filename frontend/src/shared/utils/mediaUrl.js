/**
 * Resolves any media URL format (Supabase CDN, Facebook CDN, JSON array, local /uploads)
 * into a valid, browser-loadable image URL.
 */
export const resolveMediaUrl = (rawMediaUrl) => {
  if (!rawMediaUrl) return null;

  // Handle JSON stringified arrays, e.g. '["/uploads/posts/1.png", "/uploads/posts/2.png"]'
  if (typeof rawMediaUrl === 'string' && rawMediaUrl.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawMediaUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return resolveMediaUrl(parsed[0]);
      }
    } catch {
      // Not valid JSON, continue normal checks
    }
  }

  // Absolute remote URLs (Supabase Storage, Facebook CDN, Unsplash, etc.) or local ObjectURL
  if (
    rawMediaUrl.startsWith('http://') ||
    rawMediaUrl.startsWith('https://') ||
    rawMediaUrl.startsWith('blob:') ||
    rawMediaUrl.startsWith('data:')
  ) {
    return rawMediaUrl;
  }

  // Relative server uploads (e.g. /uploads/posts/...)
  if (rawMediaUrl.startsWith('/uploads/')) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const serverOrigin = apiBase.replace(/\/api\/?$/, '');
    return `${serverOrigin}${rawMediaUrl}`;
  }

  return rawMediaUrl;
};

/**
 * Extracts all valid image URLs from a media field (supports single URL or JSON array)
 */
export const resolveAllMediaUrls = (rawMediaUrl) => {
  if (!rawMediaUrl) return [];

  if (typeof rawMediaUrl === 'string' && rawMediaUrl.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawMediaUrl);
      if (Array.isArray(parsed)) {
        return parsed.map(resolveMediaUrl).filter(Boolean);
      }
    } catch {
      // Fall through
    }
  }

  const single = resolveMediaUrl(rawMediaUrl);
  return single ? [single] : [];
};

/**
 * Client-Side Image Compression using HTML5 Canvas.
 * Shrinks huge phone/camera photos to max 1200px and ~150KB-250KB before uploading,
 * preserving memory and Supabase storage quota.
 */
export const compressImageFile = async (file, maxDimension = 1200, quality = 0.85) => {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  // If already under 300KB and not a huge dimension, no need to compress
  if (file.size < 300 * 1024 && !file.type.includes('png')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/jpeg' : file.type;
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file); // If compression didn't save space, return original
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
