const fs = require('fs');

const cssFile = 'frontend/src/index.css';
let content = fs.readFileSync(cssFile, 'utf8');

const targetStr = `.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
}

.chart-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}

.chart-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.chart-mini-kpis {
  display: flex;
  gap: 12px;
}

.mini-kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  min-width: 130px;
}`;

const replacementStr = `.chart-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
}

@media (min-width: 1024px) {
  .chart-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
  }
}

.chart-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}

.chart-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.chart-mini-kpis {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.mini-kpi-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  flex: 1 1 calc(50% - 6px); /* 2 per row on mobile */
  min-width: 110px;
}

@media (min-width: 768px) {
  .mini-kpi-card {
    flex: 1; /* evenly distribute */
    flex-direction: row;
    align-items: center;
    padding: 10px 16px;
  }
}`;

// normalize CRLF just in case
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
const normalizedContent = content.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    content = normalizedContent.replace(normalizedTarget, replacementStr);
    fs.writeFileSync(cssFile, content, 'utf8');
    console.log("Successfully replaced CSS.");
} else {
    console.log("Could not find the target string in index.css.");
}
