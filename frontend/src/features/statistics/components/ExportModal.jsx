// frontend/src/features/statistics/components/ExportModal.jsx
import React, { useState, useRef } from 'react';
import { X, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ExportModal.css';

const EXPORT_COLUMNS = [
    { key: 'product_name', label: 'Product' },
    { key: 'published_time', label: 'Date', format: 'date' },
    { key: 'likes_count', label: 'Reaction' },
    { key: 'comments_count', label: 'Cmt' },
    { key: 'shares_count', label: 'Share' },
    { key: 'views_count', label: 'Views' },
    { key: 'reach_count', label: 'Reach' },
];

const formatCell = (post, col) => {
    const raw = post[col.key];
    if (col.format === 'date') {
        return raw ? new Date(raw).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    }
    if (raw === null || raw === undefined) return col.key.includes('count') ? 0 : '';
    return raw;
};

export const ExportModal = ({ isOpen, onClose, posts, brandName, startMonth, endMonth, clientLogo }) => {
    const [selectedFormat, setSelectedFormat] = useState('csv');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const pdfContainerRef = useRef(null);

    if (!isOpen) return null;

    const fileBaseName = `${(brandName || 'Brand').replace(/\s+/g, '_')}_Analytics`;
    const rows = posts.map((p) => EXPORT_COLUMNS.map((col) => formatCell(p, col)));
    const headers = EXPORT_COLUMNS.map((c) => c.label);

    const totalRow = EXPORT_COLUMNS.map((col) => {
        if (col.key === 'product_name') return 'Total';
        if (col.key === 'published_time') return '';
        return posts.reduce((sum, post) => sum + (Number(post[col.key]) || 0), 0);
    });



    const downloadCSV = () => {
        const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const csvContent = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(',')), totalRow.map(escape).join(',')].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `${fileBaseName}.csv`);
    };

    const downloadExcel = () => {
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);
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

            while (heightLeft >= 0) {
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
        if (posts.length === 0) return;
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
                        {posts.length} post{posts.length !== 1 ? 's' : ''} in the current filter will be included.
                    </div>

                    {/* Report Preview */}
                    <div className="export-preview-wrapper">
                        <div className="export-preview-page">

                            <div className='logo' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
                                {/* My Logo */}
                                <div style={{ width: '240px', display: 'flex', alignItems: 'center' }}>
                                    <img src="/logoBlack.png" alt="My Logo" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>

                                {/* Client Logo */}
                                <div style={{ width: '240px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {clientLogo ? (
                                        <img src={clientLogo} alt="Client Logo" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ border: '1px dashed #cbd5e1', padding: '4px 8px', color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>Client Logo</div>
                                    )}
                                </div>
                            </div>

                            <div className="export-preview-meta" style={{ marginBottom: '20px' }}>
                                <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}>
                                    REPORT DIGITAL MARKETING
                                </h3>
                                <span>រយៈពេល ៖ {startMonth} រហូតដល់ {endMonth}</span>
                                <span>ទិន្នន័យការផ្សាយនៅក្នុង page Chhorlyka Mart – Baby & Mom</span>
                            </div>

                            <table className="export-preview-table">
                                <thead>
                                    <tr>
                                        {headers.map((h) => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.slice(0, 8).map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => (
                                                <td key={j}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid hsla(224, 51%, 18%, 1.00)' }}>
                                        {totalRow.map((cell, j) => (
                                            <td key={j}>{cell}</td>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                            {rows.length > 8 && (
                                <div className="export-preview-more">
                                    + {rows.length - 8} more row{rows.length - 8 !== 1 ? 's' : ''} in final document
                                </div>
                            )}
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
                            <button onClick={handleExport} className="btn-primary" disabled={posts.length === 0 || isGeneratingPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                <img src="/logoBlack.png" alt="My Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>

                            {/* Client Logo */}
                            <div style={{ width: '200px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {clientLogo ? (
                                    <img src={clientLogo} alt="Client Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ border: '1px dashed #cbd5e1', padding: '6px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>Client Logo</div>
                                )}
                            </div>
                        </div>
                        <div className="export-preview-meta" style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', textAlign: 'center' }}>
                                REPORT DIGITAL MARKETING
                            </h3>
                            <div style={{ marginBottom: '6px' }}>រយៈពេល ៖ {startMonth} រហូតដល់ {endMonth}</div>
                            <div>ទិន្នន័យការផ្សាយនៅក្នុង page Chhorlyka Mart – Baby & Mom</div>
                        </div>

                        <table className="export-preview-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr>
                                    {headers.map((h) => (
                                        <th key={h} style={{ backgroundColor: '#0f172a', color: 'white', padding: '8px', textAlign: 'left' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        {row.map((cell, j) => (
                                            <td key={j} style={{ padding: '8px', color: '#334155' }}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '1.5px solid #0f172a', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
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