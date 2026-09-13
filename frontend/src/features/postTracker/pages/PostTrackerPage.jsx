import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePostTracker } from '../hooks/usePostTracker';
import { PostStatusBadge } from '../components/PostStatusBadge';
import { InsightPanel } from '../components/InsightPanel';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useNavigate } from 'react-router-dom';
import { POST_STATUS } from '../constants';
import { Search, Filter, Calendar, ExternalLink, RefreshCw, BarChart2, DollarSign, Image as ImageIcon, Heart, MessageCircle, Share2, Edit2, Trash2, ChevronLeft, ChevronRight, Users, ChevronDown, Eye, TrendingUp, Send, Award } from 'lucide-react';

import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { PostTrackerTableSkeleton, PostTrackerMobileSkeleton } from '../../../shared/components/skeletons';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import axios from 'axios';
import api from '../../../shared/utils/apiClient';

const FacebookIcon = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const FilterDropdown = ({ icon: Icon, value, options, onChange, minWidth = '130px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '13px',
          backgroundColor: 'white',
          color: '#334155',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth,
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          whiteSpace: 'nowrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icon && <Icon size={14} style={{ color: '#64748b' }} />}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown size={14} style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          minWidth: '100%',
          zIndex: 50,
          overflow: 'hidden'
        }}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                color: value === option.value ? '#2563eb' : '#475569',
                backgroundColor: value === option.value ? '#eff6ff' : 'transparent',
                fontWeight: value === option.value ? 600 : 400,
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = value === option.value ? '#eff6ff' : '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === option.value ? '#eff6ff' : 'transparent'}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const PostTrackerPage = () => {
  const navigate = useNavigate();
  const { posts, loading, error, updatePost, deletePost, publishNow, reload, triggerSync } = usePostTracker();
  const [publishingId, setPublishingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [postsProfit, setPostsProfit] = useState({});

  const handlePublishNow = async (postId) => {
    if (!window.confirm('Publish this scheduled post to Facebook immediately?')) return;
    try {
      setPublishingId(postId);
      await publishNow(postId);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to publish post');
    } finally {
      setPublishingId(null);
    }
  };

  useEffect(() => {
    const fetchProfit = async () => {
      try {
        const res = await api.get('/profit/dashboard?range=all');
        if (res.data && res.data.data && res.data.data.all_posts_profit) {
          const profitMap = {};
          res.data.data.all_posts_profit.forEach(p => {
            profitMap[p.post_id] = p;
          });
          setPostsProfit(profitMap);
        }
      } catch (err) {
        console.error('Failed to load profit data for posts', err);
      }
    };
    if (posts && posts.length > 0) {
      fetchProfit();
    }
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter(post => {
      const matchesSearch =
        post.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.page_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || platformFilter === 'facebook';

      let matchesDate = true;
      if (dateFilter === '7days' && post.published_time) {
        matchesDate = new Date(post.published_time) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === '30days' && post.published_time) {
        matchesDate = new Date(post.published_time) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      return matchesSearch && matchesStatus && matchesPlatform && matchesDate;
    });
  }, [posts, searchTerm, statusFilter, platformFilter, dateFilter]);

  const totalPages = Math.ceil(filteredPosts.length / rowsPerPage);
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredPosts.slice(start, start + rowsPerPage);
  }, [filteredPosts, currentPage, rowsPerPage]);

  const summary = useMemo(() => {
    if (!posts) return { total: 0, views: 0, reach: 0, engagements: 0 };
    return posts.reduce((acc, post) => {
      acc.total += 1;
      acc.views += parseInt(post.views_count) || 0;
      acc.reach += parseInt(post.reach_count) || 0;
      acc.engagements += (parseInt(post.likes_count) || 0) + (parseInt(post.comments_count) || 0) + (parseInt(post.shares_count) || 0);
      return acc;
    }, { total: 0, views: 0, reach: 0, engagements: 0 });
  }, [posts]);

  const handleDeletePost = async (id) => {
    try {
      await deletePost(id);
    } catch (err) {
      throw err;
    }
  };

  if (error) return <div className="alert-error-banner" style={{ margin: '24px' }}>Error: {error}</div>;

  return (
    <div>
      <div className="tasks-page-header" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ margin: '0', fontSize: '24px', textAlign: "left", alignSelf: "start" }}>Moon Pulse Tracker</h1>

        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap', gap: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' }}>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              <Eye size={16} color="#3b82f6" /> Total Views
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
              {summary.views.toLocaleString()}
            </div>
          </div>

          <div className="desktop-only" style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }}></div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              <Users size={16} color="#8b5cf6" /> Total Reach
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
              {summary.reach.toLocaleString()}
            </div>
          </div>

          <div className="desktop-only" style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }}></div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              <TrendingUp size={16} color="#ef4444" /> Avg. Engagement
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
              {summary.reach > 0 ? ((summary.engagements / summary.reach) * 100).toFixed(1) : '0.0'}%
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: "center", alignSelf: "end" }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', opacity: isSyncing ? 0.7 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer' }} disabled={isSyncing} onClick={async () => {
            setIsSyncing(true);
            await triggerSync();
            setIsSyncing(false);
          }}>
            <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} /> {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            className="btn-primary"
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/tasks/create')}
          >
            <Send size={15} /> Create & Schedule Post
          </button>
        </div>
      </div>

      <div className="table-card" style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff'
      }}>
        <div className="toolbar-header-row" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by product or page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '13px', width: '100%', padding: '10px 16px 10px 40px', borderRadius: '24px', border: '1px solid var(--border-color)' }}
            />
          </div>

          <div className="toolbar-filter-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterDropdown
              icon={Filter}
              value={platformFilter}
              options={[
                { value: 'all', label: 'All Platforms' },
                { value: 'facebook', label: 'Facebook' }
              ]}
              onChange={(val) => { setPlatformFilter(val); setCurrentPage(1); }}
            />
            <FilterDropdown
              icon={Calendar}
              value={dateFilter}
              options={[
                { value: 'all', label: 'All Time' },
                { value: '7days', label: 'Last 7 Days' },
                { value: '30days', label: 'Last 30 Days' }
              ]}
              onChange={(val) => { setDateFilter(val); setCurrentPage(1); }}
            />
            <FilterDropdown
              value={statusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'published', label: 'Published' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'failed', label: 'Failed' },
                { value: 'archived', label: 'Archived' }
              ]}
              onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="desktop-only" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Post Content</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Platform</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Dates</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Views</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Reach</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Engagements</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Costs</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Est. Profit</th>
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (!posts || posts.length === 0) ? (
                <PostTrackerTableSkeleton rowCount={5} />
              ) : paginatedPosts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <tr style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          <SafeImage
                            src={post.media_url || post.product_image || `https://ui-avatars.com/api/?name=${post.product_name || 'PR'}&background=c7d2fe&color=3730a3&rounded=false`}
                            alt={post.product_name || 'product'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fallbackText=""
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: '14px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {post.tracking_type === 'brand' || (!post.product_id && post.brand_id) ? (
                              <>
                                <span style={{ color: '#16a34a' }}>Brand: </span>
                                <span style={{ fontSize: "16px" }}>{post.brand_name || post.product_name || 'Brand Catalog'}</span>
                              </>
                            ) : (
                              <span style={{ fontSize: "16px" }}>{post.product_name || `Target #${post.product_id || post.brand_id}`}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{post.page_name || post.page_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FacebookIcon size={24} />
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}><PostStatusBadge status={post.status} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '13px', color: '#334155' }}>
                          {post.published_time
                            ? new Date(post.published_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : post.scheduled_time
                              ? new Date(post.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: post.status === 'failed' ? '#dc2626' : post.status === 'scheduled' ? '#d97706' : '#94a3b8' }}>
                          {post.status === 'failed'
                            ? <span title={post.publish_error || 'Publishing failed'} style={{ cursor: 'help' }}>⚠️ {post.publish_error ? (post.publish_error.length > 35 ? post.publish_error.slice(0, 35) + '…' : post.publish_error) : 'Failed'}</span>
                            : post.published_time
                              ? new Date(post.published_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                              : post.scheduled_time
                                ? `⏰ ${new Date(post.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                                : 'Pending'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#6366f1' }}>
                        {post.views_count ? post.views_count.toLocaleString() : '-'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0ea5e9' }}>
                        {post.reach_count ? post.reach_count.toLocaleString() : '-'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', fontSize: '13px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Likes"><Heart size={14} color="#f43f5e" /> {post.likes_count || 0}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Comments"><MessageCircle size={14} color="#f59e0b" /> {post.comments_count || 0}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Shares"><Share2 size={14} color="#10b981" /> {post.shares_count || 0}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                          ${((parseFloat(post.content_cost) || 0) + (parseFloat(post.ad_spend) || 0)).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Content: ${parseFloat(post.content_cost || 0).toFixed(0)} | Ads: ${parseFloat(post.ad_spend || 0).toFixed(0)}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                        ${(postsProfit[post.id]?.revenue !== undefined ? postsProfit[post.id].revenue : 0).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      {(() => {
                        const profitData = postsProfit[post.id];
                        const totalCost = (parseFloat(post.content_cost) || 0) + (parseFloat(post.ad_spend) || 0);
                        const revenue = profitData?.revenue !== undefined ? profitData.revenue : 0;
                        const netProfit = profitData?.net_profit !== undefined ? profitData.net_profit : (revenue - totalCost);
                        const roi = profitData?.roi !== undefined
                          ? profitData.roi
                          : (totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : 0);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                              {netProfit < 0 ? `-$${Math.abs(netProfit).toFixed(2)}` : `$${netProfit.toFixed(2)}`}
                            </div>
                            {totalCost > 0 && (
                              <div style={{
                                fontSize: '11px',
                                color: roi >= 0 ? '#10b981' : '#ef4444',
                                fontWeight: 600,
                                backgroundColor: roi >= 0 ? '#d1fae5' : '#fee2e2',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {roi >= 0 ? '+' : ''}{Math.round(roi)}% ROI
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {post.status !== POST_STATUS.PUBLISHED && (
                          <button
                            title={post.status === 'failed' ? 'Retry Publishing to Facebook' : 'Publish to Facebook Now'}
                            onClick={() => handlePublishNow(post.id)}
                            disabled={publishingId === post.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              color: '#16a34a',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              cursor: publishingId === post.id ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Send size={13} className={publishingId === post.id ? 'spin-animation' : ''} />
                          </button>
                        )}
                        {post.status === POST_STATUS.PUBLISHED && post.fb_post_id && (
                          <a
                            href={`https://facebook.com/${post.fb_post_id}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Visit Facebook Post"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#3b82f6', backgroundColor: '#eff6ff', transition: 'all 0.2s' }}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          title="Edit Post"
                          onClick={() => navigate(`/tasks/edit/${post.id}`)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#64748b', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          title="Delete Post"
                          onClick={() => setPostToDelete(post)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              {!loading && filteredPosts.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    No posts matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="mobile-only" style={{ padding: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && (!posts || posts.length === 0) ? (
            <PostTrackerMobileSkeleton cardCount={6} />
          ) : paginatedPosts.map((post) => {
            const profitData = postsProfit[post.id];
            const totalCost = (parseFloat(post.content_cost) || 0) + (parseFloat(post.ad_spend) || 0);
            const revenue = profitData?.revenue !== undefined ? profitData.revenue : 0;
            const netProfit = profitData?.net_profit !== undefined ? profitData.net_profit : (revenue - totalCost);
            const roi = profitData?.roi !== undefined
              ? profitData.roi
              : (totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : 0);

            return (
              <div key={`mob-${post.id}`} className="task-mobile-card">
                {/* Header */}
                <div className="task-mob-header">
                  <div className="task-mob-product-wrap">
                    <div className="task-mob-thumb">
                      <SafeImage
                        src={post.media_url || post.product_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`}
                        alt={post.product_name || 'product'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        fallbackText=""
                      />
                    </div>
                    <div className="task-mob-info">
                      <div className="task-mob-title">
                        {post.tracking_type === 'brand' || (!post.product_id && post.brand_id) ? (
                          <>
                            <span style={{ color: '#16a34a' }}>Brand: </span>
                            <span>{post.brand_name || post.product_name || 'Brand Catalog'}</span>
                          </>
                        ) : (
                          <span>{post.product_name || `Target #${post.product_id || post.brand_id}`}</span>
                        )}
                      </div>
                      <div className="task-mob-sub">
                        <FacebookIcon size={13} />
                        <span>{post.page_name || post.page_id}</span>
                      </div>
                    </div>
                  </div>
                  <PostStatusBadge status={post.status} />
                </div>

                {/* Metrics Grid */}
                <div className="task-mob-metrics-grid">
                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Views / Reach</span>
                    <span className="task-mob-metric-val">
                      <span style={{ color: '#6366f1' }}>{post.views_count ? post.views_count.toLocaleString() : '0'}</span>
                      <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                      <span style={{ color: '#0ea5e9' }}>{post.reach_count ? post.reach_count.toLocaleString() : '0'}</span>
                    </span>
                  </div>

                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Engagements</span>
                    <div className="task-mob-engagements">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Heart size={11} color="#f43f5e" /> {post.likes_count || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MessageCircle size={11} color="#f59e0b" /> {post.comments_count || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Share2 size={11} color="#10b981" /> {post.shares_count || 0}</span>
                    </div>
                  </div>

                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Cost / Revenue</span>
                    <span className="task-mob-metric-val">
                      ${totalCost.toFixed(0)}
                      <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                      <span style={{ color: '#10b981' }}>${revenue.toFixed(0)}</span>
                    </span>
                  </div>

                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Net Profit / ROI</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                        {netProfit < 0 ? `-$${Math.abs(netProfit).toFixed(2)}` : `$${netProfit.toFixed(2)}`}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor: roi >= 0 ? '#ecfdf5' : '#fee2e2',
                        color: roi >= 0 ? '#059669' : '#dc2626'
                      }}>
                        {roi >= 0 ? `+${roi.toFixed(0)}%` : `${roi.toFixed(0)}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Date & Actions */}
                <div className="task-mob-footer">
                  <div className="task-mob-date">
                    <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {post.published_time
                      ? new Date(post.published_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : post.scheduled_time
                        ? `⏰ ${new Date(post.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Pending'}
                  </div>
                  <div className="task-mob-actions">
                    {post.post_url && (
                      <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="btn-icon-action" title="View on FB">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={() => navigate(`/tasks/edit/${post.id}`)} className="btn-icon-action" title="Edit Post">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setPostToDelete(post)} className="btn-icon-action delete" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && filteredPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
              No posts matched your criteria.
            </div>
          )}
        </div>

        {filteredPosts.length > 0 && (
          <div className="tasks-pagination-bar" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'white', color: '#334155', fontWeight: 500 }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b' }}>
              <span>
                {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, filteredPosts.length)} of {filteredPosts.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#94a3b8' : '#334155' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#94a3b8' : '#334155' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        post={postToDelete}
        onConfirm={handleDeletePost}
      />
    </div>
  );
};
