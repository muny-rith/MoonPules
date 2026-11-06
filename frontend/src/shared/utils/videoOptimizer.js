import { compressImageFile } from './mediaUrl';

/**
 * Checks whether the current browser environment supports the WebCodecs API
 * for hardware-accelerated video/audio encoding and decoding.
 */
export const isWebCodecsSupported = () => {
  return (
    typeof window !== 'undefined' &&
    typeof window.VideoEncoder !== 'undefined' &&
    typeof window.VideoDecoder !== 'undefined'
  );
};

/**
 * Calculates optimal 1080p-capped dimensions preserving aspect ratio,
 * ensuring both width and height are even integers (required by H.264 encoders).
 */
export const calculateReelsDimensions = (origWidth, origHeight) => {
  const w = origWidth || 1080;
  const h = origHeight || 1920;
  const isPortrait = h >= w;

  let targetW = w;
  let targetH = h;

  if (isPortrait) {
    // Vertical video (9:16 or portrait): max 1080 wide, max 1920 high
    if (w > 1080 || h > 1920) {
      const scale = Math.min(1080 / w, 1920 / h);
      targetW = Math.round(w * scale);
      targetH = Math.round(h * scale);
    }
  } else {
    // Landscape video (16:9 or horizontal): max 1920 wide, max 1080 high
    if (w > 1920 || h > 1080) {
      const scale = Math.min(1920 / w, 1080 / h);
      targetW = Math.round(w * scale);
      targetH = Math.round(h * scale);
    }
  }

  // AVC/H.264 encoders require strictly even dimensions
  targetW = Math.floor(targetW / 2) * 2;
  targetH = Math.floor(targetH / 2) * 2;

  // Guarantee minimum valid dimensions
  targetW = Math.max(16, targetW);
  targetH = Math.max(16, targetH);

  return { width: targetW, height: targetH, isPortrait };
};

/**
 * Optimizes a video file directly on the client's device (phone, tablet, or PC)
 * using WebCodecs hardware acceleration via mediabunny.
 *
 * Produces a web-ready, fast-start MP4 (H.264 + AAC) perfectly sized for Facebook Reels.
 *
 * @param {File|Blob} file - The raw input video file (MP4, MOV, WebM, etc.)
 * @param {Object} options
 * @param {Function} [options.onProgress] - Callback (progressPercent: number, stats: object)
 * @returns {Promise<{ file: File, skipped: boolean, stats: object }>}
 */
