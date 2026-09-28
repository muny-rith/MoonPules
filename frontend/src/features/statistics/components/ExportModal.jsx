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

export const ExportModal = ({ isOpen, onClose, posts, brandName, pageName, dateRangeText, startMonth, endMonth, clientLogo }) => {
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

        return Array.from(map.values()).map((grp) => ({
            ...grp,
            ...prepareGroupData(grp.posts)
        }));
    }, [posts, pageName]);

    if (!isOpen) return null;

    const fileBaseName = `${(brandName || 'Brand').replace(/\s+/g, '_')}_Analytics`;
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
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * pageWidth) / canvas.width;

                if (i > 0) {
                    pdf.addPage();
                }

                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 2) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
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
                            pageGroups.map((group, pageIndex) => (
                                <div key={group.id} style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pageGroups.length > 1 && (
                                        <div className="export-page-indicator">
                                            Page {pageIndex + 1} of {pageGroups.length} · {group.name}
                                        </div>
                                    )}
                                    <div className="export-preview-page">
                                        <div className='logo' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
                                            {/* My Logo */}
                                            <div style={{ width: '240px', display: 'flex', alignItems: 'center' }}>
                                                <img src={logo} alt="My Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                                            </div>

                                            {/* Client Logo */}
                                            <div style={{ width: '240px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {clientLogo ? (
                                                    <img src={clientLogo} alt="Client Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
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

                                        {/* Executive Summary - Always shown on every page */}
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

                                        {/* Detailed Posts Header */}
                                        <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Detailed Posts
                                        </h4>

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
                                                {group.rows.map((row, i) => (
                                                    <tr key={i}>
                                                        {row.map((cell, j) => (
                                                            <td key={j}>{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    {group.totalRow.map((cell, j) => (
                                                        <td key={j}>{cell}</td>
                                                    ))}
                                                </tr>
                                            </tfoot>
                                        </table>
                                        {group.rows.length === 0 && (
                                            <div className="export-preview-empty">No posts to export for this page.</div>
                                        )}
                                    </div>
                                </div>
                            ))
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

                {/* Hidden container for full PDF render using HTML2Canvas */}
                <div
                    ref={pdfContainerRef}
                    style={{
                        position: 'fixed',
                        left: 0,
                        top: 0,
                        opacity: 0,
                        pointerEvents: 'none',
                        zIndex: -9999,
                        width: '210mm',
                    }}
                >
                    {pageGroups.map((group) => (
                        <div
                            key={group.id}
                            className="export-pdf-page-container"
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                padding: '12mm 15mm',
                                backgroundColor: '#ffffff',
                                color: '#0f172a',
                                boxSizing: 'border-box',
                                marginBottom: '20px'
                            }}
                        >
                            <div className='logo' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
                                {/* My Logo */}
                                <div style={{ width: '200px', display: 'flex', alignItems: 'center' }}>
                                    <img src={logo} alt="My Logo" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>

                                {/* Client Logo */}
                                <div style={{ width: '200px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {clientLogo ? (
                                        <img src={clientLogo} alt="Client Logo" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ border: '1px dashed #cbd5e1', padding: '6px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>Client Logo</div>
                                    )}
                                </div>
                            </div>

                            <div className="export-preview-meta" style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', textAlign: 'center' }}>
                                    REPORT DIGITAL MARKETING
                                </h3>
                                <div style={{ marginBottom: '6px' }}>រយៈពេល ៖ {displayPeriod}</div>
                                <div>ទិន្នន័យការផ្សាយនៅក្នុង page {group.name}</div>
                            </div>

                            {/* Executive Summary - Always shown on every page */}
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
                                                <th key={h} style={{ backgroundColor: '#0f172a', color: 'white', padding: '8px', textAlign: 'left', fontSize: '13px' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#2b384bff', fontWeight: 500 }}>Regular Posts</td>
                                            <td style={{ padding: '8px', color: '#2b384bff', fontWeight: 600 }}>{group.regularPosts.length}</td>
                                            {group.summaryMetrics.regular.map((val, idx) => (
                                                <td key={idx} style={{ padding: '8px', color: '#2b384bff' }}>{val}</td>
                                            ))}
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#2b384bff', fontWeight: 500 }}>Live Stream</td>
                                            <td style={{ padding: '8px', color: '#2b384bff', fontWeight: 600 }}>{group.livePosts.length}</td>
                                            {group.summaryMetrics.live.map((val, idx) => (
                                                <td key={idx} style={{ padding: '8px', color: '#2b384bff' }}>{val}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                            <td style={{ padding: '8px', color: '#0f172a' }}>Total</td>
                                            <td style={{ padding: '8px', color: '#0f172a' }}>{group.sortedPosts.length}</td>
                                            {group.summaryMetrics.total.map((val, idx) => (
                                                <td key={idx} style={{ padding: '8px', color: '#0f172a' }}>{val}</td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Detailed Posts Header */}
                            <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Detailed Posts
                            </h4>

                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
                                <colgroup>
                                    {COLUMN_WIDTHS.map((w, idx) => (
                                        <col key={idx} style={{ width: w }} />
                                    ))}
                                </colgroup>
                                <thead>
                                    <tr>
                                        {headers.map((h) => (
                                            <th key={h} style={{ backgroundColor: '#0f172a', color: 'white', padding: '8px', textAlign: 'left', fontSize: '13px' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.rows.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            {row.map((cell, j) => (
                                                <td key={j} style={{ padding: '8px', color: '#2b384bff' }}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                        {group.totalRow.map((cell, j) => (
                                            <td key={j} style={{ padding: '8px', color: '#0f172a' }}>{cell}</td>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};