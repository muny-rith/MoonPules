// frontend/src/features/statistics/components/ExportModal.jsx
import React, { useState, useRef, useMemo } from 'react';
import { X, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ExportModal.css';
import logo from "../../../assets/logo.png";

const EXPORT_COLUMNS = [
    { key: 'media_type', label: 'Post Type' },
    { key: 'published_time', label: 'Date', format: 'date' },
    { key: 'likes_count', label: 'Reaction' },
    { key: 'comments_count', label: 'Cmt' },
    { key: 'shares_count', label: 'Share' },
    { key: 'views_count', label: 'Views' },
    { key: 'reach_count', label: 'Reach' },
];

const COLUMN_WIDTHS = ['18%', '18%', '12.8%', '12.8%', '12.8%', '12.8%', '12.8%'];

const KHMER_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
const formatDateKhmer = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${KHMER_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const KHMER_MONTH_TO_SHORT = {
    'មករា': 'Jan',
    'កុម្ភៈ': 'Feb',
    'មីនា': 'Mar',
    'មេសា': 'Apr',
    'ឧសភា': 'May',
    'មិថុនា': 'Jun',
    'កក្កដា': 'Jul',
    'សីហា': 'Aug',
    'កញ្ញា': 'Set',
    'តុលា': 'Oct',
    'វិច្ឆិកា': 'Nov',
    'ធ្នូ': 'Dec',
};

const getPeriodLabelForFilename = (startMonth, endMonth, dateRangeText, posts) => {
    const parseKhmer = (str) => {
        if (!str || typeof str !== 'string') return null;
        for (const [khMonth, shortMonth] of Object.entries(KHMER_MONTH_TO_SHORT)) {
            if (str.includes(khMonth)) {
                const yearMatch = str.match(/\d{4}/);
                const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
                return { month: shortMonth, year };
            }
        }
        return null;
    };

    const s = parseKhmer(startMonth);
    const e = parseKhmer(endMonth);

    if (s && e) {
        if (s.month === e.month && s.year === e.year) {
            return `${s.month} ${s.year}`;
        }
        if (s.year === e.year) {
            return `${s.month}-${e.month} ${s.year}`;
        }
        return `${s.month} ${s.year}-${e.month} ${e.year}`;
    }
    if (s) return `${s.month} ${s.year}`;
    if (e) return `${e.month} ${e.year}`;

    const textMatch = parseKhmer(dateRangeText);
    if (textMatch) return `${textMatch.month} ${textMatch.year}`;

    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Set', 'Oct', 'Nov', 'Dec'];
    if (posts && posts.length > 0) {
        for (const p of posts) {
            const raw = p.published_time || p.scheduled_time || p.created_at;
            if (raw) {
                const d = new Date(raw);
                if (!isNaN(d.getTime())) {
                    return `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
                }
            }
        }
    }

    const now = new Date();
    return `${SHORT_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

const formatCell = (post, col) => {
    if (col.key === 'media_type') {
        const m = (post.media_type || post.format || post.type || 'photo').toLowerCase();
        if (m === 'video') return 'Video';
        if (m === 'reel') return 'Reel';
        if (m === 'live') return 'Live';
        return 'Photo';
    }
    const raw = post[col.key];
    if (col.format === 'date') {
        const dateVal = raw || post.scheduled_time || post.created_at;
        return formatDateKhmer(dateVal);
    }
    if (raw === null || raw === undefined) return col.key.includes('count') ? 0 : '';
    return raw;
};

const prepareGroupData = (groupPosts) => {
    const sorted = [...groupPosts].sort((a, b) => {
        const isLiveA = (a.media_type || a.format || a.type || '').toLowerCase() === 'live' ? 1 : 0;
        const isLiveB = (b.media_type || b.format || b.type || '').toLowerCase() === 'live' ? 1 : 0;

        if (isLiveA !== isLiveB) {
            return isLiveA - isLiveB;
        }

        const timeA = new Date(a.published_time || a.scheduled_time || a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.published_time || b.scheduled_time || b.created_at || 0).getTime() || 0;
        if (timeA !== timeB) {
            return timeA - timeB;
        }

        return (a.product_name || '').localeCompare(b.product_name || '');
    });

    const regular = sorted.filter((p) => (p.media_type || p.format || p.type || '').toLowerCase() !== 'live');
    const live = sorted.filter((p) => (p.media_type || p.format || p.type || '').toLowerCase() === 'live');

    const calc = (list) => [
        list.reduce((sum, p) => sum + (Number(p.likes_count) || 0), 0),
        list.reduce((sum, p) => sum + (Number(p.comments_count) || 0), 0),
        list.reduce((sum, p) => sum + (Number(p.shares_count) || 0), 0),
        list.reduce((sum, p) => sum + (Number(p.views_count) || 0), 0),
        list.reduce((sum, p) => sum + (Number(p.reach_count) || 0), 0),
    ];

    const summaryMetrics = {
        regular: calc(regular),
        live: calc(live),
        total: calc(sorted)
    };

    const rows = sorted.map((p) => EXPORT_COLUMNS.map((col) => formatCell(p, col)));

    const totalRow = EXPORT_COLUMNS.map((col) => {
        if (col.key === 'media_type' || col.key === 'product_name') return 'Total';
        if (col.key === 'published_time') return '';
        return sorted.reduce((sum, post) => sum + (Number(post[col.key]) || 0), 0);
    });

    const summaryRows = [
        ['Regular Posts', regular.length, ...summaryMetrics.regular],
        ['Live Stream', live.length, ...summaryMetrics.live],
        ['Total', sorted.length, ...summaryMetrics.total]
    ];

    return {
        sortedPosts: sorted,
        regularPosts: regular,
        livePosts: live,
        summaryMetrics,
        summaryRows,
        rows,
        totalRow,
    };
};

export const ExportModal = ({ isOpen, onClose, posts, brandName, pageName, dateRangeText, startMonth, endMonth, clientLogo, clientLogos }) => {
    const [selectedFormat, setSelectedFormat] = useState('csv');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const pdfContainerRef = useRef(null);

    const displayPeriod = dateRangeText || (
        startMonth && endMonth
            ? (startMonth === endMonth ? startMonth : `${startMonth} រហូតដល់ ${endMonth}`)
            : (startMonth || endMonth || 'គ្រប់ពេលវេលា')
    );

    // Group posts by page: If filtered by All Pages, separate each Facebook page into its own group
    const pageGroups = useMemo(() => {
        if (!posts || !Array.isArray(posts) || posts.length === 0) return [];

        const map = new Map();
        posts.forEach((post) => {
            const pageKey = String(post.page_id || post.page_name || 'default');
            const pageTitle = post.page_name || pageName || 'Facebook Page';

            if (!map.has(pageKey)) {
                map.set(pageKey, {
                    id: pageKey,
                    name: pageTitle,
                    posts: []
                });
            }
            map.get(pageKey).posts.push(post);
        });

        const sortedGroups = Array.from(map.values()).sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        );

        return sortedGroups.map((grp) => ({
            ...grp,
            ...prepareGroupData(grp.posts)
        }));
    }, [posts, pageName]);

    // Helper function to paginate long post lists cleanly into separate A4 sheets
    const splitGroupIntoPrintPages = (group) => {
        const totalPosts = group.sortedPosts.length;
        // Up to 16 posts fit cleanly on 1 single A4 sheet with Executive Summary and Total
        if (totalPosts <= 16) {
            return [{
                subPageNumber: 1,
                totalSubPages: 1,
                isFirstPage: true,
                isLastPage: true,
                rows: group.rows,
                showSummary: true,
                showTotal: true,
                totalRow: group.totalRow
            }];
        }

        const PAGE_1_LIMIT = 17;
        const SUBSEQUENT_LIMIT = 30;
        const pages = [];

        let page1Take = PAGE_1_LIMIT;
        if (totalPosts > PAGE_1_LIMIT && totalPosts - PAGE_1_LIMIT < 3) {
            page1Take = Math.max(1, totalPosts - 3);
        }

        // Page 1: Executive Summary + first posts
        pages.push({
            subPageNumber: 1,
            isFirstPage: true,
            isLastPage: false,
            rows: group.rows.slice(0, page1Take),
            showSummary: true,
            showTotal: false,
            totalRow: null
        });

        let start = page1Take;
        let pageNum = 2;

        while (start < totalPosts) {
            const remaining = totalPosts - start;
            let take = SUBSEQUENT_LIMIT;
            if (remaining > SUBSEQUENT_LIMIT && remaining <= SUBSEQUENT_LIMIT + 2) {
                take = Math.ceil(remaining / 2);
            }

            const end = Math.min(start + take, totalPosts);
            const subRows = group.rows.slice(start, end);
            const isLast = end >= totalPosts;

            pages.push({
                subPageNumber: pageNum,
                isFirstPage: false,
                isLastPage: isLast,
                rows: subRows,
                showSummary: false,
                showTotal: isLast,
                totalRow: isLast ? group.totalRow : null
            });

            start = end;
            pageNum++;
        }

        const totalSub = pages.length;
        pages.forEach((p) => { p.totalSubPages = totalSub; });
        return pages;
    };

    if (!isOpen) return null;

    const cleanBrandName = (brandName || 'Brand').replace(/[\\/:*?"<>|]/g, '').trim();
    const periodLabel = getPeriodLabelForFilename(startMonth, endMonth, dateRangeText, posts);
    const fileBaseName = `Report Digital_${cleanBrandName}_${periodLabel}`;
    const headers = EXPORT_COLUMNS.map((c) => c.label);
    const summaryHeaders = ['Post Type', 'Qty', 'Reaction', 'Cmt', 'Share', 'Views', 'Reach'];

    const downloadCSV = () => {
        const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
        let allSections = [];

        pageGroups.forEach((group, idx) => {
            let sheetData = [];
            if (pageGroups.length > 1) {
                sheetData.push([`=== PAGE ${idx + 1}: ${group.name} ===`]);
                sheetData.push([`Period: ${displayPeriod}`]);
                sheetData.push([]);
            }

            sheetData.push(
                ['EXECUTIVE SUMMARY'],
                summaryHeaders,
                ...group.summaryRows,
                [],
                ['DETAILED POSTS'],
                headers,
                ...group.rows,
                group.totalRow
            );

            allSections.push(sheetData.map((r) => r.map(escape).join(',')).join('\n'));
        });

        const csvContent = allSections.join('\n\n\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `${fileBaseName}.csv`);
    };

    const downloadExcel = () => {
        const workbook = XLSX.utils.book_new();
        const usedSheetNames = new Set();

        pageGroups.forEach((group, idx) => {
            const sheetData = [
                [`PAGE: ${group.name}`],
                [`Period: ${displayPeriod}`],
                [],
                ['EXECUTIVE SUMMARY'],
                summaryHeaders,
                ...group.summaryRows,
                [],
                ['DETAILED POSTS'],
                headers,
                ...group.rows,
                group.totalRow
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            worksheet['!cols'] = headers.map(() => ({ wch: 18 }));

            let rawName = (group.name || `Page ${idx + 1}`).replace(/[\\/?*:[\]]/g, '').trim().slice(0, 28) || `Sheet${idx + 1}`;
            let sheetName = rawName;
            let counter = 1;
            while (usedSheetNames.has(sheetName)) {
                sheetName = `${rawName.slice(0, 25)}_${counter++}`;
            }
            usedSheetNames.add(sheetName);

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });

        XLSX.writeFile(workbook, `${fileBaseName}.xlsx`);
    };

    const downloadPDF = async () => {
        if (!pdfContainerRef.current) return;
        setIsGeneratingPDF(true);

        try {
            const pageContainers = pdfContainerRef.current.querySelectorAll('.export-pdf-page-container');
            if (pageContainers.length === 0) {
                console.warn('No page containers found in pdfContainerRef');
                return;
            }

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < pageContainers.length; i++) {
                const el = pageContainers[i];
                const canvas = await html2canvas(el, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    imageTimeout: 15000,
                });

                const imgData = canvas.toDataURL('image/png');
                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
            }

            pdf.save(`${fileBaseName}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        if (!posts || posts.length === 0 || isGeneratingPDF) return;
        if (selectedFormat === 'csv') {
            downloadCSV();
            onClose();
        } else if (selectedFormat === 'excel') {
            downloadExcel();
            onClose();
        } else if (selectedFormat === 'pdf') {
            await downloadPDF();
            onClose();
        }
    };

    const formatOptions = [
        { value: 'csv', label: 'CSV', icon: FileText, desc: 'Plain spreadsheet data, opens anywhere' },
        { value: 'excel', label: 'Excel', icon: FileSpreadsheet, desc: 'Formatted .xlsx workbook' },
        { value: 'pdf', label: 'PDF', icon: FileType, desc: 'Printable report with a title' },
    ];

    const totalPostsCount = posts?.length || 0;

    return (
        <div className="export-modal-overlay">
            <div className="card export-modal-container">
                <button onClick={onClose} className="export-modal-close" disabled={isGeneratingPDF}>
                    <X size={20} />
                </button>

                <div className="export-modal-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Report Digital Marketing</h2>
                    </div>
                    <div className="post-count">
                        {totalPostsCount} post{totalPostsCount !== 1 ? 's' : ''} {pageGroups.length > 1 ? `across ${pageGroups.length} pages` : ''} in the current filter will be included.
                    </div>

                    {/* Report Preview */}
                    <div className="export-preview-wrapper">
                        {pageGroups.length === 0 ? (
                            <div className="export-preview-page">
                                <div className="export-preview-empty">No posts to export in this filter.</div>
                            </div>
                        ) : (
                            pageGroups.map((group, pageIndex) => {
                                const subPages = splitGroupIntoPrintPages(group);
                                return subPages.map((subPage) => (
                                    <div key={`${group.id}_${subPage.subPageNumber}`} style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                                        <div className="export-page-indicator">
                                            {pageGroups.length > 1 ? `Page ${pageIndex + 1} of ${pageGroups.length} · ` : ''}{group.name}
                                        </div>
                                        <div className="export-preview-page">
                                            {subPage.isFirstPage && (
                                                <>
                                                    <div className='logo' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
                                                        {/* My Logo */}
                                                        <div style={{ width: '240px', display: 'flex', alignItems: 'center' }}>
                                                            <img src={logo} alt="My Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                                                        </div>

                                                        {/* Client Logo */}
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: '240px', flex: 1 }}>
                                                            {clientLogos && clientLogos.length > 1 ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '8px' }}>
                                                                    {clientLogos.map((lg, idx) => (
                                                                        <React.Fragment key={lg.id || idx}>
                                                                            {idx > 0 && (
                                                                                <div style={{
                                                                                    width: '1.5px',
                                                                                    height: '26px',
                                                                                    backgroundColor: '#cbd5e1',
                                                                                    margin: '0 12px',
                                                                                    borderRadius: '1px',
                                                                                    flexShrink: 0
                                                                                }} />
                                                                            )}
                                                                            {lg.url ? (
                                                                                <img
                                                                                    crossOrigin="anonymous"
                                                                                    src={lg.url}
                                                                                    alt={lg.name || 'Client Logo'}
                                                                                    style={{ maxHeight: '60px', maxWidth: '140px', objectFit: 'contain' }}
                                                                                />
                                                                            ) : (
                                                                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                                                                    {lg.name || 'Brand'}
                                                                                </span>
                                                                            )}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            ) : clientLogo ? (
                                                                <img crossOrigin="anonymous" src={clientLogo} alt="Client Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                                                            ) : (
                                                                <div style={{ border: '1px dashed #cbd5e1', padding: '4px 8px', color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>Client Logo</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="export-preview-meta" style={{ marginBottom: '20px' }}>
                                                        <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}>
                                                            REPORT DIGITAL MARKETING
                                                        </h3>
                                                        <span>រយៈពេល ៖ {displayPeriod}</span>
                                                        <span>ទិន្នន័យការផ្សាយនៅក្នុង page {group.name}</span>
                                                    </div>

                                                    {/* Executive Summary - ONLY on First Page */}
                                                    {subPage.showSummary && (
                                                        <div style={{ marginBottom: '24px' }}>
                                                            <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                Executive Summary
                                                            </h4>
                                                            <table className="export-preview-table" style={{ marginBottom: '8px' }}>
                                                                <colgroup>
                                                                    {COLUMN_WIDTHS.map((w, idx) => (
                                                                        <col key={idx} style={{ width: w }} />
                                                                    ))}
                                                                </colgroup>
                                                                <thead>
                                                                    <tr>
                                                                        {summaryHeaders.map((h) => (
                                                                            <th key={h} style={{ fontSize: '12px' }}>{h}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr>
                                                                        <td style={{ fontWeight: 500 }}>Regular Posts</td>
                                                                        <td style={{ fontWeight: 600 }}>{group.regularPosts.length}</td>
                                                                        {group.summaryMetrics.regular.map((val, idx) => (
                                                                            <td key={idx}>{val}</td>
                                                                        ))}
                                                                    </tr>
                                                                    <tr>
                                                                        <td style={{ fontWeight: 500 }}>Live Stream</td>
                                                                        <td style={{ fontWeight: 600 }}>{group.livePosts.length}</td>
                                                                        {group.summaryMetrics.live.map((val, idx) => (
                                                                            <td key={idx}>{val}</td>
                                                                        ))}
                                                                    </tr>
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr>
                                                                        <td>Total</td>
                                                                        <td>{group.sortedPosts.length}</td>
                                                                        {group.summaryMetrics.total.map((val, idx) => (
                                                                            <td key={idx}>{val}</td>
                                                                        ))}
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    )}

                                                    {/* Detailed Posts Header */}
                                                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Detailed Posts
                                                    </h4>
                                                </>
                                            )}

                                            <table className="export-preview-table">
                                                <colgroup>
                                                    {COLUMN_WIDTHS.map((w, idx) => (
                                                        <col key={idx} style={{ width: w }} />
                                                    ))}
                                                </colgroup>
                                                <thead>
                                                    <tr>
                                                        {headers.map((h) => (
                                                            <th key={h} style={{ fontSize: '12px' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subPage.rows.map((row, i) => (
                                                        <tr key={i}>
                                                            {row.map((cell, j) => (
                                                                <td key={j}>{cell}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                {subPage.showTotal && (
                                                    <tfoot>
                                                        <tr>
                                                            {group.totalRow.map((cell, j) => (
                                                                <td key={j}>{cell}</td>
                                                            ))}
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>
                                ));
                            })
                        )}
                    </div>
                </div>

                {/* Bottom Bar: Format Selection & Actions */}
                <div className="export-modal-footer">
                    <div className="export-format-desc">
                        {formatOptions.find(o => o.value === selectedFormat)?.desc}
                    </div>

                    <div className="export-controls">
                        <div className="export-format-selector">
                            {formatOptions.map((opt) => {
                                const selected = selectedFormat === opt.value;
                                const Icon = opt.icon;
                                return (
                                    <label key={opt.value} className="export-format-option">
                                        <input
                                            type="radio"
                                            name="export-format"
                                            value={opt.value}
                                            checked={selected}
                                            onChange={() => setSelectedFormat(opt.value)}
                                            disabled={isGeneratingPDF}
                                            style={{ display: 'none' }}
                                        />
                                        <div className={`export-format-label ${selected ? 'selected' : ''}`}>
                                            <Icon size={16} />
                                            {opt.label}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="export-controls-divider"></div>

                        <div className="export-actions">
                            <button onClick={onClose} className="btn-secondary" disabled={isGeneratingPDF}>Cancel</button>
                            <button onClick={handleExport} className="btn-primary" disabled={totalPostsCount === 0 || isGeneratingPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isGeneratingPDF ? 'Generating PDF...' : 'Download'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden container for full PDF render using HTML2Canvas placed outside modal container */}
            <div
                ref={pdfContainerRef}
                style={{
                    position: 'fixed',
                    left: '-99999px',
                    top: 0,
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -9999,
                    width: '210mm',
                }}
            >
                    {pageGroups.map((group) => {
                        const subPages = splitGroupIntoPrintPages(group);
                        return subPages.map((subPage) => (
                            <div
                                key={`${group.id}_${subPage.subPageNumber}`}
                                className="export-pdf-page-container"
                                style={{
                                    width: '210mm',
                                    height: '297mm',
                                    padding: '12mm 15mm',
                                    backgroundColor: '#ffffff',
                                    color: '#0f172a',
                                    boxSizing: 'border-box',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-start',
                                    overflow: 'hidden'
                                }}
                            >
                                {subPage.isFirstPage && (
                                    <>
                                        <div className='logo' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
                                            {/* My Logo */}
                                            <div style={{ width: '200px', display: 'flex', alignItems: 'center' }}>
                                                <img src={logo} alt="My Logo" style={{ maxHeight: '85px', maxWidth: '100%', objectFit: 'contain' }} />
                                            </div>

                                            {/* Client Logo */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: '240px', flex: 1 }}>
                                                {clientLogos && clientLogos.length > 1 ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '8px' }}>
                                                        {clientLogos.map((lg, idx) => (
                                                            <React.Fragment key={lg.id || idx}>
                                                                {idx > 0 && (
                                                                    <div style={{
                                                                        width: '1.5px',
                                                                        height: '28px',
                                                                        backgroundColor: '#cbd5e1',
                                                                        margin: '0 14px',
                                                                        borderRadius: '1px',
                                                                        flexShrink: 0
                                                                    }} />
                                                                )}
                                                                {lg.url ? (
                                                                    <img
                                                                        crossOrigin="anonymous"
                                                                        src={lg.url}
                                                                        alt={lg.name || 'Client Logo'}
                                                                        style={{ maxHeight: '70px', maxWidth: '140px', objectFit: 'contain' }}
                                                                    />
                                                                ) : (
                                                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                                                        {lg.name || 'Brand'}
                                                                    </span>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                ) : clientLogo ? (
                                                    <img crossOrigin="anonymous" src={clientLogo} alt="Client Logo" style={{ maxHeight: '85px', maxWidth: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ border: '1px dashed #cbd5e1', padding: '6px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>Client Logo</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="export-preview-meta" style={{ textAlign: 'center', marginBottom: '20px' }}>
                                            <h3 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', textAlign: 'center' }}>
                                                REPORT DIGITAL MARKETING
                                            </h3>
                                            <div style={{ marginBottom: '6px', fontSize: '13px', color: '#475569' }}>រយៈពេល ៖ {displayPeriod}</div>
                                            <div style={{ fontSize: '13px', color: '#475569' }}>ទិន្នន័យការផ្សាយនៅក្នុង page {group.name}</div>
                                        </div>

                                        {/* Executive Summary - ONLY on First Page */}
                                        {subPage.showSummary && (
                                            <div style={{ marginBottom: '24px' }}>
                                                <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Executive Summary
                                                </h4>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px', marginBottom: '8px' }}>
                                                    <colgroup>
                                                        {COLUMN_WIDTHS.map((w, idx) => (
                                                            <col key={idx} style={{ width: w }} />
                                                        ))}
                                                    </colgroup>
                                                    <thead>
                                                        <tr>
                                                            {summaryHeaders.map((h) => (
                                                                <th key={h} style={{ backgroundColor: '#0f172a', color: 'white', padding: '6px 8px', textAlign: 'left', fontSize: '12px' }}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '5px 8px', color: '#2b384bff', fontWeight: 500 }}>Regular Posts</td>
                                                            <td style={{ padding: '5px 8px', color: '#2b384bff', fontWeight: 600 }}>{group.regularPosts.length}</td>
                                                            {group.summaryMetrics.regular.map((val, idx) => (
                                                                <td key={idx} style={{ padding: '5px 8px', color: '#2b384bff' }}>{val}</td>
                                                            ))}
                                                        </tr>
                                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '5px 8px', color: '#2b384bff', fontWeight: 500 }}>Live Stream</td>
                                                            <td style={{ padding: '5px 8px', color: '#2b384bff', fontWeight: 600 }}>{group.livePosts.length}</td>
                                                            {group.summaryMetrics.live.map((val, idx) => (
                                                                <td key={idx} style={{ padding: '5px 8px', color: '#2b384bff' }}>{val}</td>
                                                            ))}
                                                        </tr>
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                                            <td style={{ padding: '6px 8px', color: '#0f172a' }}>Total</td>
                                                            <td style={{ padding: '6px 8px', color: '#0f172a' }}>{group.sortedPosts.length}</td>
                                                            {group.summaryMetrics.total.map((val, idx) => (
                                                                <td key={idx} style={{ padding: '6px 8px', color: '#0f172a' }}>{val}</td>
                                                            ))}
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}

                                        {/* Detailed Posts Header */}
                                        <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Detailed Posts
                                        </h4>
                                    </>
                                )}

                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
                                    <colgroup>
                                        {COLUMN_WIDTHS.map((w, idx) => (
                                            <col key={idx} style={{ width: w }} />
                                        ))}
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            {headers.map((h) => (
                                                <th key={h} style={{ backgroundColor: '#0f172a', color: 'white', padding: '6px 8px', textAlign: 'left', fontSize: '12px' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subPage.rows.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                {row.map((cell, j) => (
                                                    <td key={j} style={{ padding: '5.5px 8px', color: '#2b384bff' }}>{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    {subPage.showTotal && (
                                        <tfoot>
                                            <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                                {group.totalRow.map((cell, j) => (
                                                    <td key={j} style={{ padding: '6px 8px', color: '#0f172a' }}>{cell}</td>
                                                ))}
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        ));
                    })}
                </div>
        </div>
    );
};