export const optimizeVideoForReels = async (file, options = {}) => {
  const { onProgress } = options;

  if (!file || (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(file.name || ''))) {
    return { file, skipped: true, reason: 'not-a-video' };
  }

  // 1. Verify browser WebCodecs hardware acceleration support
  if (!isWebCodecsSupported()) {
    console.warn('[VideoOptimizer] WebCodecs API not available in this browser. Skipping client optimization (server will process).');
    return { file, skipped: true, reason: 'unsupported-browser' };
  }

  const startTime = performance.now();
  const originalSizeMB = file.size / (1024 * 1024);
  const isMp4 = file.type === 'video/mp4' || /\.mp4$/i.test(file.name);

  try {
    // Dynamically load mediabunny on-demand so initial page bundles remain light
    const {
      Input,
      Output,
      Conversion,
      ALL_FORMATS,
      BlobSource,
      BufferTarget,
      Mp4OutputFormat,
      Quality,
    } = await import('mediabunny');

    // 2. Open input file with mediabunny
    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    });

    const videoTrack = await input.getPrimaryVideoTrack().catch(() => null);
    if (!videoTrack) {
      console.warn('[VideoOptimizer] No primary video track found in file.');
      return { file, skipped: true, reason: 'no-video-track' };
    }

    const duration = await input.computeDuration().catch(() => 0);
    const origWidth = await videoTrack.getDisplayWidth().catch(() => videoTrack.codedWidth || 1080);
    const origHeight = await videoTrack.getDisplayHeight().catch(() => videoTrack.codedHeight || 1920);
    const codec = await videoTrack.getCodec().catch(() => null);

    // 3. Fast-path check: If already MP4 H.264, <= 1080p, and < 35MB, skip re-encoding
    const isSmallerThan1080p = Math.min(origWidth, origHeight) <= 1080 && Math.max(origWidth, origHeight) <= 1920;
    if (isMp4 && originalSizeMB < 35 && isSmallerThan1080p && codec === 'avc') {
      console.log(`[VideoOptimizer] ⚡ Video is already compliant MP4 H.264 (${originalSizeMB.toFixed(1)}MB, ${origWidth}x${origHeight}). Skipping re-encode.`);
      if (typeof onProgress === 'function') onProgress(100);
      return { file, skipped: true, reason: 'already-optimal' };
    }

    // 4. Calculate optimal target dimensions (1080p max, even dimensions)
    const { width: targetWidth, height: targetHeight } = calculateReelsDimensions(origWidth, origHeight);

    // Calculate dynamic target bitrate based on pixel area
    // 1080x1920 = ~3.5 Mbps, 720x1280 = ~2.2 Mbps
    const pixelCount = targetWidth * targetHeight;
    const standard1080pPixels = 1080 * 1920;
    const targetBitrate = Math.min(
      3_800_000,
      Math.max(1_800_000, Math.round((pixelCount / standard1080pPixels) * 3_500_000))
    );

    console.log(
      `[VideoOptimizer] 🎬 Starting client-side optimization: ${file.name} (${originalSizeMB.toFixed(1)}MB) -> ` +
      `${targetWidth}x${targetHeight} @ ${(targetBitrate / 1_000_000).toFixed(1)} Mbps...`
    );

    // 5. Configure MP4 output with Fast Start (moov atom at head of file)
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });

    // Check if audio is present
    const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);

    // 6. Initialize conversion pipeline
    const conversionConfig = {
      input,
      output,
      video: {
        codec: 'avc',
        width: targetWidth,
        height: targetHeight,
        fit: 'contain',
        quality: new Quality({
          bitrate: targetBitrate,
          bitrateMode: 'variable',
        }),
      },
    };

    if (audioTrack) {
      conversionConfig.audio = {
        codec: 'aac',
        quality: new Quality(128_000), // 128 kbps AAC
      };
    }

    const conversion = await Conversion.init(conversionConfig);

    if (!conversion.isValid) {
      console.warn('[VideoOptimizer] Conversion configuration not valid for this file.', conversion.discardedTracks);
      return { file, skipped: true, reason: 'invalid-conversion' };
    }

    // 7. Track progress
    if (typeof onProgress === 'function') {
      conversion.onProgress = (progress, processedTime) => {
        const pct = Math.min(99, Math.max(0, Math.round(progress * 100)));
        onProgress(pct, { processedTime, duration });
      };
    }

    // 8. Execute hardware encoding
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0) {
      console.warn('[VideoOptimizer] Output buffer is empty, falling back to original file.');
      return { file, skipped: true, reason: 'empty-output' };
    }

    const finalSizeMB = buffer.byteLength / (1024 * 1024);
    const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
    const reductionPct = Math.round((1 - finalSizeMB / originalSizeMB) * 100);

    console.log(
      `[VideoOptimizer] ✨ Done in ${elapsedSec}s! ${originalSizeMB.toFixed(1)}MB -> ${finalSizeMB.toFixed(1)}MB ` +
      `(${reductionPct > 0 ? '-' + reductionPct + '%' : 'format converted'})`
    );

    // If original was already MP4 and new file is inexplicably larger without downsizing, keep original
    if (isMp4 && finalSizeMB >= originalSizeMB && origWidth <= targetWidth && origHeight <= targetHeight) {
      if (typeof onProgress === 'function') onProgress(100);
      return { file, skipped: true, reason: 'original-smaller' };
    }

    // 9. Build final File object
    const outputName = file.name ? file.name.replace(/\.[^/.]+$/, '') + '.mp4' : 'reels_video.mp4';
    const optimizedFile = new File([buffer], outputName, {
      type: 'video/mp4',
      lastModified: Date.now(),
    });

    if (typeof onProgress === 'function') onProgress(100);

    return {
      file: optimizedFile,
      skipped: false,
      stats: {
        originalSizeMB: parseFloat(originalSizeMB.toFixed(2)),
        finalSizeMB: parseFloat(finalSizeMB.toFixed(2)),
        reductionPct,
        elapsedSec: parseFloat(elapsedSec),
        resolution: `${targetWidth}x${targetHeight}`,
      },
    };
  } catch (error) {
    console.error('[VideoOptimizer] Hardware compression error, gracefully falling back to original file:', error);
    return { file, skipped: true, reason: 'error', error };
  }
};

/**
 * Unified pipeline for processing any media file before upload.
 * - Hardware-accelerates and optimizes videos via WebCodecs API (mediabunny) for Facebook Reels
 * - Compresses high-res camera photos via HTML5 Canvas
 * - Emits granular progress events for smooth user feedback
 */
export const processMediaFileForUpload = async (file, isVideo = false, options = {}) => {
  const { onProgress } = options;

  const isVid =
    isVideo ||
    (file?.type && file.type.startsWith('video/')) ||
    /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(file?.name || '');

  if (isVid) {
    if (typeof onProgress === 'function') {
      onProgress({ percent: 0, text: '⚡ Optimizing video...' });
    }

    const result = await optimizeVideoForReels(file, {
      onProgress: (pct) => {
        if (typeof onProgress === 'function') {
          onProgress({
            percent: pct,
            text: pct < 100 ? `⚡ Optimizing ${pct}%...` : '⚡ Uploading...',
          });
        }
      },
    });

    return {
      file: result.file,
      isVideo: true,
      skipped: result.skipped,
      stats: result.stats || null,
      savedPct: result.stats?.reductionPct || 0,
    };
  }

  // Handle standard images
  const compressed = await compressImageFile(file, 1200, 0.85);
  return {
    file: compressed,
    isVideo: false,
    skipped: false,
    stats: null,
    savedPct: 0,
  };
};
