import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Sliders,
  Sparkles,
  Check,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import {
  extractVideoFrames,
  captureVideoFrameAtTime,
  dataUrlToFile,
} from '../../../shared/utils/mediaUrl';
import './VideoThumbnailPicker.css';

export const VideoThumbnailPicker = ({
  videoSource, // File, Blob, or string URL
  currentThumbUrl = null,
  onThumbnailSelect, // ({ url, file, type }) => void
}) => {
  const [activeTab, setActiveTab] = useState('suggested'); // 'suggested' | 'frame' | 'upload'
  const [frames, setFrames] = useState([]);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [selectedThumb, setSelectedThumb] = useState(currentThumbUrl);
  const [isPortrait, setIsPortrait] = useState(true);

  // Scrubber state
  const [scrubberTime, setScrubberTime] = useState(1);
  const [videoDuration, setVideoDuration] = useState(10);
  const [scrubbingPreview, setScrubbingPreview] = useState(null);
  const [isScrubbingLoading, setIsScrubbingLoading] = useState(false);

  // Custom upload state
  const [customThumbPreview, setCustomThumbPreview] = useState(null);
  const fileInputRef = useRef(null);
  const stripRef = useRef(null);

  // Load suggested frames whenever videoSource changes
  useEffect(() => {
    if (!videoSource) return;

    let isMounted = true;
    setLoadingFrames(true);

    // Get video duration and native aspect ratio
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    const tempUrl = typeof videoSource === 'string' ? videoSource : URL.createObjectURL(videoSource);
    tempVideo.src = tempUrl;
    tempVideo.onloadedmetadata = () => {
      if (isMounted) {
        setVideoDuration(tempVideo.duration || 10);
        setScrubberTime(Math.min(1.0, (tempVideo.duration || 10) * 0.15));
        const vH = tempVideo.videoHeight || 0;
        const vW = tempVideo.videoWidth || 0;
        if (vH && vW) {
          setIsPortrait(vH >= vW);
        }
      }
      if (typeof videoSource !== 'string') {
        try { URL.revokeObjectURL(tempUrl); } catch (_) {}
      }
    };

    extractVideoFrames(videoSource, 9)
      .then((extracted) => {
        if (!isMounted) return;
        setFrames(extracted);
        if (extracted.length > 0 && typeof extracted[0].isPortrait === 'boolean') {
          setIsPortrait(extracted[0].isPortrait);
        }
        // If no thumb currently selected, automatically select the 2nd frame (usually great non-black shot)
        if (extracted.length > 0 && !currentThumbUrl) {
          const defaultFrame = extracted[1] || extracted[0];
          setSelectedThumb(defaultFrame.url);
          const fileObj = dataUrlToFile(defaultFrame.url, `thumb_${Date.now()}.jpg`);
          onThumbnailSelect?.({
            url: defaultFrame.url,
            file: fileObj,
            type: 'suggested',
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to extract video frames:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingFrames(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoSource]);

  // Keep internal selected thumb in sync if prop changes from outside
  useEffect(() => {
    if (currentThumbUrl && currentThumbUrl !== selectedThumb) {
      setSelectedThumb(currentThumbUrl);
    }
  }, [currentThumbUrl]);

  // Handle clicking a frame from the filmstrip
  const handleSelectSuggested = (frame) => {
    setSelectedThumb(frame.url);
    const fileObj = dataUrlToFile(frame.url, `thumb_frame_${Math.round(frame.time)}s.jpg`);
    onThumbnailSelect?.({
      url: frame.url,
      file: fileObj,
      type: 'suggested',
    });
  };

  // Handle Scrubbing
  const handleScrubberChange = async (e) => {
    const time = parseFloat(e.target.value);
    setScrubberTime(time);
    setIsScrubbingLoading(true);
    try {
      const snap = await captureVideoFrameAtTime(videoSource, time);
      if (snap) {
        setScrubbingPreview(snap);
      }
    } finally {
      setIsScrubbingLoading(false);
    }
  };

  const handleApplyScrubbedFrame = () => {
    if (!scrubbingPreview) return;
    setSelectedThumb(scrubbingPreview);
    const fileObj = dataUrlToFile(scrubbingPreview, `thumb_scrub_${Math.round(scrubberTime)}s.jpg`);
    onThumbnailSelect?.({
      url: scrubbingPreview,
      file: fileObj,
      type: 'frame',
    });
  };

  // Handle Custom Upload
  const handleCustomImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCustomThumbPreview(previewUrl);
    setSelectedThumb(previewUrl);

    onThumbnailSelect?.({
      url: previewUrl,
      file,
      type: 'upload',
    });
  };

  // Horizontal scroll navigation
  const handleScroll = (direction) => {
    if (!stripRef.current) return;
    const scrollAmount = direction === 'left' ? -240 : 240;
    stripRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const formatSeconds = (sec) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="meta-card fb-thumb-card">
      {/* ── Top Header matching Meta Business Suite ── */}
      <div className="fb-thumb-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="meta-card-title fb-thumb-title">Thumbnail</h3>
            <span className="fb-thumb-ratio-badge">
              {isPortrait ? '9:16 Reel' : '16:9 Video'}
            </span>
          </div>
          <p className="meta-card-desc fb-thumb-desc">
            Choose thumbnail • Full native aspect ratio (zero distortion)
          </p>
        </div>

        {/* Arrow Navigation for filmstrip */}
        {activeTab !== 'upload' && frames.length > 0 && (
          <div className="fb-thumb-arrows">
            <button
              type="button"
              className="fb-thumb-arrow-btn"
              onClick={() => handleScroll('left')}
              title="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="fb-thumb-arrow-btn"
              onClick={() => handleScroll('right')}
              title="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Tab Switcher: Choose suggested | Choose frame | Upload image ── */}
      <div className="fb-thumb-nav-tabs">
        <button
          type="button"
          className={`fb-thumb-tab-btn ${activeTab === 'suggested' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggested')}
        >
          <Sparkles size={14} /> Choose suggested
        </button>
        <button
          type="button"
          className={`fb-thumb-tab-btn ${activeTab === 'frame' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('frame');
            if (!scrubbingPreview && frames.length > 0) {
              setScrubbingPreview(frames[0].url);
            }
          }}
        >
          <Sliders size={14} /> Choose frame
        </button>
        <button
          type="button"
          className={`fb-thumb-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={14} /> Upload image
        </button>
      </div>

      {/* ── TAB 1: CHOOSE SUGGESTED ── */}
      {activeTab === 'suggested' && (
        <div className="fb-thumb-filmstrip-wrap">
          {loadingFrames ? (
            <div className="fb-thumb-loading-strip">
              <Loader2 size={18} className="meta-spin-icon" style={{ color: '#1877f2' }} />
              <span>Generating video thumbnails...</span>
            </div>
          ) : frames.length === 0 ? (
            <div className="fb-thumb-empty-state">
              <span>Could not generate frame suggestions. Try "Choose frame" or "Upload image".</span>
            </div>
          ) : (
            <div className="fb-thumb-filmstrip" ref={stripRef}>
              {frames.map((frame) => {
                const isSelected = selectedThumb === frame.url;
                return (
                  <div
                    key={frame.index}
                    className={`fb-thumb-card-item ${isPortrait ? 'portrait' : 'landscape'} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectSuggested(frame)}
                  >
                    <img src={frame.url} alt={`Frame at ${formatSeconds(frame.time)}`} />
                    <span className="fb-thumb-time-tag">{formatSeconds(frame.time)}</span>
                    {isSelected && (
                      <div className="fb-thumb-selected-check">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CHOOSE FRAME (SCRUBBER) ── */}
      {activeTab === 'frame' && (
        <div className="fb-thumb-scrubber-box">
          <div className="fb-thumb-scrubber-top">
            <div className={`fb-thumb-scrubber-preview-wrap ${isPortrait ? 'portrait' : 'landscape'}`}>
              {isScrubbingLoading && (
                <div className="fb-thumb-scrubber-loading">
                  <Loader2 size={20} className="meta-spin-icon" color="#ffffff" />
                </div>
              )}
              {scrubbingPreview || selectedThumb ? (
                <img
                  src={scrubbingPreview || selectedThumb}
                  alt="Scrubbed frame"
                  className="fb-thumb-scrubber-img"
                />
              ) : (
                <div className="fb-thumb-scrubber-placeholder">
                  <span>Drag slider to pick a frame</span>
                </div>
              )}
            </div>

            <div className="fb-thumb-scrubber-controls">
              <div className="fb-thumb-scrubber-timer">
                <span>Timestamp: </span>
                <strong>{formatSeconds(scrubberTime)}</strong> / {formatSeconds(videoDuration)}
              </div>

              <input
                type="range"
                min="0.1"
                max={Math.max(1, videoDuration - 0.1)}
                step="0.1"
                value={scrubberTime}
                onChange={handleScrubberChange}
                className="fb-thumb-slider"
              />

              <button
                type="button"
                className="fb-thumb-apply-frame-btn"
                onClick={handleApplyScrubbedFrame}
                disabled={!scrubbingPreview}
              >
                <Check size={14} /> Use this frame as thumbnail
              </button>
            </div>
          </div>

          {/* Quick jump frames below scrubber */}
          {frames.length > 0 && (
            <div className="fb-thumb-mini-filmstrip">
              <span className="fb-thumb-mini-label">Quick jumps:</span>
              <div className="fb-thumb-filmstrip" ref={stripRef} style={{ maxHeight: isPortrait ? '90px' : '65px' }}>
                {frames.map((frame) => (
                  <div
                    key={frame.index}
                    className={`fb-thumb-card-item mini ${isPortrait ? 'portrait' : 'landscape'} ${selectedThumb === frame.url ? 'selected' : ''}`}
                    onClick={() => {
                      setScrubberTime(frame.time);
                      setScrubbingPreview(frame.url);
                      handleSelectSuggested(frame);
                    }}
                  >
                    <img src={frame.url} alt={`Jump ${formatSeconds(frame.time)}`} />
                    <span className="fb-thumb-time-tag">{formatSeconds(frame.time)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: UPLOAD CUSTOM IMAGE ── */}
      {activeTab === 'upload' && (
        <div className="fb-thumb-upload-box">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCustomImageFile}
          />

          {customThumbPreview || (selectedThumb && !selectedThumb.startsWith('data:image')) ? (
            <div className={`fb-thumb-upload-preview-card ${isPortrait ? 'portrait' : 'landscape'}`}>
              <img
                src={customThumbPreview || selectedThumb}
                alt="Custom thumbnail"
                className="fb-thumb-upload-img"
              />
              <div className="fb-thumb-upload-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                  <Check size={16} /> Custom thumbnail active
                </div>
                <div style={{ fontSize: '11px', color: '#65676b', marginTop: '2px' }}>
                  Will be uploaded as the official Facebook video cover
                </div>
                <button
                  type="button"
                  className="fb-thumb-change-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change image
                </button>
              </div>
            </div>
          ) : (
            <div
              className="fb-thumb-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="fb-thumb-dropzone-icon">
                <ImageIcon size={28} />
              </div>
              <div className="fb-thumb-dropzone-title">Upload a custom thumbnail</div>
              <div className="fb-thumb-dropzone-desc">
                JPG, PNG, or WEBP ({isPortrait ? '9:16 vertical recommended for Reels' : '16:9 landscape recommended'})
              </div>
              <button type="button" className="fb-thumb-browse-btn">
                Browse file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
