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

/**
 * Checks whether a given source (File, URL string, or media item object) is a video.
 */
export const isVideoMedia = (source, file = null) => {
  if (file && file.type) {
    return file.type.startsWith('video/');
  }
  if (!source) return false;

  if (typeof source === 'object') {
    if (source.type && source.type.startsWith('video/')) return true;
    if (source.isVideo === true) return true;
    if (source.dimensions && source.dimensions.toLowerCase().includes('video')) return true;
    if (source.file && source.file.type && source.file.type.startsWith('video/')) return true;
    if (source.previewUrl && isVideoMedia(source.previewUrl)) return true;
    if (source.serverUrl && isVideoMedia(source.serverUrl)) return true;
  }

  if (typeof source === 'string') {
    const clean = source.split('?')[0].split('#')[0].toLowerCase();
    return /\.(mp4|mov|webm|avi|mkv|m4v|ogv)$/i.test(clean) || clean.startsWith('data:video/');
  }

  return false;
};

/**
 * Captures an initial frame from a video file or URL as a JPEG data URL.
 */
export const generateVideoThumbnail = (fileOrUrl) => {
  return new Promise((resolve) => {
    try {
      if (!fileOrUrl) return resolve(null);
      const isFile = typeof fileOrUrl !== 'string';
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
      video.src = url;

      let timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 4000);

      const cleanup = () => {
        clearTimeout(timer);
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
        if (isFile) {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
        }
      };

      video.onloadeddata = () => {
        // Seek to 0.2s or midpoint of a short video
        const target = Math.min(0.2, (video.duration || 1) / 2);
        video.currentTime = target;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.85);
          cleanup();
          resolve(thumb);
        } catch {
          cleanup();
          resolve(null);
        }
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
};

/**
 * Extracts dimensions and metadata for either an image or a video File.
 */
export const getMediaMetadata = async (file) => {
  if (!file) return { dimensions: '', isVideo: false, thumbUrl: null };

  const isVideo = file.type?.startsWith('video/') || false;

  if (isVideo) {
    const thumbUrl = await generateVideoThumbnail(file);
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadedmetadata = () => {
        const dim = video.videoWidth ? `Video · ${video.videoWidth} x ${video.videoHeight}` : 'Video';
        URL.revokeObjectURL(url);
        resolve({ dimensions: dim, isVideo: true, thumbUrl, duration: video.duration });
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ dimensions: 'Video', isVideo: true, thumbUrl, duration: null });
      };
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const dim = `${img.naturalWidth} x ${img.naturalHeight}`;
      URL.revokeObjectURL(url);
      resolve({ dimensions: dim, isVideo: false, thumbUrl: url });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ dimensions: 'Image', isVideo: false, thumbUrl: null });
    };
    img.src = url;
  });
};
