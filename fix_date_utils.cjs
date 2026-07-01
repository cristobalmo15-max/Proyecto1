const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`  const isExpired = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    return date < new Date();
  };

  const addMonthsToDate = (startDateStr: string, months: number): string => {
    if (!startDateStr) return '';
    const date = new Date(startDateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return startDateStr;
    date.setMonth(date.getMonth() + Number(months));
    return date.toISOString().split('T')[0];
  };`,
`  const formatDisplayDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
    }
    return dateStr;
  };

  const isExpired = (dateStr: string | undefined) => {
    if (!dateStr) return false;
    const dateStrOnly = dateStr.split('T')[0];
    const date = new Date(\`\${dateStrOnly}T12:00:00Z\`);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    // Compare at noon UTC for stability
    const nowNoon = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
    return date < nowNoon;
  };

  const addMonthsToDate = (startDateStr: string, months: number): string => {
    if (!startDateStr) return '';
    const dateStr = startDateStr.split('T')[0];
    const date = new Date(dateStr + 'T12:00:00Z');
    if (isNaN(date.getTime())) return startDateStr;
    date.setUTCMonth(date.getUTCMonth() + Number(months));
    return date.toISOString().split('T')[0];
  };`);

fs.writeFileSync('src/App.tsx', code);
