import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePostTracker } from '../hooks/usePostTracker';
import { PostStatusBadge } from '../components/PostStatusBadge';
import { InsightPanel } from '../components/InsightPanel';
import { MarkPostModal } from '../components/MarkPostModal';
import { EditTrackedPostModal } from '../components/EditTrackedPostModal';
import { POST_STATUS } from '../constants';
import { Search, Filter, Calendar, ExternalLink, RefreshCw, BarChart2, DollarSign, Image as ImageIcon, Heart, MessageCircle, Share2, Edit2, Trash2, ChevronLeft, ChevronRight, Users, ChevronDown, Eye, TrendingUp } from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
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
  const { posts, loading, error, addPost, updatePost, deletePost, reload } = usePostTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [postsProfit, setPostsProfit] = useState({});

  useEffect(() => {
    const fetchProfit = async () => {
      try {
        const res = await api.get('/profit/dashboard');
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

  const handlePostMarked = (newPost) => {
  };

  const handleDeletePost = async (id) => {
    if (window.confirm('Are you sure you want to stop tracking this post?')) {
      try {
        await deletePost(id);
      } catch (err) {
        alert(err.message || 'Failed to delete post');
      }
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
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={reload}>
            <RefreshCw size={14} /> Sync Now
          </button>
          <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => setIsModalOpen(true)}>
            Mark Post
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
                { value: 'scheduled', label: 'Scheduled' }
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
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={`skeleton-${i}`}>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px' }}><Skeleton width={32} height={32} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Skeleton width="120px" height={14} />
                          <Skeleton width="80px" height={12} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}><Skeleton width={24} height={24} style={{ margin: '0 auto' }} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width="70px" height={24} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width="90px" height={14} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><Skeleton width="40px" height={14} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><Skeleton width="40px" height={14} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><Skeleton width="80px" height={14} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><Skeleton width="60px" height={14} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><Skeleton width="50px" height={14} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><Skeleton width="60px" height={24} style={{ marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <Skeleton width={28} height={28} />
                        <Skeleton width={28} height={28} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedPosts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <tr style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          <img
                            src={post.product_image || `https://ui-avatars.com/api/?name=${post.product_name || 'PR'}&background=c7d2fe&color=3730a3&rounded=false`}
                            alt="product"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', marginBottom: '2px' }}>{post.product_name || `Product ID: ${post.product_id}`}</div>
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
                          {post.published_time ? new Date(post.published_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {post.published_time ? new Date(post.published_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Pending'}
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
                        ${postsProfit[post.id]?.revenue?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: postsProfit[post.id]?.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                          ${postsProfit[post.id]?.net_profit?.toFixed(2) || '0.00'}
                        </div>
                        {postsProfit[post.id] && (
                          <div style={{ fontSize: '11px', color: postsProfit[post.id]?.roi >= 0 ? '#10b981' : '#ef4444', fontWeight: 600, backgroundColor: postsProfit[post.id]?.roi >= 0 ? '#d1fae5' : '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                            {postsProfit[post.id]?.roi >= 0 ? '+' : ''}{postsProfit[post.id]?.roi}% ROI
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {post.status === POST_STATUS.PUBLISHED && (
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
                          onClick={() => setPostToEdit(post)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#64748b', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          title="Delete Post"
                          onClick={() => handleDeletePost(post.id)}
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
        <div className="mobile-only" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc' }}>
          {loading && (!posts || posts.length === 0) ? (
            [1, 2, 3].map(i => (
              <div key={`skeleton-mob-${i}`} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                <Skeleton width="100%" height={200} />
              </div>
            ))
          ) : paginatedPosts.map((post) => (
            <div key={`mob-${post.id}`} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                    <img src={post.product_image || `https://ui-avatars.com/api/?name=${post.product_name || 'PR'}&background=c7d2fe&color=3730a3&rounded=false`} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>{post.product_name || `Product ID: ${post.product_id}`}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <FacebookIcon size={12} /> {post.page_name || post.page_id}
                    </div>
                  </div>
                </div>
                <PostStatusBadge status={post.status} />
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Views</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#6366f1' }}>{post.views_count?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reach</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0ea5e9' }}>{post.reach_count?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engagements</div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Heart size={10} color="#f43f5e" /> {post.likes_count || 0}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><MessageCircle size={10} color="#f59e0b" /> {post.comments_count || 0}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Share2 size={10} color="#10b981" /> {post.shares_count || 0}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit / ROI</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: postsProfit[post.id]?.net_profit >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ${postsProfit[post.id]?.net_profit?.toFixed(2) || '0.00'}
                    {postsProfit[post.id] && (
                      <span style={{ fontSize: '10px', backgroundColor: postsProfit[post.id]?.roi >= 0 ? '#d1fae5' : '#fee2e2', padding: '2px 4px', borderRadius: '4px' }}>
                        {postsProfit[post.id]?.roi >= 0 ? '+' : ''}{postsProfit[post.id]?.roi || 0}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer: Date & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {post.published_time ? new Date(post.published_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {post.status === POST_STATUS.PUBLISHED && (
                    <a href={`https://facebook.com/${post.fb_post_id}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', color: '#3b82f6', backgroundColor: '#eff6ff' }}>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button onClick={() => setPostToEdit(post)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', color: '#64748b', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeletePost(post.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', color: '#ef4444', backgroundColor: '#fef2f2', border: 'none' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && filteredPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
              No posts matched your criteria.
            </div>
          )}
        </div>

        {filteredPosts.length > 0 && (
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
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

      <MarkPostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostMarked={handlePostMarked}
      />

      <EditTrackedPostModal
        isOpen={!!postToEdit}
        onClose={() => setPostToEdit(null)}
        post={postToEdit}
        onSave={updatePost}
      />
    </div>
  );
};
