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
        // Seek to 1s or 15% of video to avoid 0.0s black fade-in frames
        const dur = video.duration || 1;
        const target = Math.min(1.0, dur * 0.15);
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
 * Calculates optimal canvas dimensions preserving the video's exact natural aspect ratio.
 * Caps maximum dimension at maxDim (default 1920 for full HD) while maintaining exact proportions.
 */
export const calculateVideoAspectRatioDimensions = (videoWidth, videoHeight, maxDim = 1920) => {
  const vWidth = videoWidth || 720;
  const vHeight = videoHeight || 1280;
  let targetWidth = vWidth;
  let targetHeight = vHeight;

  if (vWidth > maxDim || vHeight > maxDim) {
    const ratio = vWidth / vHeight;
    if (ratio >= 1) {
      targetWidth = maxDim;
      targetHeight = Math.round(maxDim / ratio);
    } else {
      targetHeight = maxDim;
      targetWidth = Math.round(maxDim * ratio);
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    aspectRatio: vWidth / vHeight,
    isPortrait: vHeight > vWidth,
  };
};

/**
 * Extracts multiple suggested frames across the video duration for thumbnail selection.
 * Preserves the exact native aspect ratio of the video (9:16 vertical, 16:9 landscape, etc.).
 */
export const extractVideoFrames = (fileOrUrl, count = 8) => {
  return new Promise((resolve) => {
    try {
      if (!fileOrUrl) return resolve([]);
      const isFile = typeof fileOrUrl !== 'string';
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
      video.src = url;

      const frames = [];
      const timeout = setTimeout(() => {
        cleanup();
        resolve(frames);
      }, 15000);

      const cleanup = () => {
        clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onseeked = null;
        video.onerror = null;
        if (isFile) {
          try { URL.revokeObjectURL(url); } catch (_) {}
        }
      };

      video.onloadedmetadata = () => {
        const duration = video.duration || 1;
        // Generate timestamps avoiding the very start (often black) and very end
        const timestamps = [];
        for (let i = 0; i < count; i++) {
          const ratio = (i + 0.5) / count;
          // Clamp between 0.5s (or 5%) and duration - 0.2s
          const t = Math.max(0.5, Math.min(duration - 0.2, duration * ratio));
          timestamps.push(t);
        }

        const { width: targetW, height: targetH, isPortrait, aspectRatio } = calculateVideoAspectRatioDimensions(
          video.videoWidth,
          video.videoHeight,
          1920
        );

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        let currentIndex = 0;

        const processNext = () => {
          if (currentIndex >= timestamps.length) {
            cleanup();
            return resolve(frames);
          }
          video.currentTime = timestamps[currentIndex];
        };

        video.onseeked = () => {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
            frames.push({
              time: timestamps[currentIndex],
              url: dataUrl,
              index: currentIndex,
              width: targetW,
              height: targetH,
              isPortrait,
              aspectRatio,
            });
          } catch (e) {
            console.warn('Frame capture error:', e);
          }
          currentIndex++;
          processNext();
        };

        processNext();
      };

      video.onerror = () => {
        cleanup();
        resolve(frames);
      };
    } catch {
      resolve([]);
    }
  });
};

/**
 * Captures a single video frame at an exact timestamp.
 * Preserves the exact native aspect ratio of the video (9:16, 16:9, etc.).
 */
export const captureVideoFrameAtTime = (fileOrUrl, timeSeconds) => {
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

      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 5000);

      const cleanup = () => {
        clearTimeout(timer);
        video.onloadedmetadata = null;
        video.onseeked = null;
        video.onerror = null;
        if (isFile) {
          try { URL.revokeObjectURL(url); } catch (_) {}
        }
      };

      video.onloadedmetadata = () => {
        const clamped = Math.max(0, Math.min(video.duration || 1, timeSeconds));
        video.currentTime = clamped;
      };

      video.onseeked = () => {
        try {
          const { width: targetW, height: targetH } = calculateVideoAspectRatioDimensions(
            video.videoWidth,
            video.videoHeight,
            1920
          );
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
          cleanup();
          resolve(dataUrl);
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
 * Converts a data URL to a File object.
 */
export const dataUrlToFile = (dataUrl, filename = 'thumbnail.jpg') => {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    console.error('Failed to convert dataUrl to File:', err);
    return null;
  }
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
