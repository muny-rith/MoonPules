import React, { useMemo } from 'react';
import {
  Layers,
  Plus,
  Image,
  Video,
  Radio,
  Check,
} from 'lucide-react';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { Button } from '../../../shared/components/ui';

/**
 * BrandTargetScheduleBar
 *
 * Operational Target Schedule Fulfillment bar (Option 3 Split Dual Tracks Architecture)
 * Clean 2-Row Balanced Matrix:
 * - Row 1 (Header): Brand Identity on Left, Sized-Up Split Progress Tracks on Right
 * - Row 2 (Footer): Target Breakdown Chips on Left, Status Legend Dots on Right
 */
export const BrandTargetScheduleBar = ({
  selectedBrandId = 'all',
  selectedBrand = null,
  monthNumber,
  yearNumber,
  calendarSlots = [],
  missionBrands = [],
  onSelectBrand,
  onOpenBlueprint,
}) => {
  const isMasterView = selectedBrandId === 'all';

  // =========================================================================
  // UNIFIED METRICS CALCULATION (OPTION 3: SPLIT DUAL TRACKS)
  // =========================================================================
  const metrics = useMemo(() => {
    const activeSlots = isMasterView
      ? calendarSlots
      : calendarSlots.filter((s) => String(s.brand_id) === String(selectedBrandId));

    // Base slots partitioned by content type
    const postSlots = activeSlots.filter((s) => s.content_type !== 'live');
    const liveSlots = activeSlots.filter((s) => s.content_type === 'live');

    // Posts metrics (Posters & Videos)
    const postsTarget = postSlots.length;
    const postsPublished = postSlots.filter(
      (s) => s.computed_status === 'completed' || s.computed_status === 'compensated'
    ).length;
    const postsScheduled = postSlots.filter((s) => s.computed_status === 'scheduled').length;
    const postsCovered = postsPublished + postsScheduled;
    const postsRemaining = Math.max(0, postsTarget - postsCovered);
    const postsPercent = postsTarget > 0 ? Math.round((postsCovered / postsTarget) * 100) : 0;
    const postsPubPercent = postsTarget > 0 ? Math.round((postsPublished / postsTarget) * 100) : 0;
    const postsSchedPercent = postsTarget > 0 ? Math.round((postsScheduled / postsTarget) * 100) : 0;

    // Lives metrics
    const livesTarget = liveSlots.length;
    const livesCompleted = liveSlots.filter(
      (s) => s.computed_status === 'completed' || s.computed_status === 'compensated'
    ).length;
    const livesScheduled = liveSlots.filter((s) => s.computed_status === 'scheduled').length;
    const livesCovered = livesCompleted + livesScheduled;
    const livesRemaining = Math.max(0, livesTarget - livesCovered);
    const livesPercent = livesTarget > 0 ? Math.round((livesCovered / livesTarget) * 100) : 0;

    // Content Type Breakdown
    const computeTypeStats = (typePred) => {
      const typeSlots = activeSlots.filter(typePred);
      const target = typeSlots.length;
      const scheduled = typeSlots.filter(
        (s) => s.computed_status === 'completed' || s.computed_status === 'compensated' || s.computed_status === 'scheduled'
      ).length;
      const published = typeSlots.filter(
        (s) => s.computed_status === 'completed' || s.computed_status === 'compensated'
      ).length;
      const remaining = Math.max(0, target - scheduled);
      return { target, scheduled, published, remaining, isMet: target > 0 && scheduled >= target };
    };

    const posters = computeTypeStats((s) => s.content_type === 'photo' || s.content_type === 'poster');
    const videos = computeTypeStats((s) => s.content_type === 'video' || s.content_type === 'reel');
    const lives = computeTypeStats((s) => s.content_type === 'live');

    return {
      hasBlueprint: activeSlots.length > 0,
      activeSlots,
      postsTarget,
      postsPublished,
      postsScheduled,
      postsCovered,
      postsRemaining,
      postsPercent,
      postsPubPercent,
      postsSchedPercent,
      livesTarget,
      livesCompleted,
      livesScheduled,
      livesCovered,
      livesRemaining,
      livesPercent,
      posters,
      videos,
      lives,
    };
  }, [calendarSlots, selectedBrandId, isMasterView]);

  const {
    hasBlueprint,
    postsTarget,
    postsPublished,
    postsScheduled,
    postsCovered,
    postsRemaining,
    postsPercent,
    postsPubPercent,
    postsSchedPercent,
    livesTarget,
    livesCompleted,
    livesScheduled,
    livesCovered,
    livesRemaining,
    livesPercent,
    posters,
    videos,
    lives,
  } = metrics;

  // Header Title & Meta
  const title = isMasterView
    ? 'All Contracted Brands (Master Schedule)'
    : selectedBrand?.brand_name || selectedBrand?.name || 'Selected Client Brand';

  const brandLogo = isMasterView ? null : (selectedBrand?.image_url || selectedBrand?.logo_url || selectedBrand?.logo);

  // Discrete Unit Blocks for Single Brand view
  const splitBlocks = useMemo(() => {
    if (!hasBlueprint || isMasterView) return { postList: [], liveList: [] };

    const postList = [];
    for (let i = 0; i < postsPublished; i++) postList.push({ type: 'published', label: `Published Post #${i + 1}` });
    for (let i = 0; i < postsScheduled; i++) postList.push({ type: 'scheduled', label: `Scheduled Post #${i + 1}` });
    for (let i = 0; i < postsRemaining; i++) postList.push({ type: 'unscheduled', label: `Unscheduled Post #${i + 1}` });

    const liveList = [];
    for (let i = 0; i < livesCompleted; i++) liveList.push({ type: 'live-done', label: `Completed Live #${i + 1}` });
    for (let i = 0; i < livesScheduled; i++) liveList.push({ type: 'scheduled', label: `Scheduled Live #${i + 1}` });
    for (let i = 0; i < livesRemaining; i++) liveList.push({ type: 'unscheduled', label: `Unscheduled Live #${i + 1}` });

    return { postList, liveList };
  }, [hasBlueprint, isMasterView, postsPublished, postsScheduled, postsRemaining, livesCompleted, livesScheduled, livesRemaining]);

  const contractedBrandsCount = missionBrands?.length || 18;

  return (
    <div className={`brand-target-bar card ${isMasterView ? 'is-master-view' : 'is-single-brand'}`}>
      {/* =====================================================================
          ROW 1: HEADER (BRAND META ON LEFT, SPLIT PROGRESS TRACKS ON RIGHT)
         ===================================================================== */}
      <div className="brand-target-header">
        {/* Left: Brand Identity & Target Deliverables */}
        <div className="brand-target-brand-meta">
          <div className={`brand-target-avatar-wrap ${isMasterView ? 'is-master' : ''}`}>
            {isMasterView ? (
              <Layers size={22} color="#2563eb" />
            ) : brandLogo ? (
              <SafeImage src={brandLogo} alt={title} className="brand-target-avatar-img" />
            ) : (
              <div className="brand-target-avatar-fallback">
                {title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="brand-target-title-wrap">
            <div className="brand-target-title-row">
              <span className="brand-target-brand-name">{title}</span>
            </div>
            <div className="brand-target-counts-summary">
              {isMasterView ? (
                <>
                  <span className="target-count-item">
                    <strong className="count-num">{contractedBrandsCount}</strong> Contracted Brands
                  </span>
                  <span className="count-dot">•</span>
                  <span className="target-count-item">
                    <strong className="count-num">{postsTarget}</strong> Target Posts
                  </span>
                  {livesTarget > 0 && (
                    <>
                      <span className="count-dot">•</span>
                      <span className="target-count-item">
                        <strong className="count-num">{livesTarget}</strong> Target Lives
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="target-count-item">
                    <strong className="count-num">{postsTarget}</strong> Target Posts
                  </span>
                  {livesTarget > 0 && (
                    <>
                      <span className="count-dot">•</span>
                      <span className="target-count-item">
                        <strong className="count-num">{livesTarget}</strong> Target Lives
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sized-Up Split Dual Tracks */}
        {hasBlueprint ? (
          <div className="brand-target-progress">
            {/* Row 1: Schedulable Posts Track */}
            <div className="split-track-row">
              <span className="split-track-label">Posts:</span>
              {isMasterView ? (
                <div className="brand-target-topright-track is-mini-track">
                  <div
                    className="brand-target-bar-fill is-published"
                    style={{ width: `${postsPubPercent}%` }}
                    title={`Published: ${postsPublished}/${postsTarget} (${postsPubPercent}%)`}
                  />
                  <div
                    className="brand-target-bar-fill is-scheduled"
                    style={{ width: `${postsSchedPercent}%` }}
                    title={`Scheduled: ${postsScheduled}/${postsTarget} (${postsSchedPercent}%)`}
                  />
                </div>
              ) : (
                <div className="blocks-pill-grid is-mini-pill-grid">
                  {splitBlocks.postList.map((block, idx) => (
                    <div key={idx} className={`block-pill is-mini-pill is-${block.type}`} title={block.label} />
                  ))}
                </div>
              )}
              <span className="split-track-pct">
                <strong>{postsPercent}%</strong> ({postsCovered}/{postsTarget})
              </span>
            </div>

            {/* Row 2: Live Streams Track */}
            {(isMasterView || livesTarget > 0) && (
              <div className="split-track-row">
                <span className="split-track-label">Lives:</span>
                {isMasterView ? (
                  <div className="brand-target-topright-track is-mini-track">
                    <div
                      className="brand-target-bar-fill is-live-done"
                      style={{ width: `${livesPercent}%` }}
                      title={`Lives Completed: ${livesCompleted}/${livesTarget} (${livesPercent}%)`}
                    />
                  </div>
                ) : (
                  <div className="blocks-pill-grid is-mini-pill-grid">
                    {splitBlocks.liveList.map((block, idx) => (
                      <div key={idx} className={`block-pill is-mini-pill is-${block.type}`} title={block.label} />
                    ))}
                  </div>
                )}
                <span className="split-track-pct">
                  <strong style={{ color: '#e11d48' }}>{livesPercent}%</strong> ({livesCovered}/{livesTarget})
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="brand-target-header-right">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={onOpenBlueprint}
              className="brand-target-btn-action"
            >
              Plan Blueprint
            </Button>
          </div>
        )}
      </div>

      {/* =====================================================================
          ROW 2: FOOTER (BREAKDOWN ON LEFT, STATUS LEGEND ON RIGHT)
         ===================================================================== */}
      {hasBlueprint && (
        <div className="brand-target-footer">
          {/* Left: Content Breakdown Chips */}
          <div className="brand-target-breakdown">
            <span className="breakdown-label">Target Breakdown:</span>

            {/* Posters */}
            <div className={`breakdown-chip type-poster ${posters.isMet ? 'is-met' : ''}`}>
              <Image size={13} className="chip-icon" />
              <span className="chip-type">Posters:</span>
              <strong className="chip-val">
                {posters.scheduled}/{posters.target}
              </strong>
              {posters.isMet && <Check size={12} className="chip-check" />}
            </div>

            {/* Videos */}
            <div className={`breakdown-chip type-video ${videos.isMet ? 'is-met' : ''}`}>
              <Video size={13} className="chip-icon" />
              <span className="chip-type">Videos:</span>
              <strong className="chip-val">
                {videos.scheduled}/{videos.target}
              </strong>
              {videos.isMet && <Check size={12} className="chip-check" />}
            </div>

            {/* Live Streams */}
            <div className={`breakdown-chip type-live ${lives.isMet ? 'is-met' : ''}`}>
              <Radio size={13} className="chip-icon" />
              <span className="chip-type">Lives:</span>
              <strong className="chip-val">
                {lives.scheduled}/{lives.target}
              </strong>
              {lives.isMet && <Check size={12} className="chip-check" />}
            </div>
          </div>

          {/* Right: Progress Status Legend */}
          <div className="brand-target-legend">
            <span className="label-legend">
              <span className="legend-dot is-published" /> {postsPublished} Published {isMasterView && `(${postsPubPercent}%)`}
            </span>
            <span className="label-legend">
              <span className="legend-dot is-scheduled" /> {postsScheduled} Scheduled {isMasterView && `(${postsSchedPercent}%)`}
            </span>
            {livesCompleted > 0 && (
              <span className="label-legend">
                <span className="legend-dot is-live-done" /> {livesCompleted} Lives Done {isMasterView && `(${livesPercent}%)`}
              </span>
            )}
            <span className="label-legend">
              <span className="legend-dot is-remaining" /> {postsRemaining + (livesTarget > 0 ? livesRemaining : 0)} Unscheduled
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
