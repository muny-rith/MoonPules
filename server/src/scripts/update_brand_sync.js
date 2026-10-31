const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../../../frontend/src/features/statistics/pages/BrandDetailPage.jsx');
let content = fs.readFileSync(file, 'utf8');

const target = `  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncPosts({
        brandIds: ((id === 'combined' || searchParams.get('ids')) ? (searchParams.get('ids') ? searchParams.get('ids').split(',').map(s => s.trim()).filter(Boolean) : []) : (id && id !== 'all' ? [id] : [])),
        brandIds: ((id === 'combined' || searchParams.get('ids')) ? (searchParams.get('ids') ? searchParams.get('ids').split(',').map(s => s.trim()).filter(Boolean) : []) : [id]),
        brandId: id !== 'combined' ? id : undefined,
        postIds: (detail?.posts || []).map(p => p.id).filter(Boolean),
        startDate: customRange?.start || undefined,
        endDate: customRange?.end || undefined,
      });
      clearBrandCache();
      await fetchDetail(true);
    } catch (err) {
      console.error('Failed to sync posts', err);
    } finally {
      setIsSyncing(false);
    }
  };`;

const repl = `  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
      const idsParam = searchParams.get('ids');
      const targetBrandIds = (id === 'combined' || idsParam)
        ? (idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [])
        : (id && id !== 'all' ? [id] : []);

      await syncPosts({
        brandIds: targetBrandIds,
        brandId: targetBrandIds.length === 1 ? targetBrandIds[0] : (id !== 'combined' ? id : undefined),
        range: timeFilter,
        startDate: customRange?.start || undefined,
        endDate: customRange?.end || undefined,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        pageId: pageFilter !== 'all' ? pageFilter : undefined,
        productIds: productFilter !== 'all' ? [productFilter] : undefined,
        timezone: tz,
      });
      clearBrandCache();
      await fetchDetail(true);
    } catch (err) {
      console.error('Failed to sync posts', err);
    } finally {
      setIsSyncing(false);
    }
  };`;

if (content.includes(target)) {
  content = content.replace(target, repl);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated BrandDetailPage.jsx (LF)!');
} else if (content.includes(target.replace(/\n/g, '\r\n'))) {
  content = content.replace(target.replace(/\n/g, '\r\n'), repl.replace(/\n/g, '\r\n'));
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated BrandDetailPage.jsx (CRLF)!');
} else {
  console.error('Target not found!');
  process.exit(1);
}

