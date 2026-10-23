const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');

if (ffmpegInstaller?.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeInstaller?.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

/**
 * Extracts video and audio metadata using ffprobe
 */
const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
};

/**
 * Smart Tier Video Compressor
 *
 * 🟢 Tier 1: Small (< 35MB) & compliant (<= 1080p H.264)
 *    -> Skips compression! Uploads immediately in ~1s with 100% original quality.
 *
 * 🟡 Tier 2: Medium (35MB - 80MB)
 *    -> Light compression: CRF 24 with ~25MB ceiling.
 *
 * 🔴 Tier 3: Heavy (> 80MB or 4K/UHD)
 *    -> Dynamic rate control: Scales to 1080p, caps bitrate to guarantee ~20MB - 24MB output.
 */
const compressVideo = async (inputPath, customOutDir = null) => {
  const metadata = await getVideoMetadata(inputPath);
  const videoStream = metadata.streams?.find((s) => s.codec_type === 'video');
  const audioStream = metadata.streams?.find((s) => s.codec_type === 'audio');

  const inWidth = videoStream?.width || 1080;
  const inHeight = videoStream?.height || 1920;
  const inDuration = Math.max(1, metadata.format?.duration || 1);
  const inSize = metadata.format?.size || fs.statSync(inputPath).size || 0;
  const inSizeMB = inSize / (1024 * 1024);
  const codecName = (videoStream?.codec_name || '').toLowerCase();

  const isLargerThan1080p = inWidth > 1920 || inHeight > 1920 || (inWidth > 1080 && inHeight > 1080);

  // 🟢 TIER 1: File is already small (< 35MB), <= 1080p, and standard H.264
  if (inSizeMB < 35 && !isLargerThan1080p && codecName === 'h264') {
    console.log(`[VideoCompressor] ⚡ TIER 1 (< 35MB): ${path.basename(inputPath)} is ${inSizeMB.toFixed(2)} MB & 1080p H.264. Skipping compression for instant upload!`);
    return {
      outputPath: inputPath,
      filename: path.basename(inputPath),
      sizeBytes: inSize,
      duration: inDuration,
      skipped: true,
      tier: 'Tier 1 (Instant Passthrough)',
    };
  }

  const targetDir = customOutDir || path.dirname(inputPath);
  const cleanBase = path.basename(inputPath, path.extname(inputPath)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const outFilename = `compressed_${Date.now()}_${cleanBase}.mp4`;
  const outputPath = path.join(targetDir, outFilename);

  // Determine compression parameters based on size tier
  let crf = '24';
  let targetMaxMB = 24;
  let tierLabel = '';

  if (inSizeMB <= 80 && !isLargerThan1080p) {
    // 🟡 TIER 2: 35MB - 80MB
    tierLabel = 'Tier 2 (Moderate: 35MB-80MB)';
    crf = '24';
    targetMaxMB = 25;
  } else {
    // 🔴 TIER 3: > 80MB or 4K
    tierLabel = 'Tier 3 (Heavy > 80MB or 4K)';
    crf = '26';
    targetMaxMB = 22;
  }

  // Calculate target bitrate cap (kbps): (Target MB * 8192) / durationSeconds
  const maxBitrateKbps = Math.max(800, Math.min(4500, Math.floor((targetMaxMB * 8192) / inDuration)));
  const bufSizeKbps = maxBitrateKbps * 2;

  console.log(`[VideoCompressor] 🎬 ${tierLabel}:`);
  console.log(`   Source: ${path.basename(inputPath)} (${inSizeMB.toFixed(2)} MB, ${inWidth}x${inHeight}, ${inDuration.toFixed(1)}s)`);
  console.log(`   Target Cap: ~${targetMaxMB} MB (Max Bitrate: ${maxBitrateKbps} kbps, CRF ${crf})`);

  // Downscale filter that preserves exact aspect ratio, ensures even dimensions, and never upscales
  const scaleFilter = "scale='trunc(iw*min(1,min(1080/iw,1920/ih))/2)*2':'trunc(ih*min(1,min(1080/iw,1920/ih))/2)*2'";

  const outputOptions = [
    `-crf ${crf}`,
    `-maxrate ${maxBitrateKbps}k`,
    `-bufsize ${bufSizeKbps}k`,
    '-preset fast',
    '-vf', scaleFilter,
    '-pix_fmt yuv420p',
    '-movflags +faststart',
  ];

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .videoCodec('libx264')
      .outputOptions(outputOptions);

    if (audioStream) {
      command = command.audioCodec('aac').audioBitrate('128k');
    } else {
      command = command.noAudio();
    }

    command
      .on('progress', (progress) => {
        if (progress.percent && Math.round(progress.percent) % 25 === 0) {
          console.log(`[VideoCompressor] ⏳ Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('error', (err) => {
        console.error('[VideoCompressor] ❌ Compression error:', err.message);
        reject(err);
      })
      .on('end', () => {
        const stats = fs.statSync(outputPath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const savedPercent = Math.max(0, Math.round((1 - stats.size / inSize) * 100));
        console.log(`[VideoCompressor] ✅ Compressed in ${elapsed}s: ${inSizeMB.toFixed(2)} MB ➔ ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${savedPercent}% saved)`);
        resolve({
          outputPath,
          filename: outFilename,
          sizeBytes: stats.size,
          duration: inDuration,
          skipped: false,
          tier: tierLabel,
        });
      })
      .save(outputPath);
  });
};

module.exports = {
  getVideoMetadata,
  compressVideo,
};
