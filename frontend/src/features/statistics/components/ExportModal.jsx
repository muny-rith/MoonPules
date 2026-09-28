// frontend/src/features/statistics/components/ExportModal.jsx
import React, { useState, useRef, useMemo } from 'react';
import { X, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ExportModal.css';
import logo from "../../../assets/logo.png"

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

export const ExportModal = ({ isOpen, onClose, posts, brandName, pageName, dateRangeText, startMonth, endMonth, clientLogo }) => {
    const [selectedFormat, setSelectedFormat] = useState('csv');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const pdfContainerRef = useRef(null);

    const displayPeriod = dateRangeText || (
        startMonth && endMonth
            ? (startMonth === endMonth ? startMonth : `${startMonth} រហូតដល់ ${endMonth}`)
            : (startMonth || endMonth || 'គ្រប់ពេលវេលា')
    );
    const displayPage = pageName || 'Chhorlyka Mart – Baby & Mom';

    // Sort posts: Regular posts (Photo, Video, Reel) at top, Live streams at bottom.
    // Within each group, sort chronologically ascending by date.
    const sortedPosts = useMemo(() => {
        if (!posts || !Array.isArray(posts)) return [];
        return [...posts].sort((a, b) => {
            const isLiveA = (a.media_type || a.format || a.type || '').toLowerCase() === 'live' ? 1 : 0;
            const isLiveB = (b.media_type || b.format || b.type || '').toLowerCase() === 'live' ? 1 : 0;

            // 1. Regular posts first (0), Live posts at bottom (1)
            if (isLiveA !== isLiveB) {
                return isLiveA - isLiveB;
            }

            // 2. Chronological date ascending
            const timeA = new Date(a.published_time || a.scheduled_time || a.created_at || 0).getTime() || 0;
            const timeB = new Date(b.published_time || b.scheduled_time || b.created_at || 0).getTime() || 0;
            if (timeA !== timeB) {
                return timeA - timeB;
            }

            return (a.product_name || '').localeCompare(b.product_name || '');
        });
    }, [posts]);

    const regularPosts = useMemo(() => {
        if (!sortedPosts) return [];
        return sortedPosts.filter((p) => (p.media_type || p.format || p.type || '').toLowerCase() !== 'live');
    }, [sortedPosts]);

    const livePosts = useMemo(() => {
        if (!sortedPosts) return [];
        return sortedPosts.filter((p) => (p.media_type || p.format || p.type || '').toLowerCase() === 'live');
    }, [sortedPosts]);

    const rows = useMemo(() => {
        return sortedPosts.map((p) => EXPORT_COLUMNS.map((col) => formatCell(p, col)));
    }, [sortedPosts]);

    const hasBoth = regularPosts.length > 0 && livePosts.length > 0;

    const summaryMetrics = useMemo(() => {
        const calc = (list) => [
            list.reduce((sum, p) => sum + (Number(p.likes_count) || 0), 0),
            list.reduce((sum, p) => sum + (Number(p.comments_count) || 0), 0),
            list.reduce((sum, p) => sum + (Number(p.shares_count) || 0), 0),
            list.reduce((sum, p) => sum + (Number(p.views_count) || 0), 0),
            list.reduce((sum, p) => sum + (Number(p.reach_count) || 0), 0),
        ];
        return {
            regular: calc(regularPosts),
            live: calc(livePosts),
            total: calc(sortedPosts)
        };
    }, [regularPosts, livePosts, sortedPosts]);

    const totalRow = useMemo(() => {
        return EXPORT_COLUMNS.map((col) => {
            if (col.key === 'media_type' || col.key === 'product_name') return 'Total';
            if (col.key === 'published_time') return '';
            return sortedPosts.reduce((sum, post) => sum + (Number(post[col.key]) || 0), 0);
        });
    }, [sortedPosts]);

    if (!isOpen) return null;

    const fileBaseName = `${(brandName || 'Brand').replace(/\s+/g, '_')}_Analytics`;
    const headers = EXPORT_COLUMNS.map((c) => c.label);
    const summaryHeaders = ['Post Type', 'Qty', 'Reaction', 'Cmt', 'Share', 'Views', 'Reach'];
    const summaryRows = [
        ['Regular Posts', regularPosts.length, ...summaryMetrics.regular],
        ['Live Stream', livePosts.length, ...summaryMetrics.live],
        ['Total', sortedPosts.length, ...summaryMetrics.total]
    ];

    const downloadCSV = () => {
        const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
        let sheetData = [];
        if (hasBoth) {
            sheetData = [
                ['EXECUTIVE SUMMARY'],
                summaryHeaders,
                ...summaryRows,
                [],
                ['DETAILED POSTS'],
                headers,
                ...rows,
                totalRow
            ];
        } else {
            sheetData = [
                headers,
                ...rows,
                totalRow
            ];
        }
        const csvContent = sheetData.map((r) => r.map(escape).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `${fileBaseName}.csv`);
    };

    const downloadExcel = () => {
        let sheetData = [];
        if (hasBoth) {
            sheetData = [
                ['EXECUTIVE SUMMARY'],
                summaryHeaders,
                ...summaryRows,
                [],
                ['DETAILED POSTS'],
                headers,
                ...rows,
                totalRow
            ];
        } else {
            sheetData = [
                headers,
                ...rows,
                totalRow
            ];
        }
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        worksheet['!cols'] = headers.map(() => ({ wch: 18 }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');
        XLSX.writeFile(workbook, `${fileBaseName}.xlsx`);
    };

    const downloadPDF = async () => {
        if (!pdfContainerRef.current) return;
        setIsGeneratingPDF(true);

        try {
            // Render the hidden container to canvas
            const canvas = await html2canvas(pdfContainerRef.current, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Handle multi-page pagination
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 1) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`${fileBaseName}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
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

    const handleExport = () => {
        if (sortedPosts.length === 0) return;
        if (selectedFormat === 'csv') downloadCSV();
        if (selectedFormat === 'excel') downloadExcel();
        if (selectedFormat === 'pdf') downloadPDF();
        onClose();
    };

    const formatOptions = [
        { value: 'csv', label: 'CSV', icon: FileText, desc: 'Plain spreadsheet data, opens anywhere' },
        { value: 'excel', label: 'Excel', icon: FileSpreadsheet, desc: 'Formatted .xlsx workbook' },
        { value: 'pdf', label: 'PDF', icon: FileType, desc: 'Printable report with a title' },
    ];

    return (
        <div className="export-modal-overlay">
            <div className="card export-modal-container">
                <button onClick={onClose} className="export-modal-close">
                    <X size={20} />
                </button>

                <div className="export-modal-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Report Digital Marketing</h2>
                        {/* <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{brandName}</h2> */}
                    </div>
                    <div className="post-count">
                        {sortedPosts.length} post{sortedPosts.length !== 1 ? 's' : ''} in the current filter will be included.
                    </div>

                    {/* Report Preview */}
                    <div className="export-preview-wrapper">
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
                                <span>ទិន្នន័យការផ្សាយនៅក្នុង page {displayPage}</span>
                            </div>

                            {hasBoth && (
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
                                                <td style={{ fontWeight: 600 }}>{regularPosts.length}</td>
                                                {summaryMetrics.regular.map((val, idx) => (
                                                    <td key={idx}>{val}</td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>Live Stream</td>
                                                <td style={{ fontWeight: 600 }}>{livePosts.length}</td>
                                                {summaryMetrics.live.map((val, idx) => (
                                                    <td key={idx}>{val}</td>
                                                ))}
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td>Total</td>
                                                <td>{sortedPosts.length}</td>
                                                {summaryMetrics.total.map((val, idx) => (
                                                    <td key={idx}>{val}</td>
                                                ))}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {hasBoth && (
                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Detailed Posts
                                </h4>
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
                                    {rows.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => (
                                                <td key={j}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        {totalRow.map((cell, j) => (
                                            <td key={j}>{cell}</td>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                            {rows.length === 0 && (
                                <div className="export-preview-empty">No posts to export in this filter.</div>
                            )}
                        </div>
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
                            <button onClick={handleExport} className="btn-primary" disabled={sortedPosts.length === 0 || isGeneratingPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isGeneratingPDF ? 'Generating PDF...' : 'Download'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Hidden container for full PDF render using HTML2Canvas */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <div ref={pdfContainerRef} className="export-preview-page" style={{ width: '210mm', minHeight: '297mm', padding: '10mm', backgroundColor: 'white' }}>
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
                            <div>ទិន្នន័យការផ្សាយនៅក្នុង page {displayPage}</div>
                        </div>

                        {hasBoth && (
                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Executive Summary
                                </h4>
                                <table className="export-preview-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px', marginBottom: '8px' }}>
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
                                            <td style={{ padding: '8px', color: '#2b384bff', fontWeight: 600 }}>{regularPosts.length}</td>
                                            {summaryMetrics.regular.map((val, idx) => (
                                                <td key={idx} style={{ padding: '8px', color: '#2b384bff' }}>{val}</td>
                                            ))}
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#2b384bff', fontWeight: 500 }}>Live Stream</td>
                                            <td style={{ padding: '8px', color: '#2b384bff', fontWeight: 600 }}>{livePosts.length}</td>
                                            {summaryMetrics.live.map((val, idx) => (
                                                <td key={idx} style={{ padding: '8px', color: '#2b384bff' }}>{val}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                            <td style={{ padding: '8px', color: '#0f172a' }}>Total</td>
                                            <td style={{ padding: '8px', color: '#0f172a' }}>{sortedPosts.length}</td>
                                            {summaryMetrics.total.map((val, idx) => (
                                                <td key={idx} style={{ padding: '8px', color: '#0f172a' }}>{val}</td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {hasBoth && (
                            <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Detailed Posts
                            </h4>
                        )}

                        <table className="export-preview-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
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
                                {rows.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        {row.map((cell, j) => (
                                            <td key={j} style={{ padding: '8px', color: '#2b384bff' }}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                    {totalRow.map((cell, j) => (
                                        <td key={j} style={{ padding: '8px', color: '#0f172a' }}>{cell}</td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};