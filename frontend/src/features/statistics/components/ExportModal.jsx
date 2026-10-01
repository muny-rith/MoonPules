// frontend/src/features/statistics/components/ExportModal.jsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    X, FileText, FileSpreadsheet, FileType, CheckSquare, Square,
    DollarSign, Link2, Percent, SlidersHorizontal, ExternalLink, RotateCcw, Check, Building2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ExportModal.css';
import logo from "../../../assets/logo.png";
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';

// Optional configurable columns
const OPTIONAL_COLUMNS_CONFIG = [
    {
        id: 'brand_name',
        key: 'brand_name',
        label: 'Brand',
        name: 'Brand Name',
        icon: Building2,
        weight: 14,
        desc: 'Show brand name as second column'
    },
    {
        id: 'spend',
        key: 'spend',
        label: 'Spend ($)',
        name: 'Spend per Live / Post',
        icon: DollarSign,
        weight: 12,
        desc: 'Ad spend / Spend per live ($)'
    },
    {
        id: 'post_url',
        key: 'post_url',
        label: 'Post Link',
        name: 'Post Link (Clickable)',
        icon: Link2,
        weight: 12,
        desc: 'Direct link to view post'
    },
    {
        id: 'engagement_rate',
        key: 'engagement_rate',
        label: 'Engage %',
        name: 'Engagement Rate %',
        icon: Percent,
        weight: 9,
        desc: 'Rate of reactions, cmts & shares per reach'
    }
];

const SUMMARY_COLUMN_WIDTHS = ['28%', '12%', '12%', '12%', '12%', '12%', '12%'];

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
    // 1-Post Type clean (no brand name appended)
    if (col.key === 'media_type') {
        const m = (post.media_type || post.format || post.type || 'photo').toLowerCase();
        let typeStr = 'Photo';
        if (m === 'video') typeStr = 'Video';
        if (m === 'reel') typeStr = 'Reel';
        if (m === 'live') typeStr = 'Live';
        return typeStr;
    }
    // 2-Brand column
    if (col.key === 'brand_name') {
        return post.brand_name || '—';
    }
    if (col.key === 'spend') {
        const val = (Number(post.ad_spend) || 0) + (Number(post.content_cost) || 0);
        return val > 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
    }
    if (col.key === 'post_url') {
        return getFacebookPostUrl(post.fb_post_id, post.post_url, post.page_id || post.fb_page_id);
    }
    if (col.key === 'engagement_rate') {
        const likes = Number(post.likes_count) || 0;
        const comments = Number(post.comments_count) || 0;
        const shares = Number(post.shares_count) || 0;
        const reach = Number(post.reach_count) || 0;
        return reach > 0 ? (((likes + comments + shares) / reach) * 100).toFixed(1) + '%' : '0.0%';
    }
    const raw = post[col.key];
    if (col.format === 'date') {
        const dateVal = raw || post.scheduled_time || post.created_at;
        return formatDateKhmer(dateVal);
    }
    if (raw === null || raw === undefined) return col.key.includes('count') ? 0 : '';
    return raw;
};

