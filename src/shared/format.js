export const clamp = (value, min, max) => {
  if (value === null || value === undefined || Number.isNaN(Number(value)) || !Number.isFinite(Number(value))) return min;
  return Math.min(max, Math.max(min, Number(value)));
};
export const fmtMoney = (n) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'N/A';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e7) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
};
export const signedMoney = (n) => `${n < 0 ? '-' : '+'}${fmtMoney(Math.abs(n))}`;
export const fmtPct = (n) => (n === null || n === undefined || !Number.isFinite(n) ? 'N/A' : (n > 1000 ? '>1,000%' : `${Math.round(n).toLocaleString()}%`));
export const fmtPct1 = (n) => (n === null || n === undefined || !Number.isFinite(n) ? 'N/A' : `${(Math.round(n * 10) / 10).toLocaleString()}%`);
export const fmtX = (n, d = 1) => (n === null || n === undefined || !Number.isFinite(n) ? 'N/A' : (n >= 100 ? '>100x' : `${n.toFixed(d)}x`));
export const fmtMonths = (n) => (n === null || n === undefined || !Number.isFinite(n) ? 'Never' : (n < 1 ? 'Under 1 month' : `${n.toFixed(1)} months`));
export const fmtNum = (n, d = 0) => (n === null || n === undefined || !Number.isFinite(n) ? 'N/A' : n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }));
// A table cell for reports: text for the PDF, raw value for Excel.
export const cell = (value, formatter) => ({ t: formatter ? formatter(value) : String(value), v: value });
