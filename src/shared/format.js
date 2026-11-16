export const clamp = (value, min, max) => {
  if (value === null || value === undefined || Number.isNaN(Number(value)) || !Number.isFinite(Number(value))) return min;
  return Math.min(max, Math.max(min, Number(value)));
};
const ok = (n) => n !== null && n !== undefined && Number.isFinite(n);

// On-screen money: full digits up to $999,999, then $1.25M / $3.40B so numbers never overflow a card.
export const fmtMoney = (n) => {
  if (!ok(n)) return 'N/A';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 999999.5 && abs < 999995000) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 999995000) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
};
// Full precision money for reports and tables: $1,250,000
export const fmtMoneyFull = (n) => (ok(n) ? `${n < 0 ? '-' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}` : 'N/A');
export const fmtMoney2 = (n) => (ok(n) ? `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A');
export const signedMoney = (n) => (ok(n) ? `${n < 0 ? '-' : '+'}${fmtMoney(Math.abs(n))}` : 'N/A');
export const fmtPct = (n) => (!ok(n) ? 'N/A' : (n > 1000 ? '>1,000%' : `${Math.round(n).toLocaleString('en-US')}%`));
export const fmtPct1 = (n) => (!ok(n) ? 'N/A' : `${(Math.round(n * 10) / 10).toLocaleString('en-US')}%`);
export const fmtX = (n, d = 1) => (!ok(n) ? 'N/A' : (n >= 100 ? '>100x' : `${n.toFixed(d)}x`));
export const fmtMonths = (n) => (!ok(n) ? 'Never' : (n < 1 ? 'Under 1 month' : `${n.toFixed(1)} months`));
export const fmtNum = (n, d = 0) => (!ok(n) ? 'N/A' : n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));

// ---- Report cells -------------------------------------------------------------------------------
// A report cell carries the display text (PDF, on screen), the raw value and a kind. The Excel export uses the
// kind to write a real number with a real number format, never text that looks like a number.
//   money   $#,##0          money2  $#,##0.00      pp   percent points (3.5 => 3.5%)    pp0   same, no decimals
//   x       0.0"x"          months  0.0            num1 #,##0.0    num2 #,##0.00    int   #,##0    text  plain
export const KINDS = {
  money:  { text: fmtMoneyFull, xl: '$#,##0;[Red]($#,##0);$0', num: true },
  money2: { text: fmtMoney2, xl: '$#,##0.00;[Red]($#,##0.00);$0.00', num: true },
  pp:     { text: fmtPct1, xl: '0.0%;[Red]-0.0%;0.0%', num: true, scale: 0.01 },
  pp0:    { text: (n) => (ok(n) ? `${Math.round(n).toLocaleString('en-US')}%` : 'N/A'), xl: '0%;[Red]-0%;0%', num: true, scale: 0.01 },
  x:      { text: (n) => (ok(n) ? `${n.toFixed(1)}x` : 'N/A'), xl: '0.0"x"', num: true },
  months: { text: (n) => (ok(n) ? `${n.toFixed(1)} months` : 'Never'), xl: '0.0', num: true },
  num1:   { text: (n) => fmtNum(n, 1), xl: '#,##0.0;[Red]-#,##0.0', num: true },
  num2:   { text: (n) => fmtNum(n, 2), xl: '#,##0.00;[Red]-#,##0.00', num: true },
  int:    { text: (n) => fmtNum(n, 0), xl: '#,##0;[Red]-#,##0', num: true },
  text:   { text: (v) => String(v ?? ''), xl: '@', num: false },
};
export const fmtKind = (kind, v) => (KINDS[kind] || KINDS.text).text(v);
// cell(value, kind). Non-finite numbers become the text "N/A" (or "Never" for months), never NaN.
export const cell = (value, kind = 'text') => {
  const K = KINDS[kind] || KINDS.text;
  if (K.num && !ok(value)) return { t: K.text(value), v: null, k: 'text' };
  return { t: K.text(value), v: value, k: kind };
};