const prepareGroupData = (groupPosts, activeColumns) => {
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

    const rows = sorted.map((p) => activeColumns.map((col) => formatCell(p, col)));

    const totalRow = activeColumns.map((col, idx) => {
        if (idx === 0) return 'Total';
        if (col.key === 'spend') {
            const total = sorted.reduce((sum, post) => sum + ((Number(post.ad_spend) || 0) + (Number(post.content_cost) || 0)), 0);
            return `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (col.key === 'engagement_rate') {
            const totalLikes = sorted.reduce((sum, p) => sum + (Number(p.likes_count) || 0), 0);
            const totalCmts = sorted.reduce((sum, p) => sum + (Number(p.comments_count) || 0), 0);
            const totalShares = sorted.reduce((sum, p) => sum + (Number(p.shares_count) || 0), 0);
            const totalReach = sorted.reduce((sum, p) => sum + (Number(p.reach_count) || 0), 0);
            return totalReach > 0 ? (((totalLikes + totalCmts + totalShares) / totalReach) * 100).toFixed(1) + '%' : '0.0%';
        }
        if (col.format === 'number') {
            return sorted.reduce((sum, post) => sum + (Number(post[col.key]) || 0), 0);
        }
        return '';
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

    // Multi-brand detection (2 or more brands)
    const isMultiBrand = useMemo(() => {
        if (clientLogos && clientLogos.length > 1) return true;
        if (!posts || !Array.isArray(posts)) return false;
        const brandNames = new Set(posts.map(p => p.brand_name).filter(Boolean));
        return brandNames.size > 1;
    }, [clientLogos, posts]);

    // Dynamic optional columns state with localStorage memory per brand
    const storageKey = `moonpulse_export_cols_${(brandName || 'default').replace(/[\\/:*?"<>|\s]/g, '_').toLowerCase()}`;

    const [selectedOptionalCols, setSelectedOptionalCols] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            let initialCols = [];
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) initialCols = parsed;
            }
            // Auto check brand_name if 2 or more brands
            if (isMultiBrand && !initialCols.includes('brand_name')) {
                initialCols = ['brand_name', ...initialCols];
            }
            return initialCols;
        } catch {
            return isMultiBrand ? ['brand_name'] : [];
        }
    });

    // Update if brand changes or multi-brand state detected
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            let cols = [];
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) cols = parsed;
            }
            // Auto check brand_name if 2 or more brands
            if (isMultiBrand && !cols.includes('brand_name')) {
                cols = ['brand_name', ...cols];
            }
            setSelectedOptionalCols(cols);
        } catch {
            setSelectedOptionalCols(isMultiBrand ? ['brand_name'] : []);
        }
    }, [storageKey, isMultiBrand]);

    const toggleOptionalColumn = (colId) => {
        setSelectedOptionalCols((prev) => {
            const next = prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId];
            try {
                localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const setPreset = (cols) => {
        setSelectedOptionalCols(cols);
        try {
            localStorage.setItem(storageKey, JSON.stringify(cols));
        } catch {
            // ignore
        }
    };

    // Calculate active columns with Brand Name positioned as 2nd column right after Post Type!
    const activeColumns = useMemo(() => {
        const isBrandActive = selectedOptionalCols.includes('brand_name');

        const cols = [
            // 1. Type (compact optimized width)
            { key: 'media_type', label: 'Type', weight: 10 }
        ];

        // 2. Brand Name (placed second after type when enabled!)
        if (isBrandActive) {
            cols.push({
                id: 'brand_name',
                key: 'brand_name',
                label: 'Brand',
                weight: 14
            });
        }

        // 3. Date
        cols.push({ key: 'published_time', label: 'Date', format: 'date', weight: 15 });

        // 4-8. Standard Metrics
        cols.push(
            { key: 'likes_count', label: 'React', format: 'number', weight: 8 },
            { key: 'comments_count', label: 'Cmt', format: 'number', weight: 7 },
            { key: 'shares_count', label: 'Share', format: 'number', weight: 7 },
            { key: 'views_count', label: 'Views', format: 'number', weight: 13 },
            { key: 'reach_count', label: 'Reach', format: 'number', weight: 13 }
        );

        // 9+. Remaining optional columns (spend, post_url, engagement_rate, product_name)
        const otherOptional = OPTIONAL_COLUMNS_CONFIG.filter(
            (c) => c.id !== 'brand_name' && selectedOptionalCols.includes(c.id)
        );
        cols.push(...otherOptional);

        return cols;
    }, [selectedOptionalCols]);

    const detailedColumnWidths = useMemo(() => {
        const totalWeight = activeColumns.reduce((sum, c) => sum + (c.weight || 10), 0);
        return activeColumns.map((c) => `${((c.weight / totalWeight) * 100).toFixed(1)}%`);
    }, [activeColumns]);

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
            ...prepareGroupData(grp.posts, activeColumns)
        }));
    }, [posts, pageName, activeColumns]);

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
    const headers = activeColumns.map((c) => c.label);
    const summaryHeaders = ['Type', 'Qty', 'React', 'Cmt', 'Share', 'Views', 'Reach'];

    const downloadCSV = () => {
        const escape = (v) => {
            if (v === null || v === undefined) return '""';
            return `"${String(v).replace(/"/g, '""')}"`;
        };
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
            const excelRows = group.rows.map((row, rIdx) => {
                const post = group.sortedPosts[rIdx];
                return row.map((cell, cIdx) => {
                    const col = activeColumns[cIdx];
                    if (col.key === 'post_url') {
                        const url = cell;
                        if (url && typeof url === 'string' && url.startsWith('http')) {
                            return { t: 's', v: 'View Post', f: `HYPERLINK("${url}","View Post")` };
                        }
                        return '—';
                    }
                    if (col.key === 'spend') {
                        return (Number(post.ad_spend) || 0) + (Number(post.content_cost) || 0);
                    }
                    return cell;
                });
            });

            const excelTotalRow = group.totalRow.map((cell, cIdx) => {
                const col = activeColumns[cIdx];
                if (col.key === 'spend') {
                    return group.sortedPosts.reduce((sum, p) => sum + ((Number(p.ad_spend) || 0) + (Number(p.content_cost) || 0)), 0);
                }
                return cell;
            });

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
                ...excelRows,
                excelTotalRow
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            worksheet['!cols'] = activeColumns.map((col) => {
                if (col.key === 'post_url') return { wch: 14 };
                if (col.key === 'published_time') return { wch: 18 };
                if (col.key === 'media_type') return { wch: 10 };
                if (col.key === 'brand_name') return { wch: 16 };
                return { wch: 12 };
            });

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
                    backgroundColor: '#ffffff',
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    imageTimeout: 15000,
                });

                const imgData = canvas.toDataURL('image/png');
                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

                // Map clickable links directly into interactive PDF link annotations
                const elRect = el.getBoundingClientRect();
                const linkElements = el.querySelectorAll('[data-pdf-link]');
                linkElements.forEach((linkEl) => {
                    const targetUrl = linkEl.getAttribute('data-pdf-link');
                    if (!targetUrl || targetUrl === '#' || !targetUrl.startsWith('http')) return;

                    let rect = linkEl.getBoundingClientRect();
                    if (!rect || rect.width <= 0) {
                        const parentTd = linkEl.closest('td');
                        if (parentTd) rect = parentTd.getBoundingClientRect();
                    }

                    if (rect && elRect.width > 0 && elRect.height > 0) {
                        const relX = rect.left - elRect.left;
                        const relY = rect.top - elRect.top;
                        const relW = rect.width;
                        const relH = rect.height;

                        const mmX = (relX / elRect.width) * pageWidth;
                        const mmY = (relY / elRect.height) * pageHeight;
                        const mmW = (relW / elRect.width) * pageWidth;
                        const mmH = (relH / elRect.height) * pageHeight;

                        // Add tap padding (1.5mm horizontal, 1mm vertical) for easy clicking/tapping
                        const padX = 1.5;
                        const padY = 1.0;
                        const tapX = Math.max(0, mmX - padX);
                        const tapY = Math.max(0, mmY - padY);
                        const tapW = mmW + (padX * 2);
                        const tapH = mmH + (padY * 2);

                        pdf.link(tapX, tapY, tapW, tapH, { url: targetUrl });
                    }
                });
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
        { value: 'excel', label: 'Excel', icon: FileSpreadsheet, desc: 'Formatted .xlsx workbook with clickable links' },
        { value: 'pdf', label: 'PDF', icon: FileType, desc: 'Printable executive report with styled links' },
    ];

    const totalPostsCount = posts?.length || 0;

    return (
        <div className="export-modal-overlay">
            <div className="card export-modal-container">
                <button onClick={onClose} className="export-modal-close" disabled={isGeneratingPDF}>
                    <X size={20} />
                </button>

                <div className="export-modal-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Report Digital Marketing</h2>
                    </div>
                    <div className="post-count" style={{ marginBottom: '16px' }}>
                        {totalPostsCount} post{totalPostsCount !== 1 ? 's' : ''} {pageGroups.length > 1 ? `across ${pageGroups.length} pages` : ''} in the current filter will be included.
                    </div>

                    {/* Checkbox Column Customizer */}
                    <div className="export-columns-customizer">
                        <div className="export-customizer-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SlidersHorizontal size={15} color="#0284c7" />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                    Customize Report Columns
                                </span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    (Saved for {cleanBrandName})
                                </span>
                            </div>
                            <div className="export-presets-group">
                                <button
                                    type="button"
                                    className={`export-preset-btn ${selectedOptionalCols.length === (isMultiBrand ? 1 : 0) ? 'active' : ''}`}
                                    onClick={() => setPreset(isMultiBrand ? ['brand_name'] : [])}
                                    title="Standard metrics only"
                                >
                                    Standard
                                </button>
                                <button
                                    type="button"
                                    className={`export-preset-btn ${selectedOptionalCols.includes('spend') && selectedOptionalCols.includes('post_url') ? 'active' : ''}`}
                                    onClick={() => setPreset(isMultiBrand ? ['brand_name', 'spend', 'post_url'] : ['spend', 'post_url'])}
                                    title="Include Spend & Clickable Post Links"
                                >
                                    Spend & Links
                                </button>
                                <button
                                    type="button"
                                    className={`export-preset-btn ${selectedOptionalCols.length === OPTIONAL_COLUMNS_CONFIG.length ? 'active' : ''}`}
                                    onClick={() => setPreset(OPTIONAL_COLUMNS_CONFIG.map((c) => c.id))}
                                    title="All available metrics"
                                >
                                    All Columns
                                </button>
                            </div>
                        </div>

                        <div className="export-columns-grid">
                            {OPTIONAL_COLUMNS_CONFIG.map((col) => {
                                const isChecked = selectedOptionalCols.includes(col.id);
                                const Icon = col.icon;
                                return (
                                    <label
                                        key={col.id}
                                        className={`export-col-checkbox-label ${isChecked ? 'checked' : ''}`}
                                        title={col.desc}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleOptionalColumn(col.id)}
                                            style={{ display: 'none' }}
                                        />
                                        <div className="export-col-checkbox-indicator">
                                            {isChecked ? <CheckSquare size={16} color="#0284c7" /> : <Square size={16} color="#94a3b8" />}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                            <Icon size={14} color={isChecked ? '#0284c7' : '#64748b'} />
                                            <span style={{ fontSize: '13px', fontWeight: isChecked ? 600 : 500, color: isChecked ? '#0f172a' : '#334155' }}>
                                                {col.name}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
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
                                                        <span>ទិន្នន័យការផ្សាយនៅក្នុង page <strong style={{ fontWeight: 700, color: '#0f172a' }}>{group.name}</strong></span>
                                                    </div>

                                                    {/* Executive Summary - ONLY on First Page */}
                                                    {subPage.showSummary && (
                                                        <div style={{ marginBottom: '24px' }}>
                                                            <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                Executive Summary
                                                            </h4>
                                                            <table className="export-preview-table" style={{ marginBottom: '8px' }}>
                                                                <colgroup>
                                                                    {SUMMARY_COLUMN_WIDTHS.map((w, idx) => (
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
                                                    {detailedColumnWidths.map((w, idx) => (
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
                                                            {row.map((cell, j) => {
                                                                const col = activeColumns[j];
                                                                if (col.key === 'post_url') {
                                                                    return (
                                                                        <td key={j} style={{ whiteSpace: 'nowrap' }}>
                                                                            {cell && cell !== '#' ? (
                                                                                <a
                                                                                    href={cell}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    style={{
                                                                                        color: '#0284c7',
                                                                                        textDecoration: 'none',
                                                                                        fontWeight: 600,
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '3px',
                                                                                        fontSize: '11px'
                                                                                    }}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <span>View Post</span>
                                                                                    <ExternalLink size={11} />
                                                                                </a>
                                                                            ) : (
                                                                                <span style={{ color: '#94a3b8' }}>—</span>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                }
                                                                if (col.key === 'spend') {
                                                                    return (
                                                                        <td key={j} style={{ whiteSpace: 'nowrap', fontWeight: 600, color: cell !== '$0.00' ? '#0f766e' : '#64748b' }}>
                                                                            {cell}
                                                                        </td>
                                                                    );
                                                                }
                                                                if (col.key === 'brand_name') {
                                                                    return (
                                                                        <td key={j} style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#0f172a' }}>
                                                                            {cell}
                                                                        </td>
                                                                    );
                                                                }
                                                                return (
                                                                    <td key={j} style={{ whiteSpace: 'nowrap' }}>
                                                                        {cell}
                                                                    </td>
                                                                );
                                                            })}
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
                    left: '-9999px',
                    top: 0,
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
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
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
                                                <img
                                                    crossOrigin="anonymous"
                                                    src={clientLogo}
                                                    alt="Client Logo"
                                                    style={{ maxHeight: '85px', maxWidth: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
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
                                        <div style={{ fontSize: '13px', color: '#475569' }}>ទិន្នន័យការផ្សាយនៅក្នុង page <strong style={{ fontWeight: 700, color: '#0f172a' }}>{group.name}</strong></div>
                                    </div>

                                    {/* Executive Summary - ONLY on First Page */}
                                    {subPage.showSummary && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Executive Summary
                                            </h4>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px', marginBottom: '8px' }}>
                                                <colgroup>
                                                    {SUMMARY_COLUMN_WIDTHS.map((w, idx) => (
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
                                    {detailedColumnWidths.map((w, idx) => (
                                        <col key={idx} style={{ width: w }} />
                                    ))}
                                </colgroup>
                                <thead>
                                    <tr>
                                        {headers.map((h) => (
                                            <th key={h} style={{ backgroundColor: '#0f172a', color: 'white', padding: '6px 8px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subPage.rows.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            {row.map((cell, j) => {
                                                const col = activeColumns[j];
                                                if (col.key === 'post_url') {
                                                    return (
                                                        <td key={j} style={{ padding: '5.5px 8px', whiteSpace: 'nowrap' }}>
                                                            {cell && cell !== '#' ? (
                                                                <a
                                                                    href={cell}
                                                                    data-pdf-link={cell}
                                                                    style={{
                                                                        color: '#0284c7',
                                                                        fontWeight: 600,
                                                                        fontSize: '10px',
                                                                        textDecoration: 'underline',
                                                                        display: 'inline-block'
                                                                    }}
                                                                >
                                                                    View Post ↗
                                                                </a>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8' }}>—</span>
                                                            )}
                                                        </td>
                                                    );
                                                }
                                                if (col.key === 'spend') {
                                                    return (
                                                        <td key={j} style={{ padding: '5.5px 8px', whiteSpace: 'nowrap', fontWeight: 600, color: cell !== '$0.00' ? '#0f766e' : '#64748b' }}>
                                                            {cell}
                                                        </td>
                                                    );
                                                }
                                                if (col.key === 'brand_name') {
                                                    return (
                                                        <td key={j} style={{ padding: '5.5px 8px', color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                            {cell}
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={j} style={{ padding: '5.5px 8px', color: '#2b384bff', whiteSpace: 'nowrap' }}>
                                                        {cell}
                                                    </td>
                                                );
                                            })}
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