import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Bookmark,
  BookmarkCheck,
  Check,
  Plus,
  Hash,
  FileText,
  Edit3,
} from 'lucide-react';
import * as api from '../api/postTrackerApi';

export const AddHashtagsModal = ({
  isOpen,
  onClose,
  onAddHashtags,
  selectedProduct = null,
  selectedBrand = null,
}) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'recent' | 'saved'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [dbHashtags, setDbHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  // Load hashtags from PostgreSQL on open
  useEffect(() => {
    if (isOpen) {
      loadHashtagsFromDb();
      setSelectedTags([]);
      setSearchQuery('');
      setActiveTab('all');
      setEditingNoteId(null);
    }
  }, [isOpen]);

  const loadHashtagsFromDb = async () => {
    try {
      setLoading(true);
      const data = await api.fetchHashtags();
      if (Array.isArray(data)) {
        setDbHashtags(data);
      }
    } catch (err) {
      console.error('Failed to load hashtags from database:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async (tag, e, currentNote = null) => {
    e.stopPropagation();
    if (!tag || typeof tag !== 'string') return;
    const clean = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim().replace(/\s+/g, '')}`;

    // Optimistic UI update
    setDbHashtags((prev) => {
      const idx = prev.findIndex((h) => h.tag.toLowerCase() === clean.toLowerCase());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], is_saved: !next[idx].is_saved };
        return next;
      } else {
        return [
          {
            id: Date.now(),
            tag: clean,
            is_saved: true,
            note: currentNote || '',
            usage_count: 0,
            last_used_at: null,
          },
          ...prev,
        ];
      }
    });

    try {
      const updated = await api.toggleSaveHashtag(clean, currentNote);
      // Sync real database row
      if (updated?.id) {
        setDbHashtags((prev) => {
          const idx = prev.findIndex((h) => h.tag.toLowerCase() === clean.toLowerCase());
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [updated, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to toggle save hashtag:', err);
      loadHashtagsFromDb();
    }
  };

  const handleStartEditNote = (item, e) => {
    e.stopPropagation();
    setEditingNoteId(item.id);
    setTempNote(item.note || '');
  };

  const handleSaveNote = async (item, e) => {
    e.stopPropagation();
    try {
      const updated = await api.updateHashtagNote(item.id, tempNote.trim() || null);
      if (updated?.id) {
        setDbHashtags((prev) =>
          prev.map((h) => (h.id === item.id ? { ...h, note: updated.note } : h))
        );
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setEditingNoteId(null);
    }
  };

  // Combine DB hashtags with contextual product & brand tags (Brand & Product placed at the VERY TOP)
  const allSuggestedTags = useMemo(() => {
    const topContextTags = [];
    const seen = new Set();

    const addContextTag = (name, source) => {
      if (!name || typeof name !== 'string') return;
      const clean = name.trim().startsWith('#') ? name.trim() : `#${name.trim().replace(/\s+/g, '')}`;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        const existingInDb = dbHashtags.find((h) => h.tag.toLowerCase() === lower);
        topContextTags.push({
          ...(existingInDb || {
            id: `ctx-${lower}`,
            tag: clean,
            is_saved: false,
            note: null,
            usage_count: 0,
            last_used_at: null,
          }),
          source, // 'brand' | 'product'
        });
      }
    };

    // 1. Selected brand tag (TOP priority)
    const brandLabel = selectedBrand?.brand_name || selectedBrand?.name;
    if (brandLabel) addContextTag(brandLabel, 'brand');

    // 2. Selected product tag (TOP priority)
    if (selectedProduct?.product_name) addContextTag(selectedProduct.product_name, 'product');

    // 3. All remaining database hashtags
    const remainingDbTags = dbHashtags.filter((h) => !seen.has(h.tag.toLowerCase()));

    return [...topContextTags, ...remainingDbTags];
  }, [dbHashtags, selectedProduct, selectedBrand]);

  // Filter tags based on Active Tab and Search Query
  const displayedTags = useMemo(() => {
    let base = [];

    if (activeTab === 'saved') {
      base = allSuggestedTags.filter((h) => h.is_saved);
    } else if (activeTab === 'recent') {
      base = allSuggestedTags
        .filter((h) => h.last_used_at !== null)
        .sort((a, b) => new Date(b.last_used_at || 0) - new Date(a.last_used_at || 0));
    } else {
      // 'all'
      base = allSuggestedTags;
    }

    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!q) return base;

    return base.filter((item) => {
      const cleanTag = item.tag.toLowerCase().replace(/^#/, '');
      const noteMatch = (item.note || '').toLowerCase().includes(q);
      return cleanTag.includes(q) || noteMatch;
    });
  }, [allSuggestedTags, activeTab, searchQuery]);

  // Can create custom tag if search query doesn't match any existing tag
  const canCreateCustom = useMemo(() => {
    const q = searchQuery.trim().replace(/^#/, '').replace(/\s+/g, '');
    if (!q) return false;
    return !allSuggestedTags.some((item) => item.tag.toLowerCase() === `#${q.toLowerCase()}`);
  }, [searchQuery, allSuggestedTags]);

  if (!isOpen) return null;

  const handleToggleCheck = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCreateAndSelectCustom = async () => {
    const clean = searchQuery.trim().replace(/^#/, '').replace(/\s+/g, '');
    if (!clean) return;
    const newTag = `#${clean}`;

    // Select the tag
    if (!selectedTags.includes(newTag)) {
      setSelectedTags((prev) => [...prev, newTag]);
    }

    // Save to DB as well
    try {
      const saved = await api.toggleSaveHashtag(newTag);
      if (saved?.id) {
        setDbHashtags((prev) => {
          if (prev.some((h) => h.tag.toLowerCase() === newTag.toLowerCase())) return prev;
          return [saved, ...prev];
        });
      }
    } catch (e) {
      console.error('Failed to create custom tag:', e);
    }

    setSearchQuery('');
  };

  const handleAddSelected = async () => {
    if (selectedTags.length > 0) {
      // Record usage in PostgreSQL DB (updates last_used_at & usage_count)
      try {
        await api.recordHashtagsUsage(selectedTags);
      } catch (err) {
        console.error('Failed to record hashtags usage:', err);
      }

      onAddHashtags(selectedTags);
    }
    onClose();
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'recent', label: 'Recent' },
    { id: 'saved', label: 'Saved' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <Hash size={18} style={{ color: '#0284c7' }} />
            <h3
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Add Hashtags
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              borderRadius: '6px',
              position: 'absolute',
              right: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar Input */}
        <div style={{ padding: '14px 20px 10px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1.5px solid #0284c7',
              borderRadius: '8px',
              padding: '8px 12px',
              background: '#ffffff',
            }}
          >
            <Search size={18} style={{ color: '#64748b', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hashtags or notes..."
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '14px',
                color: '#0f172a',
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 3 Option Tabs: All | Recent | Saved */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 20px 12px 20px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? '#e7f3ff' : 'transparent',
                  color: isActive ? '#1877f2' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Custom Create Option if query doesn't match */}
        {canCreateCustom && (
          <div style={{ padding: '10px 20px 6px 20px' }}>
            <button
              type="button"
              onClick={handleCreateAndSelectCustom}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px dashed #0284c7',
                background: '#f0f9ff',
                color: '#0369a1',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Create & Save "#{searchQuery.trim().replace(/^#/, '').replace(/\s+/g, '')}"
            </button>
          </div>
        )}

        {/* Hashtags Scrollable List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 14px',
            maxHeight: '360px',
            minHeight: '220px',
          }}
        >
          {displayedTags.length === 0 && !canCreateCustom ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>
              {activeTab === 'saved' && 'No saved hashtags yet. Click the bookmark icon next to any hashtag to save it here.'}
              {activeTab === 'recent' && 'No recent hashtags used yet. Hashtags you add to posts will appear here.'}
              {activeTab === 'all' && (searchQuery ? `No matching hashtags found for "${searchQuery}"` : 'No hashtags available.')}
            </div>
          ) : (
            displayedTags.map((item) => {
              const isChecked = selectedTags.includes(item.tag);
              const isEditingThisNote = editingNoteId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleCheck(item.tag)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    background: isChecked ? '#f0f7ff' : 'transparent',
                    marginBottom: '4px',
                    border: isChecked ? '1px solid #bfdbfe' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left: Checkbox + Tag Name + Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Custom Checkbox */}
                      <div
                        style={{
                          width: '19px',
                          height: '19px',
                          borderRadius: '5px',
                          border: isChecked ? '2px solid #1877f2' : '2px solid #cbd5e1',
                          backgroundColor: isChecked ? '#1877f2' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isChecked && <Check size={13} strokeWidth={3} />}
                      </div>

                      {/* Tag Name & Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          {item.tag}
                        </span>

                        {item.source === 'brand' && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#7e22ce',
                              background: '#f3e8ff',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            Brand
                          </span>
                        )}
                        {item.source === 'product' && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#15803d',
                              background: '#dcfce7',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            Product
                          </span>
                        )}
                        {item.is_saved && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#0369a1',
                              background: '#e0f2fe',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            Saved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Action Icons: Note Edit + Bookmark */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Note Button */}
                      {typeof item.id === 'number' && (
                        <button
                          type="button"
                          onClick={(e) => handleStartEditNote(item, e)}
                          title={item.note ? `Note: ${item.note}` : 'Add note to hashtag'}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '5px',
                            borderRadius: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            color: item.note ? '#0284c7' : '#cbd5e1',
                            transition: 'color 0.15s ease',
                          }}
                        >
                          <FileText size={16} />
                        </button>
                      )}

                      {/* Bookmark / Save Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(item.tag, e, item.note)}
                        title={item.is_saved ? 'Remove from saved presets' : 'Save hashtag to database presets'}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '5px',
                          borderRadius: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: item.is_saved ? '#0284c7' : '#94a3b8',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {item.is_saved ? (
                          <BookmarkCheck size={18} style={{ fill: '#e0f2fe' }} />
                        ) : (
                          <Bookmark size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Note Row Display or Inline Editor */}
                  {isEditingThisNote ? (
                    <div
                      style={{
                        marginTop: '6px',
                        marginLeft: '31px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        placeholder="Write a note (e.g. For baby diapers, flash sale, etc.)..."
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          padding: '4px 8px',
                          border: '1px solid #93c5fd',
                          borderRadius: '4px',
                          outline: 'none',
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNote(item, e);
                          if (e.key === 'Escape') setEditingNoteId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => handleSaveNote(item, e)}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNoteId(null);
                        }}
                        style={{
                          padding: '3px 6px',
                          fontSize: '11px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    item.note && (
                      <div
                        style={{
                          marginLeft: '31px',
                          marginTop: '3px',
                          fontSize: '12px',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ color: '#94a3b8' }}>Note:</span>
                        <span>{item.note}</span>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            background: '#ffffff',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={selectedTags.length === 0}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              border: 'none',
              background: selectedTags.length > 0 ? '#1877f2' : '#bfdbfe',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: selectedTags.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s ease',
            }}
          >
            {selectedTags.length > 0 ? `Add (${selectedTags.length})` : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};
